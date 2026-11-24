import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import sharp from 'sharp';

const stub = source => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return stub('export {}');
  if (specifier === 'next/cache') return stub('export function revalidatePath() {}');
  if (specifier === '@/features/photo-portfolio/data/admin') return stub(`
    export const portfolioUuid = /^[0-9a-f-]{36}$/i;
    export async function getPortfolioAdminClient() { return globalThis.uploadRetentionState.client; }
  `);
  if (specifier === '@/features/photo-portfolio/lib/original-storage.server') return stub(`
    export async function findUploadedOriginal() {
      const state = globalThis.uploadRetentionState;
      if (state.originalError) throw new Error('Storage unavailable');
      return state.original;
    }
  `);
  if (specifier.startsWith('@/')) return next(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  try { return next(specifier, context); } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) return next(`${specifier}.ts`, context);
    throw error;
  }
} });
const { POST } = await import('../app/api/photo-preview/upload/route.ts');
const id = '00000000-0000-4000-8000-000000000001';
const hash = 'a'.repeat(64);
const image = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#334455' } }).webp().toBuffer();

function fixture(original = { ContentLength: 100, ContentType: 'image/jpeg', Metadata: { sha256: hash } }) {
  const state = { original, derivativeWrites: 0, inserts: [], originalError: false };
  state.client = {
    from() { return {
      select() { return { eq() { return { async maybeSingle() { return { data: null, error: null }; } }; } }; },
      async insert(row) { state.inserts.push(row); return { error: null }; },
    }; },
    storage: { from() { return { async upload() { state.derivativeWrites++; return { error: null }; } }; } },
  };
  globalThis.uploadRetentionState = state;
  return state;
}
function request(sha = hash, mode = 'draft') {
  const body = new FormData();
  body.set('id', id); body.set('title', 'Original retention test'); body.set('date', '2026-11-23');
  body.set('image', new File([image], 'display.webp', { type: 'image/webp' }));
  body.set('mode', mode);
  if (sha !== null) body.set('originalSha256', sha);
  return new Request('http://localhost:3000/api/photo-preview/upload', { method: 'POST', body });
}

test('missing original rejects both draft and publish before writing derivatives or rows', async () => {
  for (const mode of ['draft', 'publish']) {
    const state = fixture(null); const response = await POST(request(hash, mode));
    assert.equal(response.status, 409); assert.equal(state.derivativeWrites, 0); assert.deepEqual(state.inserts, []);
  }
});
test('mismatched or missing digest cannot commit a photo', async () => {
  for (const digest of ['b'.repeat(64), null]) {
    const state = fixture(); const response = await POST(request(digest));
    assert.ok([400, 409].includes(response.status)); assert.equal(state.derivativeWrites, 0); assert.deepEqual(state.inserts, []);
  }
});
test('original storage failure leaves metadata uncommitted and retryable', async () => {
  const state = fixture(); state.originalError = true;
  const response = await POST(request());
  assert.equal(response.status, 503); assert.equal(state.derivativeWrites, 0); assert.deepEqual(state.inserts, []);
});
test('verified original allows both derivatives and the catalog row to be saved', async () => {
  const state = fixture(); const response = await POST(request());
  assert.equal(response.status, 201); assert.equal(state.derivativeWrites, 2); assert.equal(state.inserts.length, 1);
  assert.equal(state.inserts[0].object_key, `uploads/${id}/display.webp`);
  assert.equal(state.inserts[0].published, false);
});
