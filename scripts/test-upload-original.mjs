import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) return next(`${specifier}.ts`, context);
    throw error;
  }
} });
const { uploadPhotoOriginal } = await import('../features/photo-portfolio/lib/upload-original.client.ts');
const { normalizeOriginalDetails, originalMatches, uploadedOriginalKey } = await import('../features/photo-portfolio/lib/original-storage.ts');
const file = () => new File([Buffer.from([255, 216, 255, 225, 0, 8, 69, 88, 73, 70, 255, 217])], 'untouched.jpg', { type: 'image/jpeg' });
const headers = { 'Content-Type': 'image/jpeg', 'If-None-Match': '*', 'x-amz-meta-sha256': 'hash' };

test('uploads exact original bytes before verifying durable storage; no resizing or re-encoding', async t => {
  const original = file(); const bytes = Buffer.from(await original.arrayBuffer());
  const expected = createHash('sha256').update(bytes).digest('hex');
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, request) => {
    calls.push(url);
    if (url === 'https://storage.test/original') {
      assert.equal(request.method, 'PUT'); assert.equal(request.body, original);
      assert.deepEqual(Buffer.from(await request.body.arrayBuffer()), bytes);
      assert.deepEqual(request.headers, headers);
      return new Response(null, { status: 200 });
    }
    assert.deepEqual(JSON.parse(request.body), { id: 'id', size: original.size, contentType: 'image/jpeg', sha256: expected });
    return Response.json(calls.length === 1 ? { stored: false, url: 'https://storage.test/original', headers } : { stored: true });
  });
  assert.equal(await uploadPhotoOriginal('id', original), expected);
  assert.deepEqual(calls, ['/api/photo-preview/original', 'https://storage.test/original', '/api/photo-preview/original']);
});

test('retry reuses an already verified original without another PUT', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async url => { calls.push(url); return Response.json({ stored: true }); });
  await uploadPhotoOriginal('id', file());
  assert.deepEqual(calls, ['/api/photo-preview/original']);
});

test('failed PUT and mismatched original prevent a successful save', async t => {
  t.mock.method(globalThis, 'fetch', async url => url === '/api/photo-preview/original'
    ? Response.json({ stored: false, url: 'https://storage.test/original', headers }) : new Response(null, { status: 500 }));
  await assert.rejects(uploadPhotoOriginal('id', file()), /Couldn’t upload the original/);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Different original' }, { status: 409 }));
  await assert.rejects(uploadPhotoOriginal('id', file()), /Different original/);
});

test('conditional PUT conflict succeeds only after verifying the existing object', async t => {
  let checks = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    if (url === 'https://storage.test/original') return new Response(null, { status: 412 });
    return Response.json(++checks === 1 ? { stored: false, url: 'https://storage.test/original', headers } : { stored: true });
  });
  await uploadPhotoOriginal('id', file()); assert.equal(checks, 2);
});

test('expired authentication is distinguishable and no upload is attempted', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Sign in again' }, { status: 401 }));
  await assert.rejects(uploadPhotoOriginal('id', file()), error => error.name === 'UploadAuthenticationRequired');
});

test('original metadata and immutable keys reject invalid inputs and mismatched retry bytes', () => {
  const valid = { size: 12, contentType: 'image/jpeg', sha256: 'a'.repeat(64) };
  assert.deepEqual(normalizeOriginalDetails(valid), valid);
  for (const invalid of [null, {}, { ...valid, size: 0 }, { ...valid, size: 30_000_001 }, { ...valid, contentType: 'text/html' }, { ...valid, sha256: '../secret' }]) {
    assert.equal(normalizeOriginalDetails(invalid), null);
  }
  assert.equal(uploadedOriginalKey('ABC'), 'originals/abc/source');
  const stored = { ContentLength: 12, ContentType: 'image/jpeg', Metadata: { sha256: valid.sha256 } };
  assert.equal(originalMatches(stored, valid), true);
  assert.equal(originalMatches({ ...stored, ContentLength: 13 }, valid), false);
  assert.equal(originalMatches({ ...stored, Metadata: { sha256: 'b'.repeat(64) } }, valid), false);
});
