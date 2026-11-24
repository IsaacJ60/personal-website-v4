import assert from 'node:assert/strict';
import test from 'node:test';
import { photoViewerContext, archiveSearchValue } from '../features/photo-portfolio/lib/archive.ts';
import { portfolioMetadata } from '../features/photo-portfolio/lib/metadata.ts';

const photos = [
  { id: 'a', slug: 'first', title: 'First', date: '2026-01-01', location: 'Toronto', categories: [] },
  { id: 'b', slug: 'second', title: 'Second', date: '2026-01-02', location: 'Toronto', categories: [] },
  { id: 'c', slug: 'third', title: 'Third', date: '2025-01-01', location: 'Waterloo', categories: [] },
];

test('archive links describe the selected photograph instead of the original route slug', () => {
  const context = photoViewerContext(photos, 'first', { from: 'archive', photo: 'second' });
  assert.equal(context.active.slug, 'second');
  assert.equal(context.photo.slug, 'first');
  assert.deepEqual(context.sequence.map((photo) => photo.slug), ['first', 'second', 'third']);
  const metadata = portfolioMetadata(context.active.title, 'Description', `/photo/photos/${context.active.slug}`);
  assert.equal(metadata.alternates.canonical, 'https://isaacjiang.ca/photo/photos/second');
  assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
});
test('out-of-sequence and invalid photo selections match the viewer’s first-frame fallback', () => {
  const filtered = photoViewerContext(photos, 'second', { from: 'archive', place: 'Toronto', photo: 'third' });
  assert.equal(filtered.active.slug, 'first');
  const invalid = photoViewerContext(photos, 'second', { from: 'archive', photo: 'missing' });
  assert.equal(invalid.active.slug, 'first');
});
test('a route outside its archive filter stays on the original photo', () => {
  const context = photoViewerContext(photos, 'first', { from: 'archive', place: 'Waterloo', photo: 'third' });
  assert.equal(context.active.slug, 'first');
  assert.equal(context.archiveContext, undefined);
  assert.deepEqual(context.sequence, [photos[0]]);
});
test('standalone links cannot select an unrelated photo or rescue an unavailable route', () => {
  assert.equal(photoViewerContext(photos, 'first', { photo: 'second' }).active.slug, 'first');
  assert.equal(photoViewerContext(photos, 'missing', { from: 'archive', photo: 'first' }), null);
});
test('repeated parameters select the same first value as URLSearchParams', () => {
  assert.equal(archiveSearchValue({ photo: ['second', 'third'] }, 'photo'), 'second');
  assert.equal(photoViewerContext(photos, 'first', { from: ['archive', 'other'], photo: ['second', 'third'] }).active.slug, 'second');
});
test('metadata keeps absolute titles and explicitly preserves nested sharing defaults', () => {
  const metadata = portfolioMetadata('Series', 'Description', '/photo/series');
  assert.deepEqual(metadata.title, { absolute: 'Series — IJ.PRIME' });
  assert.equal(metadata.openGraph.title, metadata.twitter.title);
  assert.equal(metadata.openGraph.siteName, 'IJ.PRIME');
  assert.equal(metadata.openGraph.images[0].url, 'https://isaacjiang.ca/photo/share/default');
  assert.equal(metadata.twitter.images[0].url, metadata.openGraph.images[0].url);
  const photo = portfolioMetadata('Photo', 'Description', '/photo/photos/example', true,
    { path: '/photo/share/photos/example', alt: 'The photograph' });
  assert.equal(photo.openGraph.images[0].url, 'https://isaacjiang.ca/photo/share/photos/example');
  assert.equal(photo.twitter.images[0].alt, 'The photograph');
  assert.deepEqual(portfolioMetadata('Archive', 'Description', '/photo/archive?q=light', false).robots, { index: false, follow: true });
});
