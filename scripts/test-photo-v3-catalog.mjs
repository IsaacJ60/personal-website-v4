import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export{}', shortCircuit: true };
  try { return next(specifier, context); } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) return next(`${specifier}.ts`, context);
    throw error;
  }
} });
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
const { getPortfolio, mapPhoto } = await import('../features/photo-portfolio/data/catalog.ts');
const id = '00000000-0000-4000-8000-000000000001';
const photo = { id, slug: 'new-edit', title: 'New edit', description: null, alt_text: 'New edit',
  object_key: `uploads/${id}/display.webp`, published: true, categories: [], image_width: 1600, image_height: 1200 };

test('v3 photos use only their own derivative routes, even for a reused slug', () => {
  const mapped = mapPhoto(photo);
  assert.equal(mapped.src, `/api/photo-preview/media/${id}/display`);
  assert.equal(mapPhoto({ ...photo, published: false }).src, `/api/photo-preview/media/${id}/display`);
  assert.equal(mapped.thumbnail, `/api/photo-preview/media/${id}/thumbnail`);
  assert.equal(mapPhoto(photo, false).src, `/api/photo-preview/draft-media/${id}/display`);
  for (const key of ['legacy.jpg', 'https://media.isaacjiang.ca/camera/old.jpg', `uploads/${id}/thumbnail.webp`]) {
    assert.throws(() => mapPhoto({ ...photo, object_key: key }), /Unsupported v3/);
  }
});

test('empty v3 stays empty and never requests an old catalog', async t => {
  const requested = [];
  t.mock.method(globalThis, 'fetch', async input => {
    const url = new URL(input instanceof Request ? input.url : input);
    requested.push(url.pathname);
    assert.equal(url.searchParams.get('published'), url.pathname.endsWith('_photos') ? null : 'eq.true');
    return Response.json([]);
  });
  const portfolio = await getPortfolio();
  assert.deepEqual(portfolio, { photos: [], collections: [], selected: undefined });
  assert.deepEqual(requested, ['/rest/v1/photo_v3_photos', '/rest/v1/photo_v3_collections']);
});

test('published v3 collections resolve their own ordered memberships', async t => {
  const secondId = '00000000-0000-4000-8000-000000000002';
  t.mock.method(globalThis, 'fetch', async input => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.pathname === '/rest/v1/photo_v3_photos') return Response.json([
      photo, { ...photo, id: secondId, slug: 'second', object_key: `uploads/${secondId}/display.webp` },
    ]);
    assert.equal(url.pathname, '/rest/v1/photo_v3_collections');
    assert.ok(url.searchParams.get('select').includes('photo_v3_collection_photos'));
    return Response.json([{ id: 'selection', slug: 'selected', title: 'Selected Work', kind: 'selected',
      photo_v3_collection_photos: [{ photo_id: id, position: 1 }, { photo_id: secondId, position: 0 }] }]);
  });
  const portfolio = await getPortfolio();
  assert.equal(portfolio.collections.length, 1);
  assert.equal(portfolio.selected.isDemo, false);
  assert.deepEqual(portfolio.selected.photos.map(p => p.id), [secondId, id]);
});

test('a retained selection cannot rescue a photo absent from anonymous series visibility',async t=>{
  t.mock.method(globalThis,'fetch',async input=>{
    const url=new URL(input instanceof Request?input.url:input);
    if(url.pathname.endsWith('_photos'))return Response.json([]);
    return Response.json([{id:'selection',slug:'selected',title:'Selected Work',kind:'selected',cover_photo_id:id,
      photo_v3_collection_photos:[{photo_id:id,position:0}]}]);
  });
  const portfolio=await getPortfolio();
  assert.deepEqual(portfolio.photos,[]);
  assert.equal(portfolio.selected,undefined);
  assert.deepEqual(portfolio.collections[0].photos,[]);
  assert.equal(portfolio.collections[0].coverPhotoId,null);
});

test('public catalog retains archive placement and lets Selected Work reference archived series photos',async t=>{
 t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input instanceof Request?input.url:input);
  if(url.pathname.endsWith('_photos'))return Response.json([photo]);
  return Response.json([
   {id:'archived',slug:'flowers',title:'Flowers',kind:'series',public_view:'archive',photo_v3_collection_photos:[{photo_id:id,position:0}]},
   {id:'selected',slug:'selected-work-live',title:'Selected Work',kind:'selected',public_view:'series',photo_v3_collection_photos:[{photo_id:id,position:0}]},
  ]);
 });
 const result=await getPortfolio();
 assert.equal(result.collections[0].publicView,'archive');
 assert.equal(result.collections[0].photos[0].id,id);
 assert.equal(result.selected.photos[0].id,id);
});
test('old schema overlap defaults public copies to Series without exposing private drafts',async t=>{
 let attempts=0;
 t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input instanceof Request?input.url:input);
  if(url.pathname.endsWith('_photos'))return Response.json([photo]);
  attempts++;
  if(url.searchParams.get('select').includes('public_view'))return Response.json({code:'42703',message:'column public_view does not exist'},{status:400});
  assert.equal(url.searchParams.get('published'),'eq.true');
  return Response.json([{id:'series',slug:'old',title:'Old',kind:'series',photo_v3_collection_photos:[{photo_id:id,position:0}]}]);
 });
 const result=await getPortfolio();
 assert.equal(attempts,2);
 assert.equal(result.collections[0].publicView,'series');
});
