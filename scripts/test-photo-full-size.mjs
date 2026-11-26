import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import sharp from 'sharp';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export{}', shortCircuit: true };
  if (specifier.startsWith('@/')) return next(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  try { return next(specifier, context); } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) return next(`${specifier}.ts`, context);
    throw error;
  }
} });
// Fixtures only: all catalog and storage requests are intercepted below.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
process.env.R2_ACCOUNT_ID = 'unit-account';
process.env.R2_V3_ACCESS_KEY_ID = 'unit-key';
process.env.R2_V3_SECRET_ACCESS_KEY = 'unit-secret';
process.env.R2_V3_ORIGINALS_BUCKET_NAME = 'photo-v3-originals';
const { originalStorageClient } = await import('../features/photo-portfolio/lib/original-storage.server.ts');
const { GET } = await import('../app/api/photo-sharing/[id]/route.ts');
const id = '00000000-0000-4000-8000-000000000001';
const request = photoId => GET(new Request(`https://example.com/api/photo-sharing/${photoId}?format=full-size`),
  { params: Promise.resolve({ id: photoId }) });

test('full-size requests reject invalid and unpublished photos before accessing originals', async t => {
  let queries = 0;
  t.mock.method(globalThis, 'fetch', async input => {
    queries++;
    const url = new URL(input instanceof Request ? input.url : input);
    assert.equal(url.searchParams.get('published'), 'eq.true');
    return Response.json(null);
  });
  t.mock.method(originalStorageClient, 'send', async () => assert.fail('must not read private storage'));
  assert.equal((await request('invalid')).status, 404);
  assert.equal(queries, 0);
  const response = await request(id);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(queries, 1);
});

test('full-size preview is generated once in R2, then served by signed redirects without reading the original again', async t => {
  const original = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#3186c2' } })
    .jpeg().withMetadata({ orientation: 6 }).toBuffer();
  t.mock.method(globalThis, 'fetch', async () => Response.json({ slug: 'test-photo', title: 'Test photo', object_key: `uploads/${id}/display.webp` }));
  let saved;
  const calls = [];
  t.mock.method(originalStorageClient, 'send', async command => {
    calls.push(command.constructor.name);
    assert.equal(command.input.Bucket, 'photo-v3-originals');
    if (command instanceof GetObjectCommand) {
      assert.equal(command.input.Key, `originals/${id}/source`);
      return { ContentLength: original.length, Body: (async function* () { yield original; })() };
    }
    assert.equal(command.input.Key, `previews/${id}/full-size-v1.jpg`);
    if (command instanceof HeadObjectCommand) {
      if (!saved) throw Object.assign(new Error('Not found'), { $metadata: { httpStatusCode: 404 } });
      return { ContentLength: saved.length, ContentType: 'image/jpeg' };
    }
    assert.ok(command instanceof PutObjectCommand);
    assert.equal(command.input.IfNoneMatch, '*');
    assert.equal(command.input.ContentDisposition, 'inline');
    assert.equal(command.input.ContentType, 'image/jpeg');
    assert.equal(command.input.CacheControl, 'private, max-age=3600');
    saved = command.input.Body;
    return {};
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await request(id);
    assert.equal(response.status, 302);
    assert.equal((await response.arrayBuffer()).byteLength, 0, 'Vercel never returns image bytes');
    assert.equal(response.headers.get('Cache-Control'), 'public, max-age=300, s-maxage=300');
    const url = new URL(response.headers.get('Location'));
    assert.equal(url.hostname, 'photo-v3-originals.unit-account.r2.cloudflarestorage.com');
    assert.equal(url.pathname, `/previews/${id}/full-size-v1.jpg`);
    assert.equal(url.searchParams.get('X-Amz-Expires'), '3600');
    assert.ok(url.searchParams.has('X-Amz-Signature'));
  }
  assert.deepEqual(calls, ['HeadObjectCommand', 'GetObjectCommand', 'PutObjectCommand', 'HeadObjectCommand']);
  const metadata = await sharp(saved).metadata();
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 2400);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.xmp, undefined);
});

test('existing R2 viewing copies need only a HEAD and never download or reprocess the original', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ slug: 'test-photo', title: 'Test photo', object_key: `uploads/${id}/display.webp` }));
  t.mock.method(originalStorageClient, 'send', async command => {
    assert.ok(command instanceof HeadObjectCommand);
    assert.equal(command.input.Key, `previews/${id}/full-size-v1.jpg`);
    return { ContentType: 'image/jpeg', ContentLength: 1234 };
  });
  assert.equal((await request(id)).status, 302);
});

test('storage permission failures do not trigger regeneration or a cacheable redirect', async t => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(globalThis, 'fetch', async () => Response.json({ slug: 'test-photo', title: 'Test photo', object_key: `uploads/${id}/display.webp` }));
  t.mock.method(originalStorageClient, 'send', async command => {
    assert.ok(command instanceof HeadObjectCommand);
    throw Object.assign(new Error('Forbidden'), { $metadata: { httpStatusCode: 403 } });
  });
  const response = await request(id);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Location'), null);
});

test('concurrent first views reuse the winner of an immutable R2 write', async t => {
  const original = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#3186c2' } }).png().toBuffer();
  t.mock.method(globalThis, 'fetch', async () => Response.json({ slug: 'test-photo', title: 'Test photo', object_key: `uploads/${id}/display.webp` }));
  t.mock.method(originalStorageClient, 'send', async command => {
    if (command instanceof HeadObjectCommand) throw Object.assign(new Error('Not found'), { $metadata: { httpStatusCode: 404 } });
    if (command instanceof GetObjectCommand) return { ContentLength: original.length, Body: (async function* () { yield original; })() };
    assert.ok(command instanceof PutObjectCommand);
    assert.equal(command.input.IfNoneMatch, '*');
    throw Object.assign(new Error('Already stored'), { $metadata: { httpStatusCode: 412 } });
  });
  assert.equal((await request(id)).status, 302);
});

test('a missing original reports unavailable rather than substituting a small derivative', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ slug: 'test-photo', title: 'Test photo', object_key: `uploads/${id}/display.webp` }));
  t.mock.method(originalStorageClient, 'send', async () => { throw Object.assign(new Error('Not found'), { $metadata: { httpStatusCode: 404 } }); });
  const response = await request(id);
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /original isn’t available/);
});
