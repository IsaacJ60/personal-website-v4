import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export{}', shortCircuit: true };
  if (specifier === '@/features/photo-portfolio/data/admin') return {
    url: 'data:text/javascript,export const portfolioUuid=/^[0-9a-f-]{36}$/i;', shortCircuit: true,
  };
  if (specifier.startsWith('@/')) return next(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  try { return next(specifier, context); } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) return next(`${specifier}.ts`, context);
    throw error;
  }
} });
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
const { GET } = await import('../app/api/photo-preview/media/[id]/[variant]/route.ts');
const id = '00000000-0000-4000-8000-000000000001';
const request = (photoId = id, variant = 'display') => GET(new Request('http://localhost/media'), {
  params: Promise.resolve({ id: photoId, variant }),
});

test('public derivatives issue uncached 60-second signatures and reject invalid variants before storage', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    calls++;
    const url = new URL(input instanceof Request ? input.url : input);
    assert.equal(url.pathname, `/storage/v1/object/sign/portfolio-v3-media/uploads/${id}/display.webp`);
    assert.equal(JSON.parse(options.body).expiresIn, 60);
    return Response.json({ signedURL: '/object/sign/portfolio-v3-media/example?token=test' });
  });
  assert.equal((await request('invalid')).status, 404);
  assert.equal((await request(id, 'original')).status, 404);
  assert.equal(calls, 0);
  const response = await request();
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.match(response.headers.get('Location'), /^https:\/\/example.supabase.co\/storage\/v1\/object\/sign\//);
});

test('a revoked public storage read cannot issue another signed URL', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Object not found' }, { status: 400 }));
  const response = await request();
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('Location'), null);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
