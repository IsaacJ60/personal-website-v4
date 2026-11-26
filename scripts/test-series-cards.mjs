import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export{}', shortCircuit: true };
  // Exercise the real public query/projection without requiring a Next server cache.
  if (specifier === 'next/cache') return { url: 'data:text/javascript,export const unstable_cache = fn => fn;', shortCircuit: true };
  try { return next(specifier, context); } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) return next(`${specifier}.ts`, context);
    throw error;
  }
} });
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
const { getSeriesCards } = await import('../features/photo-portfolio/data/series-cards.ts');
const ids = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'];
const photos = ids.map((id, index) => ({ id, slug: `photo-${index}`, title: `Photo ${index}`,
  object_key: `uploads/${id}/display.webp`, categories: [], image_width: 1600, image_height: 1200 }));

test('series cards preserve public placement and chosen covers, excluding empty and Selected Work collections', async t => {
  const memberships = ids.map((photo_id, position) => ({ photo_id, position }));
  t.mock.method(globalThis, 'fetch', async input => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.pathname.endsWith('_photos')) return Response.json(photos);
    assert.equal(url.searchParams.get('published'), 'eq.true');
    return Response.json([
      { id: 'series', slug: 'city', title: 'City', kind: 'series', cover_photo_id: ids[1], photo_v3_collection_photos: memberships },
      { id: 'archive', slug: 'still', title: 'Still', kind: 'series', public_view: 'archive', photo_v3_collection_photos: memberships },
      { id: 'empty', slug: 'empty', title: 'Empty', kind: 'series', photo_v3_collection_photos: [] },
      { id: 'selected', slug: 'selected', title: 'Selected Work', kind: 'selected', photo_v3_collection_photos: memberships },
    ]);
  });
  const cards = await getSeriesCards();
  assert.deepEqual(cards.map(({ title, publicView, cover }) => [title, publicView, cover.id]), [
    ['City', 'series', ids[1]], ['Still', 'archive', ids[0]],
  ]);
  assert.equal(cards[0].cover.thumbnail, `/api/photo-preview/media/${ids[1]}/thumbnail`);
  assert.equal('photos' in cards[0], false);
});

test('a collection with no anonymously visible photos never becomes a public card', async t => {
  t.mock.method(globalThis, 'fetch', async input => {
    const url = new URL(input instanceof Request ? input.url : input);
    return Response.json(url.pathname.endsWith('_photos') ? [] : [
      { id: 'private', slug: 'private', title: 'Private', kind: 'series', photo_v3_collection_photos: [{ photo_id: ids[0], position: 0 }] },
    ]);
  });
  assert.deepEqual(await getSeriesCards(), []);
});
