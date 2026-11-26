import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export{}', shortCircuit: true };
  if (specifier.startsWith('@/')) return next(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  try { return next(specifier, context); } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) return next(`${specifier}.ts`, context);
    throw error;
  }
} });
// Fake signing credentials; no test sends network requests or reads real secrets.
process.env.R2_ACCOUNT_ID = 'unit-account';
process.env.R2_V3_ACCESS_KEY_ID = 'unit-key';
process.env.R2_V3_SECRET_ACCESS_KEY = 'unit-secret';
process.env.R2_BUCKET_NAME = 'public-photos';
process.env.R2_V3_ORIGINALS_BUCKET_NAME = 'photo-v3-originals';
const { authorizeOriginalUpload, originalBucket, originalStorageClient } = await import('../features/photo-portfolio/lib/original-storage.server.ts');
const id = '00000000-0000-4000-8000-000000000001';
const details = { size: 100, contentType: 'image/jpeg', sha256: 'a'.repeat(64) };

test('presigned PUT requires immutable writes and metadata, with no accidental empty-body checksum', async t => {
  t.mock.method(originalStorageClient, 'send', async () => { throw Object.assign(new Error('Not found'), { $metadata: { httpStatusCode: 404 } }); });
  const result = await authorizeOriginalUpload(id, details);
  assert.equal(result.stored, false);
  const url = new URL(result.url);
  assert.equal(url.hostname, 'photo-v3-originals.unit-account.r2.cloudflarestorage.com');
  assert.equal(url.pathname, `/originals/${id}/source`);
  assert.equal(url.searchParams.get('X-Amz-Expires'), '300');
  const signed = url.searchParams.get('X-Amz-SignedHeaders').split(';');
  for (const header of ['content-type', 'if-none-match', 'x-amz-meta-sha256']) assert.ok(signed.includes(header), header);
  assert.equal(result.headers['If-None-Match'], '*');
  assert.equal(url.searchParams.has('x-amz-checksum-crc32'), false);
});
test('existing identical original is reused; mismatched source is rejected', async t => {
  t.mock.method(originalStorageClient, 'send', async () => ({ ContentLength: 100, ContentType: 'image/jpeg', Metadata: { sha256: details.sha256 } }));
  assert.deepEqual(await authorizeOriginalUpload(id, details), { stored: true });
  assert.equal(await authorizeOriginalUpload(id, { ...details, sha256: 'b'.repeat(64) }), null);
});
test('the public media bucket cannot be configured as original storage', () => {
  const saved = process.env.R2_V3_ORIGINALS_BUCKET_NAME;
  process.env.R2_V3_ORIGINALS_BUCKET_NAME = process.env.R2_BUCKET_NAME;
  try { assert.throws(originalBucket, /not configured/); }
  finally { process.env.R2_V3_ORIGINALS_BUCKET_NAME = saved; }
});

test('v3 original configuration never falls back to legacy credentials or buckets', () => {
  const bucket = process.env.R2_V3_ORIGINALS_BUCKET_NAME;
  const key = process.env.R2_V3_ACCESS_KEY_ID;
  process.env.R2_ORIGINALS_BUCKET_NAME = 'photo-originals';
  process.env.R2_ACCESS_KEY_ID = 'legacy-key';
  try {
    for (const value of ['', 'photo-originals', 'photos']) {
      process.env.R2_V3_ORIGINALS_BUCKET_NAME = value;
      assert.throws(originalBucket, /not configured/);
    }
    process.env.R2_V3_ORIGINALS_BUCKET_NAME = bucket;
    delete process.env.R2_V3_ACCESS_KEY_ID;
    assert.throws(originalBucket, /not configured/);
  } finally {
    process.env.R2_V3_ORIGINALS_BUCKET_NAME = bucket;
    process.env.R2_V3_ACCESS_KEY_ID = key;
  }
});

test('original reads accept only v3 upload keys and use the dedicated client', async t => {
  const { readPhotoOriginal } = await import('../features/photo-portfolio/lib/photo-original.server.ts');
  const bytes = Buffer.from('test original bytes');
  const calls = [];
  t.mock.method(originalStorageClient, 'send', async command => {
    calls.push(command.input);
    return { ContentLength: bytes.length, Body: (async function* () { yield bytes; })() };
  });
  for (const key of ['legacy.jpg', 'camera/old.jpg', 'uploads/../source', 'https://example.com/photo.jpg']) {
    await assert.rejects(readPhotoOriginal(key, AbortSignal.timeout(1000)), /Invalid v3/);
  }
  assert.equal(calls.length, 0);
  assert.deepEqual(await readPhotoOriginal(`uploads/${id}/display.webp`, AbortSignal.timeout(1000)), bytes);
  assert.deepEqual(calls, [{ Bucket: 'photo-v3-originals', Key: `originals/${id}/source` }]);
});
