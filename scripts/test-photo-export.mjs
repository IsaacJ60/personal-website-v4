import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { Readable } from 'node:stream';
import { renderPhotoExport, photoExportFormat, originalMaxBytes } from '../features/photo-portfolio/lib/photo-export.ts';

for (const [name, width, height] of [['landscape', 2400, 1600], ['portrait', 1600, 2400], ['square', 1600, 1600], ['panorama', 3000, 1000]]) {
  test(`${name}: preserve native resolution and edges, embed frame and watermark`, async () => {
    const original = await sharp({ create: { width, height, channels: 3, background: '#3186c2' } }).png().toBuffer();
    const result = await renderPhotoExport(original, 'png');
    const output = await result.stream.toBuffer();
    const meta = await sharp(output).metadata();
    assert.equal(result.photoWidth, width); assert.equal(result.photoHeight, height);
    assert.equal(meta.width, result.width); assert.equal(meta.height, result.height);
    const border = Math.round(Math.max(width, height) * .035);
    const { data, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
    const pixel = (x, y) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
    assert.deepEqual(pixel(0, 0), [255, 255, 255]);
    for (const [x, y] of [[border, border], [border + width - 1, border], [border, border + height - 1], [border + width - 1, border + height - 1]]) {
      assert.deepEqual(pixel(x, y), [49, 134, 194], 'all photo edges remain uncropped');
    }
    let watermarkPixels = 0;
    for (let y = border + height - 100; y < border + height; y++) {
      for (let x = border + width - 200; x < border + width; x++) {
        if (pixel(x, y).some((v, i) => v !== [49, 134, 194][i])) watermarkPixels++;
      }
    }
    assert.ok(watermarkPixels > 100, 'watermark must alter pixels inside the photograph');
    let footerPixels = 0;
    for (let y = border + height; y < info.height; y++) for (let x = border; x < info.width - border; x++) {
      if (pixel(x, y).some(v => v < 180)) footerPixels++;
    }
    assert.ok(footerPixels > 100, 'bundled font must produce visible footer text');
    assert.equal(meta.exif, undefined); assert.equal(meta.xmp, undefined);
  });
}

test('JPEG downloads retain full dimensions; previews contain the same frame at bounded size', async () => {
  const original = await sharp({ create: { width: 2000, height: 3000, channels: 3, background: '#eeeeee' } }).jpeg().toBuffer();
  const jpeg = await renderPhotoExport(original, 'jpeg');
  const preview = await renderPhotoExport(original, 'preview');
  const jm = await sharp(await jpeg.stream.toBuffer()).metadata();
  const pm = await sharp(await preview.stream.toBuffer()).metadata();
  assert.equal(jm.format, 'jpeg'); assert.equal(jm.width, jpeg.width); assert.equal(jm.height, jpeg.height);
  assert.equal(pm.format, 'jpeg'); assert.ok(pm.width <= 1000 && pm.height <= 1000);
  assert.equal(jpeg.width, preview.width); assert.equal(jpeg.height, preview.height);
});

test('EXIF rotation is applied before determining native photo dimensions', async () => {
  const original = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#339944' } })
    .jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const result = await renderPhotoExport(original, 'png');
  assert.equal(result.photoWidth, 1600); assert.equal(result.photoHeight, 2400);
  const meta = await sharp(await result.stream.toBuffer()).metadata();
  assert.equal(meta.width, result.width); assert.equal(meta.height, result.height);
  assert.equal(meta.orientation, undefined);
});

test('reject malformed/oversized originals and unsupported output formats', async () => {
  await assert.rejects(renderPhotoExport(Buffer.alloc(0), 'png'));
  await assert.rejects(renderPhotoExport(Buffer.from('not a photograph'), 'png'));
  await assert.rejects(renderPhotoExport(Buffer.alloc(originalMaxBytes + 1), 'png'));
  assert.equal(photoExportFormat(null), 'jpeg');
  assert.equal(photoExportFormat('png'), 'png');
  assert.equal(photoExportFormat('png-hd'), 'png-hd');
  assert.equal(photoExportFormat('preview'), 'preview');
  assert.equal(photoExportFormat('full-size'), 'full-size');
  for (const input of ['original', 'webp', '', 'https://example.com/image']) assert.equal(photoExportFormat(input), null);
});

test('full-size viewing preserves native resolution without framing and strips metadata after orientation', async () => {
  for (const [width, height, orientation] of [[3200, 2000, 1], [2000, 3200, 6], [600, 400, 1]]) {
    const original = await sharp({ create: { width, height, channels: 3, background: '#3186c2' } })
      .jpeg().withMetadata({ orientation }).toBuffer();
    const result = await renderPhotoExport(original, 'full-size');
    const output = await result.stream.toBuffer();
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.width, orientation === 6 ? height : width);
    assert.equal(metadata.height, orientation === 6 ? width : height);
    assert.equal(result.width, metadata.width);
    assert.equal(result.height, metadata.height);
    assert.equal(metadata.orientation, undefined);
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.xmp, undefined);
    const { data, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
    for (const offset of [0, data.length - info.channels]) {
      assert.ok(data.subarray(offset, offset + 3).every((value, channel) => Math.abs(value - [49, 134, 194][channel]) <= 2),
        'photo corners remain uncropped and unframed');
    }
  }
});

