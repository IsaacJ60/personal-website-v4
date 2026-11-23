// Download the Latin variable webfonts and their licenses for the three previews.
// No credentials, remote writes, or runtime third-party font requests.
import { mkdir, writeFile } from 'node:fs/promises';

const fonts = [
  ['Newsreader', 'newsreader'], ['Instrument Sans', 'instrumentsans'],
  ['Fraunces', 'fraunces'], ['Manrope', 'manrope'],
  ['Space Grotesk', 'spacegrotesk'], ['IBM Plex Sans', 'ibmplexsans'],
];
const directory = new URL('../features/photo-portfolio/fonts/', import.meta.url);
await mkdir(directory, { recursive:true });
const sources = [];
async function download(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: { 'User-Agent':'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
  });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response;
}
for (const [family, slug] of fonts) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family.replaceAll(' ', '+')}:wght@400..600&display=swap`;
  const css = await (await download(cssUrl)).text();
  const latin = css.match(/\/\* latin \*\/\s*(@font-face\s*\{[^}]+\})/);
  const url = latin?.[1].match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/)?.[1];
  if (!url || !url.startsWith('https://fonts.gstatic.com/')) throw new Error(`No Latin WOFF2 found for ${family}`);
  const font = Buffer.from(await (await download(url)).arrayBuffer());
  if (font.toString('ascii', 0, 4) !== 'wOF2') throw new Error(`Invalid WOFF2 for ${family}`);
  const licenseUrl = `https://raw.githubusercontent.com/google/fonts/main/ofl/${slug}/OFL.txt`;
  const license = await (await download(licenseUrl)).text();
  if (!license.includes('SIL OPEN FONT LICENSE')) throw new Error(`Unexpected license for ${family}`);
  await writeFile(new URL(`${slug}-latin.woff2`, directory), font);
  await writeFile(new URL(`${slug}-OFL.txt`, directory), license);
  sources.push({family,file:`${slug}-latin.woff2`,bytes:font.length,cssUrl,url,licenseUrl});
  console.log(`Prepared ${family}: ${(font.length/1024).toFixed(1)} KiB`);
}
await writeFile(new URL('sources.json', directory), JSON.stringify(sources,null,2)+'\n');
