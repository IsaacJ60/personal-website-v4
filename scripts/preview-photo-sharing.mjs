// Local-only design review. Reads published legacy originals; writes framed
// samples to the OS temp directory, never uploads or changes remote data.
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { renderPhotoExport } from '../features/photo-portfolio/lib/photo-export.ts';
import { createClient } from '@supabase/supabase-js';

createRequire(import.meta.url)('@next/env').loadEnvConfig(process.cwd());
const output = join(tmpdir(), 'photo-sharing-review');
await mkdir(output, { recursive: true });
const manifest = JSON.parse(await readFile('features/photo-portfolio/data/prepared-images.json', 'utf8'));
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await client.from('photo_v2_photos').select('slug,title,object_key').eq('published', true);
if (error) throw new Error(error.message);
const photos = data.filter(p => manifest[p.slug] && !p.object_key.startsWith('uploads/'));
const ratio = p => manifest[p.slug].width / manifest[p.slug].height;
const targets = [['landscape', 1.5], ['portrait', 0.67], ['near-square', 1], ['wide', 3]];
const results = [];
const previews = [];
for (const [label, target] of targets) {
  const photo = [...photos].sort((a, b) => Math.abs(ratio(a) - target) - Math.abs(ratio(b) - target))[0];
  const url = new URL('/camera/' + photo.object_key.split('/').map(encodeURIComponent).join('/'),
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL || 'https://media.isaacjiang.ca');
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Source unavailable: ${response.status}`);
  const original = Buffer.from(await response.arrayBuffer());
  if (original.length > 30_000_000) throw new Error('Source exceeds review input budget');
  const rendered = await renderPhotoExport(original, 'png', photo.title);
  const { width, height, photoWidth, photoHeight } = rendered;
  const framed = await rendered.stream.toBuffer();
  const jpeg = await sharp(framed).jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer();
  await writeFile(join(output, `${label}.png`), framed);
  await writeFile(join(output, `${label}.jpg`), jpeg);
  const preview = await sharp(framed).resize({ width: 820, height: 650, fit: 'contain', background: '#e7e8ea' }).png().toBuffer();
  previews.push(preview);
  results.push({ label, slug: photo.slug, photoWidth, photoHeight, width, height,
    pngBytes: framed.length, jpegBytes: jpeg.length });
}
const sheet = await sharp({ create: { width: 1640, height: 1300, channels: 3, background: '#e7e8ea' } })
  .composite(previews.map((input, i) => ({ input, left: (i % 2) * 820, top: Math.floor(i / 2) * 650 }))).png().toBuffer();
await writeFile(join(output, 'review.png'), sheet);
await writeFile(join(output, 'samples.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ output, samples: results }));