test('a Web response consumes the complete Sharp stream without a premature close', async () => {
  const original = await sharp({ create: { width: 2000, height: 3000, channels: 3, background: '#a2b3c4' } }).png().toBuffer();
  const { stream, width, height } = await renderPhotoExport(original, 'png');
  stream.end();
  const response = new Response(Readable.toWeb(stream));
  const bytes = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.width, width); assert.equal(metadata.height, height);
  await sharp(bytes).raw().toBuffer(); // Decode the pixels too, not just a valid header.
});

test('HD copies preserve the complete watermarked frame within 1920 pixels without upscaling', async () => {
  for (const [width, height] of [[3000, 2000], [2000, 3000], [1600, 1600], [800, 600]]) {
    const original = await sharp({ create: { width, height, channels: 3, background: '#486c85' } }).png().toBuffer();
    const full = await renderPhotoExport(original, 'png');
    const hd = await renderPhotoExport(original, 'png-hd');
    const fullBytes = await full.stream.toBuffer();
    const hdBytes = await hd.stream.toBuffer();
    const meta = await sharp(hdBytes).metadata();
    assert.equal(meta.format, 'png');
    assert.equal(meta.width, hd.width); assert.equal(meta.height, hd.height);
    assert.ok(Math.max(meta.width, meta.height) <= 1920);
    assert.ok(meta.width <= full.width && meta.height <= full.height);
    assert.equal(hd.photoWidth, width); assert.equal(hd.photoHeight, height);
    const ratio = Math.min(1, 1920 / Math.max(full.width, full.height));
    assert.equal(hd.width, Math.round(full.width * ratio));
    assert.equal(hd.height, Math.round(full.height * ratio));
    const expected = await sharp(fullBytes).resize(hd.width, hd.height).raw().toBuffer();
    assert.deepEqual(await sharp(hdBytes).raw().toBuffer(), expected, 'HD retains the same composition, watermark, and footer');
  }
});

test('frame uses the escaped photo title, with left attribution and a right-aligned website', async () => {
  const photoWidth = 2400, photoHeight = 1600;
  const original = await sharp({ create: { width: photoWidth, height: photoHeight, channels: 3, background: '#eeeeee' } }).png().toBuffer();
  const render = async title => {
    const result = await renderPhotoExport(original, 'png', title);
    return sharp(await result.stream.toBuffer()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  };
  const a = await render('Light & shade <study> "2026"');
  const b = await render('A different photograph');
  const border = Math.round(photoWidth * .035), footer = Math.round(photoWidth * .09);
  const titleTop = border + photoHeight + Math.round(footer * .28);
  const creditTop = border + photoHeight + Math.round(footer * .62);
  const crop = (result, left, top, width, height) => sharp(result.data,
    { raw: { width: result.info.width, height: result.info.height, channels: 3 } }).extract({ left, top, width, height }).raw().toBuffer();
  assert.notDeepEqual(await crop(a, border, titleTop, photoWidth, 45), await crop(b, border, titleTop, photoWidth, 45));
  assert.deepEqual(await crop(a, border, border, photoWidth, photoHeight), await crop(b, border, border, photoWidth, photoHeight), 'title changes must leave photograph/watermark unchanged');
  const darkPixels = async (left, width) => [...await crop(a, left, creditTop, width, 30)].filter(v => v < 180).length;
  assert.ok(await darkPixels(border, 400) > 100, 'photographer attribution is on the left');
  assert.ok(await darkPixels(border + photoWidth - 200, 200) > 100, 'website is on the right');
  assert.ok(await darkPixels(border + photoWidth - 3, 3) > 0, 'website aligns with the photo right edge');
  assert.equal(await darkPixels(border + 800, 400), 0, 'credits remain separated');
  const longTitle = await render('A very long photo title & <special characters> '.repeat(4));
  assert.equal(longTitle.info.width, a.info.width, 'long titles must fit without changing the frame');
});
