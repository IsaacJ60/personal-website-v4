import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
// Node's type stripping needs a resolver for app-style extensionless TS imports.
registerHooks({ resolve(specifier, context, next) {
  if (specifier === './upload-original.client' && context.parentURL?.endsWith('/save-draft-batch.ts')) {
    return { url: `data:text/javascript,${encodeURIComponent("export async function uploadPhotoOriginal(id, file) { if (file.name === 'fail.jpg') throw new Error('Original upload failed'); return 'a'.repeat(64); }")}`, shortCircuit: true };
  }
  try { return next(specifier, context); } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) return next(`${specifier}.ts`, context);
    throw error;
  }
} });
const { savePhotoBatch: saveDraftBatch } = await import('../features/photo-portfolio/lib/save-draft-batch.ts');

const photo = (id) => ({ id, image: new Blob(['same-image'], { type: 'image/webp' }), original: new File(['original-image'], 'original.jpg', { type: 'image/jpeg' }),
  details: { title: id, date: '2026-11-23', location: '', caption: '', altText: '' } });
const success = (id, published = false) => Response.json({ id, slug: `photo-${id}`, published });
function observer(signal = new AbortController().signal) {
  const events = [];
  return { events, signal, onStart: (id, position) => events.push(['start', id, position]),
    onSaved: (id) => events.push(['saved', id]), onFailed: (id, error) => events.push(['failed', id, error]) };
}

test('uploads sequentially, continues after failures, and always requests private drafts', async (t) => {
  let active = 0;
  let peak = 0;
  t.mock.method(globalThis, 'fetch', async (_url, request) => {
    active++;
    peak = Math.max(peak, active);
    assert.equal(request.body.get('mode'), 'draft');
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    const id = request.body.get('id');
    return id === 'b' ? Response.json({ error: 'Storage unavailable' }, { status: 503 }) : success(id);
  });
  const options = observer();
  await saveDraftBatch(['a', 'b', 'c'].map(photo), options);
  assert.equal(peak, 1);
  assert.deepEqual(options.events.filter(([kind]) => kind !== 'failed'), [
    ['start', 'a', 1], ['saved', 'a'], ['start', 'b', 2], ['start', 'c', 3], ['saved', 'c'],
  ]);
  assert.deepEqual(options.events.find(([kind]) => kind === 'failed'), ['failed', 'b', 'Storage unavailable']);
});

test('retry after a lost response uses the same ID, image bytes, and metadata', async (t) => {
  const records = new Map();
  let first = true;
  const payloads = [];
  t.mock.method(globalThis, 'fetch', async (_url, { body }) => {
    const id = body.get('id');
    payloads.push([id, await body.get('image').text(), body.get('title'), body.get('date')]);
    records.set(id, true);
    if (first) { first = false; throw new TypeError('Response lost after commit'); }
    return success(id);
  });
  const item = photo('a');
  const firstAttempt = observer();
  await saveDraftBatch([item], firstAttempt);
  assert.equal(firstAttempt.events.at(-1)[0], 'failed');
  const retry = observer();
  await saveDraftBatch([item], retry);
  assert.deepEqual(payloads[0], payloads[1]);
  assert.equal(records.size, 1);
  assert.deepEqual(retry.events.at(-1), ['saved', 'a']);
});

test('authentication failure pauses before sending remaining photos', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (_url, { body }) => {
    const id = body.get('id');
    calls.push(id);
    return id === 'b' ? new Response('Sign in', { status: 401 }) : success(id);
  });
  const options = observer();
  assert.deepEqual(await saveDraftBatch(['a', 'b', 'c'].map(photo), options), { authenticationRequired: true });
  assert.deepEqual(calls, ['a', 'b']);
});

test('malformed or mismatched responses remain retryable failures', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, { body }) => body.get('id') === 'a'
    ? new Response('Gateway unavailable', { status: 502 }) : success('wrong-id'));
  const options = observer();
  await saveDraftBatch(['a', 'b'].map(photo), options);
  assert.equal(options.events.filter(([kind]) => kind === 'saved').length, 0);
  assert.equal(options.events.filter(([kind]) => kind === 'failed').length, 2);
});

