import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({resolve(specifier,context,next){
  try{return next(specifier,context);}catch(error){
    if(error.code==='ERR_MODULE_NOT_FOUND' && specifier.startsWith('.'))return next(`${specifier}.ts`,context);
    throw error;
  }
}});
const {portfolioSitemap}=await import('../features/photo-portfolio/lib/sitemap.ts');

const origin = 'https://www.isaacjiang.ca';
test('sitemap lists public canonical pages and published photos, excluding demo and other collection kinds', () => {
  const result = portfolioSitemap(origin, [{ slug: 'a-photo' }], [
    { slug: 'real-series', kind: 'series', isDemo: false },
    { slug: 'demo-series', kind: 'series', isDemo: true },
    { slug: 'selected-work', kind: 'selected', isDemo: false },
    { slug: 'notebook', kind: 'notebook', isDemo: false },
  ]);
  assert.deepEqual(result.map(({ url }) => new URL(url).pathname), [
    '/', '/photo', '/photo/series', '/photo/archive', '/photo/about', '/photo/photos/a-photo', '/photo/series/real-series',
  ]);
  assert.ok(result.every(({ url }) => new URL(url).origin === origin && !new URL(url).search && !new URL(url).hash));
});
test('sitemap retains genuine modification timestamps and omits unknown dates', () => {
  const stamp = '2026-11-23T20:15:00Z';
  const result = portfolioSitemap(origin, [{ slug: 'a', updatedAt: stamp }, { slug: 'b' }], [
    { slug: 'series', kind: 'series', isDemo: false, updatedAt: stamp },
  ]);
  assert.equal(result.find(({ url }) => url.endsWith('/a')).lastModified, stamp);
  assert.equal(result.find(({ url }) => url.endsWith('/series/series')).lastModified, stamp);
  assert.equal(Object.hasOwn(result.find(({ url }) => url.endsWith('/b')), 'lastModified'), false);
  assert.equal(Object.hasOwn(result[0], 'lastModified'), false);
});
test('publication changes are reflected by rebuilding from the current public catalog', () => {
  const photos = [{ slug: 'original' }];
  const first = portfolioSitemap(origin, photos, []);
  const published = portfolioSitemap(origin, [...photos, { slug: 'new-upload' }], []);
  assert.equal(published.length, first.length + 1);
  const removed = portfolioSitemap(origin, [], []);
  assert.ok(!removed.some(({ url }) => url.includes('/photos/')));
  assert.equal(first.length, 6, 'Previous request state should remain independent');
});
test('slugs are encoded as one path segment rather than query or fragment parameters', () => {
  const result = portfolioSitemap(origin, [{ slug: 'light & shade?#' }], []);
  assert.equal(result.at(-1).url, `${origin}/photo/photos/light%20%26%20shade%3F%23`);
});

test('archived series have archive canonical URLs without appearing as featured Series entries',()=>{
 const entries=portfolioSitemap(origin,[],[
  {slug:'featured',kind:'series',isDemo:false,publicView:'series'},
  {slug:'older work',kind:'series',isDemo:false,publicView:'archive'},
 ]).map(e=>e.url);
 assert.ok(entries.includes(origin+'/photo/series/featured'));
 assert.ok(entries.includes(origin+'/photo/archive/older%20work'));
 assert.ok(!entries.includes(origin+'/photo/series/older%20work'));
});
