import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

const stub = source => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true });
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return stub('export {}');
  if (specifier === 'next/headers') return stub('export async function cookies(){return {getAll(){return []}}}');
  if (specifier === 'next/navigation') return stub('export function redirect(){throw Error("Redirect")} export function notFound(){throw Error("Not found")}');
  if (specifier === '@supabase/ssr') return stub('export function createServerClient(){return globalThis.seriesAdminClient}');
  try { return next(specifier, context); } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) return next(`${specifier}.ts`, context);
    throw error;
  }
} });
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
process.env.ADMIN_USER_ID = 'test-admin';
const { getAdminPhotoLibrary, isSeriesPublishingReady } = await import('../features/photo-portfolio/data/admin.ts');
const series = ['City', 'Still', 'WC'].map((title, index) => ({ id: `series-${index}`, title }));
const photos = series.map((owner, index) => {
  const id = `00000000-0000-4000-8000-00000000000${index}`;
  return { id, slug: `photo-${index}`, title: `Photo ${index}`, object_key: `uploads/${id}/display.webp`,
    owner_series_id: owner.id, published: false, categories: [], image_width: 1600, image_height: 1200 };
});

function fixture(t, rows = photos, error = null) {
  globalThis.seriesAdminClient = {
    auth: { async getClaims() { return { data: { claims: { sub: 'test-admin' } } }; } },
    from(table) {
      let projection;
      const query = {
        select(value) { projection = value; return query; }, eq() { return query; }, order() { return query; },
        async range() {
          if (table === 'photo_v3_collections') return { data: series, error: null };
          assert.equal(projection, '*,owner_series_id');
          return { data: rows, error };
        },
        async limit(size) { assert.equal(size, 0); assert.equal(projection, table === 'photo_v3_photos' ? 'owner_series_id' : 'public_view'); return { error }; },
      };
      return query;
    },
  };
  t.mock.method(globalThis, 'fetch', async () => Response.json([{ id: photos[0].id }]));
}

test('library resolves distinct canonical series names and derives public eligibility independently', async t => {
  fixture(t);
  const result = await getAdminPhotoLibrary();
  assert.deepEqual(result.map(photo => photo.ownerSeriesTitle), ['City', 'Still', 'WC']);
  assert.deepEqual(result.map(photo => photo.ownerSeriesId), series.map(owner => owner.id));
  assert.deepEqual(result.map(photo => photo.published), [true, false, false]);
  assert.equal(await isSeriesPublishingReady(), true);
});

test('pre-migration schema is reported as pending instead of producing a generic Series filter', async t => {
  fixture(t, null, { code: '42703', message: 'column owner_series_id does not exist' });
  assert.equal(await isSeriesPublishingReady(), false);
  await assert.rejects(getAdminPhotoLibrary(), /Could not load the photo library/);
});

test('missing ownership and unresolved owners cannot silently collapse into one filter option', async t => {
  for (const owner_series_id of [undefined, null, 'missing-series']) {
    fixture(t, [{ ...photos[0], owner_series_id }]);
    await assert.rejects(getAdminPhotoLibrary(), /no valid owning series/);
  }
});

test('connection failures are not mistaken for an unapplied migration', async t => {
  fixture(t, null, { code: '503', message: 'Unavailable' });
  await assert.rejects(isSeriesPublishingReady(), /Could not check series publishing setup/);
});
