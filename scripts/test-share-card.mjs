import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { renderShareCard } from '../features/photo-portfolio/lib/share-card.ts';

test('the branded fallback is a landscape JPEG and safely renders special characters', async () => {
  const bytes = await renderShareCard('Light & shade <study> "2026"');
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 630);
});

test('portrait photographs preserve their top and bottom instead of being cropped', async () => {
  const image = await sharp({ create: { width: 200, height: 400, channels: 3, background: '#0000ff' } })
    .composite([{ input: Buffer.from('<svg width="200" height="400"><rect width="200" height="10" fill="red"/><rect y="390" width="200" height="10" fill="#00ff00"/></svg>') }]).png().toBuffer();
  const { data, info } = await sharp(await renderShareCard('Portrait', image)).raw().toBuffer({ resolveWithObject: true });
  const pixel = (x, y) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
  const top = pixel(600, 40);
  const bottom = pixel(600, 513);
  assert.ok(top[0] > 180 && top[1] < 80, `Missing top edge: ${top}`);
  assert.ok(bottom[1] > 180 && bottom[0] < 80, `Missing bottom edge: ${bottom}`);
  assert.ok(pixel(80, 240).every((channel) => channel < 35), 'Portrait should have graphite side margins');
});

test('landscape photographs preserve both edges within the same card dimensions', async () => {
  const image = await sharp({ create: { width: 800, height: 200, channels: 3, background: '#0000ff' } })
    .composite([{ input: Buffer.from('<svg width="800" height="200"><rect width="10" height="200" fill="red"/><rect x="790" width="10" height="200" fill="#00ff00"/></svg>') }]).png().toBuffer();
  const { data, info } = await sharp(await renderShareCard('Landscape', image)).raw().toBuffer({ resolveWithObject: true });
  const pixel = (x, y) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
  assert.ok(pixel(52, 240)[0] > 180);
  assert.ok(pixel(1147, 240)[1] > 180);
  assert.ok(pixel(600, 40).every((channel) => channel < 35), 'Landscape should have graphite top margin');
});
