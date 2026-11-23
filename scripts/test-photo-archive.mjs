import assert from 'node:assert/strict';
import test from 'node:test';
import { archiveHref, archivePage, filterArchive } from '../features/photo-portfolio/lib/archive.ts';

const photos = [
  { id:'a', title:'Café window', alt:'A reflection', description:null, location:'Montréal, Canada', date:'2026-03-01', categories:['City'] },
  { id:'b', title:'Harbour', alt:'Blue water', description:'A quiet evening', location:'Vancouver', date:'2025-08-02', categories:[] },
  { id:'c', title:'Window light', alt:'A room', description:null, location:null, date:'2026-01-04', categories:[] },
];

test('search ignores case, surrounding whitespace, and accents', () => {
  assert.deepEqual(filterArchive(photos, ' CAFE ', '', '').map(p => p.id), ['a']);
  assert.deepEqual(filterArchive(photos, 'montreal', '', '').map(p => p.id), ['a']);
});
test('year and exact place combine with search without changing photo order', () => {
  assert.deepEqual(filterArchive(photos, 'window', '', '2026').map(p => p.id), ['a', 'c']);
  assert.deepEqual(filterArchive(photos, 'window', 'Montréal, Canada', '2026').map(p => p.id), ['a']);
  assert.deepEqual(filterArchive(photos, '', 'Montréal', ''), []);
});
test('unknown filters return an empty result and null metadata is searchable safely', () => {
  assert.deepEqual(filterArchive(photos, '', '', '1999'), []);
  assert.deepEqual(filterArchive(photos, 'room', '', '').map(p => p.id), ['c']);
});
test('page values stay finite, integral, and within the filtered page count', () => {
  for (const value of [null, '', 'NaN', 'Infinity', '-5', 'garbage']) assert.equal(archivePage(value, 4), 1);
  assert.equal(archivePage('2.9', 4), 2);
  assert.equal(archivePage('900', 4), 4);
  assert.equal(archivePage('2', 1), 1);
});
test('return URLs preserve encoded search, place, year, and page without arbitrary destinations', () => {
  const href = archiveHref('light & shadow', 'Montréal, Canada', '2026', 3);
  const url = new URL(href, 'http://localhost');
  assert.equal(url.pathname, '/photo-preview/archive');
  assert.equal(url.searchParams.get('q'), 'light & shadow');
  assert.equal(url.searchParams.get('place'), 'Montréal, Canada');
  assert.equal(url.searchParams.get('year'), '2026');
  assert.equal(url.searchParams.get('page'), '3');
  assert.equal(archiveHref('', '', ''), '/photo-preview/archive');
});
