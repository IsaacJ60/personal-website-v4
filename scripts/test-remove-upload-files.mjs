import assert from 'node:assert/strict';
import test from 'node:test';
import { removeUploadFiles } from '../features/photo-portfolio/lib/remove-upload-files.ts';

const paths = ['uploads/id/display.webp', 'uploads/id/thumbnail.webp'];
test('successful removal checks both derivatives before completing cleanup', async () => {
  assert.equal(await removeUploadFiles({
    remove: async (requested) => { assert.deepEqual(requested, paths); return { error: null }; },
    list: async (folder) => { assert.equal(folder, 'uploads/id'); return { data: [], error: null }; },
    exists: async () => ({ data: false, error: { status: 400, message: 'Object not found' } }),
  }, paths), true);
});
test('silent RLS rejection or partial removal keeps cleanup retryable', async () => {
  assert.equal(await removeUploadFiles({ remove: async () => ({ error: null }),
    list: async () => ({ data: [{ name: 'thumbnail.webp' }], error: null }),
  }, paths), false);
});
test('a retry completes when the remaining derivative is removed, including already missing files', async () => {
  const remaining = new Set([paths[1]]);
  const storage = { remove: async (requested) => { requested.forEach((path) => remaining.delete(path)); return { error: null }; },
    list: async () => ({ data: [...remaining].map((path) => ({ name: path.split('/').at(-1) })), error: null }) };
  assert.equal(await removeUploadFiles(storage, paths), true);
  assert.equal(await removeUploadFiles(storage, paths), true);
});
test('storage and verification errors never acknowledge cleanup', async () => {
  const list = async () => ({ data: [], error: null });
  assert.equal(await removeUploadFiles({ remove: async () => ({ error: new Error('unavailable') }), list }, paths), false);
  assert.equal(await removeUploadFiles({ remove: async () => { throw new TypeError('offline'); }, list }, paths), false);
  assert.equal(await removeUploadFiles({ remove: async () => ({ error: null }), list: async () => ({ data: null, error: new Error('unauthorized') }) }, paths), false);
});