test('unmount cancellation stops the queue without marking later photos failed', async (t) => {
  const controller = new AbortController();
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (_url, { body }) => {
    calls.push(body.get('id'));
    controller.abort();
    throw new DOMException('Aborted', 'AbortError');
  });
  const options = observer(controller.signal);
  await saveDraftBatch(['a', 'b'].map(photo), options);
  assert.deepEqual(calls, ['a']);
  assert.deepEqual(options.events, [['start', 'a', 1]]);
});

test('new photos are saved privately before publishing, then return their public link', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, { body }) => {
    calls.push(url);
    if (url.endsWith('/upload')) {
      assert.equal(body.get('mode'), 'draft');
      return success(body.get('id'));
    }
    assert.deepEqual(JSON.parse(body), { id: 'a', details: photo('a').details });
    return success('a', true);
  });
  let result;
  const options = { ...observer(), onSaved: (_id, value) => { result = value; } };
  await saveDraftBatch([{ ...photo('a'), mode: 'publish' }], options);
  assert.deepEqual(calls, ['/api/photo-preview/upload', '/api/photo-preview/publish']);
  assert.deepEqual(result, { id: 'a', slug: 'photo-a', published: true });
});

test('saved drafts publish without image data or a second upload', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, '/api/photo-preview/publish');
    return success('a', true);
  });
  const options = observer();
  await saveDraftBatch([{ ...photo('a'), image: undefined, stored: true, mode: 'publish' }], options);
  assert.deepEqual(options.events.at(-1), ['saved', 'a']);
});

test('publication failure preserves the saved draft and retries only publishing after a lost response', async (t) => {
  const records = new Map();
  let uploaded;
  let loseResponse = true;
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(url);
    if (url.endsWith('/upload')) return success('a');
    records.set('a', true);
    if (loseResponse) { loseResponse = false; throw new TypeError('response lost'); }
    return success('a', true);
  });
  const first = { ...observer(), onUploaded: (_id, value) => { uploaded = value; } };
  await saveDraftBatch([{ ...photo('a'), mode: 'publish' }], first);
  assert.equal(uploaded.published, false);
  assert.equal(first.events.at(-1)[0], 'failed');
  const retry = observer();
  await saveDraftBatch([{ ...photo('a'), stored: true, image: undefined, mode: 'publish' }], retry);
  assert.deepEqual(calls, ['/api/photo-preview/upload', '/api/photo-preview/publish', '/api/photo-preview/publish']);
  assert.equal(records.size, 1);
  assert.deepEqual(retry.events.at(-1), ['saved', 'a']);
});

test('one rejected publication does not block other saved drafts', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, { body }) => {
    const { id } = JSON.parse(body);
    return id === 'a' ? Response.json({ error: 'Draft details changed' }, { status: 409 }) : success(id, true);
  });
  const options = observer();
  await saveDraftBatch(['a', 'b'].map((id) => ({ ...photo(id), stored: true, mode: 'publish' })), options);
  assert.deepEqual(options.events.find(([kind]) => kind === 'failed'), ['failed', 'a', 'Draft details changed']);
  assert.deepEqual(options.events.at(-1), ['saved', 'b']);
});

test('authentication expiry during publication retains the upload and pauses remaining items', async (t) => {
  const calls = [];
  const uploaded = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(url);
    return url.endsWith('/upload') ? success('a') : new Response('Sign in', { status: 401 });
  });
  const options = { ...observer(), onUploaded: (id) => uploaded.push(id) };
  const result = await saveDraftBatch(['a', 'b'].map((id) => ({ ...photo(id), mode: 'publish' })), options);
  assert.equal(result.authenticationRequired, true);
  assert.deepEqual(uploaded, ['a']);
  assert.equal(calls.length, 2);
  assert.equal(options.events.at(-1)[1], 'a');
});

test('missing or failed original uploads never submit derivative metadata', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async url => { calls.push(url); return success('a'); });
  const missing = observer();
  await saveDraftBatch([{ ...photo('a'), original: undefined }], missing);
  assert.equal(missing.events.at(-1)[0], 'failed');
  const failed = observer();
  await saveDraftBatch([{ ...photo('b'), mode: 'publish', original: new File(['source'], 'fail.jpg') }], failed);
  assert.deepEqual(failed.events.at(-1), ['failed', 'b', 'Original upload failed']);
  assert.deepEqual(calls, []);
});
