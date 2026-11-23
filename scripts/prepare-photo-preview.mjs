// Optional, explicit asset preparation. Reads public v2 metadata/media only.
// Writes local WebP derivatives; never uploads, updates Supabase, or alters R2.
import { createRequire } from 'node:module';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());
const demoSource = await readFile(new URL('../features/photo-portfolio/data/demo.ts', import.meta.url), 'utf8');
const slugs = [...new Set([...demoSource.matchAll(/slugs: \[([^\]]+)\]/g)]
  .flatMap((match) => [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1])))];
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const all = process.argv.includes('--all');
const data = [];
for (let offset = 0; ; offset += 1000) {
  let query = client.from('photo_v2_photos').select('id,slug,object_key').eq('published', true).order('id');
  if (!all) query = query.in('slug', slugs);
  const result = await query.range(offset, offset + 999);
  if (result.error) throw new Error(result.error.message);
  // New uploads already have both derivatives in Storage.
  data.push(...result.data.filter((photo) => photo.object_key !== `uploads/${photo.id}/display.webp`));
  if (result.data.length < 1000) break;
}
const directory = new URL('../public/photo-preview/', import.meta.url);
const manifestFile = new URL('../features/photo-portfolio/data/prepared-images.json', import.meta.url);
await mkdir(directory, { recursive: true });
const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
let bytes = 0;
let preparedCount = 0;
let reusedCount = 0;
const failures = [];
async function prepare(photo) {
  // Slugs become local filenames; keep all writes in the asset directory.
  if (!/^[a-z0-9-]+$/i.test(photo.slug)) throw new Error(`Unsafe image slug: ${photo.slug}`);
  if (manifest[photo.slug]) {
    try {
      await Promise.all([access(new URL(`${photo.slug}.webp`, directory)), access(new URL(`${photo.slug}-thumb.webp`, directory))]);
      reusedCount++;
      return;
    } catch { /* Regenerate a missing local asset. */ }
  }
  const url = new URL('/camera/' + photo.object_key.split('/').map(encodeURIComponent).join('/'),
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL || 'https://media.isaacjiang.ca');
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Source unavailable for ${photo.slug}: ${response.status}`);
  const source = Buffer.from(await response.arrayBuffer());
  const display = await sharp(source).rotate().resize({width:1600,height:1400,fit:'inside',withoutEnlargement:true}).webp({quality:78}).toBuffer({resolveWithObject:true});
  const thumb = await sharp(source).rotate().resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:72}).toBuffer();
  await writeFile(new URL(`${photo.slug}.webp`, directory), display.data);
  await writeFile(new URL(`${photo.slug}-thumb.webp`, directory), thumb);
  manifest[photo.slug] = { src:`/photo-preview/${photo.slug}.webp`,thumbnail:`/photo-preview/${photo.slug}-thumb.webp`,width:display.info.width,height:display.info.height };
  bytes += display.data.length + thumb.length;
  preparedCount++;
}
// Bounded downloads/encoding; save each batch so an interrupted run can resume.
for (let offset = 0; offset < data.length; offset += 3) {
  const batch = data.slice(offset, offset + 3);
  const results = await Promise.allSettled(batch.map(prepare));
  results.forEach((result, index) => {
    if (result.status === 'rejected') failures.push(`${batch[index].slug}: ${result.reason.message}`);
  });
  await writeFile(manifestFile, JSON.stringify(manifest,null,2)+'\n');
  if (offset % 30 === 0) console.log(`Processed ${Math.min(offset + 3, data.length)} / ${data.length} public images`);
}
console.log(`${preparedCount} prepared, ${reusedCount} reused; ${(bytes/1024/1024).toFixed(2)} MB added locally.`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
