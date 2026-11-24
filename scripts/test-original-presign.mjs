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
process.env.R2_ACCESS_KEY_ID = 'unit-key';
process.env.R2_SECRET_ACCESS_KEY = 'unit-secret';
process.env.R2_BUCKET_NAME = 'public-photos';
process.env.R2_ORIGINALS_BUCKET_NAME = 'private-originals';
const { r2Client } = await import('../utils/r2/client.ts');
const { authorizeOriginalUpload, originalBucket } = await import('../features/photo-portfolio/lib/original-storage.server.ts');
const id = '00000000-0000-4000-8000-000000000001';
const details = { size: 100, contentType: 'image/jpeg', sha256: 'a'.repeat(64) };

test('presigned PUT requires immutable writes and metadata, with no accidental empty-body checksum', async t => {
  t.mock.method(r2Client, 'send', async () => { throw Object.assign(new Error('Not found'), { $metadata: { httpStatusCode: 404 } }); });
  const result = await authorizeOriginalUpload(id, details);
  assert.equal(result.stored, false);
  const url = new URL(result.url);
  assert.equal(url.hostname, 'private-originals.unit-account.r2.cloudflarestorage.com');
  assert.equal(url.pathname, `/originals/${id}/source`);
  assert.equal(url.searchParams.get('X-Amz-Expires'), '300');
  const signed = url.searchParams.get('X-Amz-SignedHeaders').split(';');
  for (const header of ['content-type', 'if-none-match', 'x-amz-meta-sha256']) assert.ok(signed.includes(header), header);
  assert.equal(result.headers['If-None-Match'], '*');
  assert.equal(url.searchParams.has('x-amz-checksum-crc32'), false);
});
test('existing identical original is reused; mismatched source is rejected', async t => {
  t.mock.method(r2Client, 'send', async () => ({ ContentLength: 100, ContentType: 'image/jpeg', Metadata: { sha256: details.sha256 } }));
  assert.deepEqual(await authorizeOriginalUpload(id, details), { stored: true });
  assert.equal(await authorizeOriginalUpload(id, { ...details, sha256: 'b'.repeat(64) }), null);
});
test('the public media bucket cannot be configured as original storage', () => {
  const saved = process.env.R2_ORIGINALS_BUCKET_NAME;
  process.env.R2_ORIGINALS_BUCKET_NAME = process.env.R2_BUCKET_NAME;
  try { assert.throws(originalBucket, /not configured/); }
  finally { process.env.R2_ORIGINALS_BUCKET_NAME = saved; }
});
