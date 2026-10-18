import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareImage } from '../image-upload.js';

const file = (type = 'image/png', size = 1024) => ({ type, size });
const url = bytes => 'data:image/webp;base64,' + Buffer.alloc(bytes).toString('base64');
function browser(t, { width = 1600, height = 800, output = () => url(1024), decodeError = false } = {}) {
 const oldBitmap = globalThis.createImageBitmap, oldDocument = globalThis.document;
 const state = { decodes: 0, closed: 0, calls: [], draws: [] };
 globalThis.createImageBitmap = async () => {
  state.decodes++;
  if (decodeError) throw new Error('InvalidStateError: source cannot be decoded');
  return { width, height, close() { state.closed++; } };
 };
 globalThis.document = { createElement(tag) {
  assert.equal(tag, 'canvas');
  const canvas = { width: 0, height: 0, getContext() { return { drawImage(...args) { state.draws.push(args); } }; }, toDataURL(type, quality) { state.calls.push({ width: canvas.width, height: canvas.height, type, quality }); return output(state.calls.length); } };
  return canvas;
 } };
 t.after(() => { if (oldBitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = oldBitmap; if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument; });
 return state;
}

test('rejects unsupported formats and files above 5MB before decoding', async t => {
 const s = browser(t);
 for (const type of ['image/gif', 'image/svg+xml', 'text/plain', '']) await assert.rejects(prepareImage(file(type)), /请选择 JPG、PNG 或 WebP/);
 await assert.rejects(prepareImage(file('image/jpeg', 5 * 1024 * 1024 + 1)), /不能超过 5MB/);
 assert.equal(s.decodes, 0);
});

test('accepts JPG, PNG and WebP at the 5MB boundary and limits longest edge to 800px', async t => {
 const s = browser(t);
 for (const type of ['image/jpeg', 'image/png', 'image/webp']) await prepareImage(file(type, 5 * 1024 * 1024));
 assert.equal(s.closed, 3);
 assert.ok(s.calls.every(c => c.width === 800 && c.height === 400));
});

test('does not upscale a small portrait and preserves its proportions', async t => {
 const s = browser(t, { width: 200, height: 500 });
 await prepareImage(file());
 assert.deepEqual([s.calls[0].width, s.calls[0].height], [200, 500]);
});

test('accepts exactly 300KB including correct base64 padding accounting', async t => {
 const s = browser(t, { output: () => url(300 * 1024) });
 const result = await prepareImage(file());
 assert.equal(Buffer.from(result.split(',')[1], 'base64').length, 300 * 1024);
 assert.equal(s.calls.length, 1);
});

test('retries quality when output exceeds 300KB by one byte', async t => {
 const s = browser(t, { output: n => url(n === 1 ? 300 * 1024 + 1 : 300 * 1024 - 1) });
 const result = await prepareImage(file());
 assert.equal(Buffer.from(result.split(',')[1], 'base64').length, 300 * 1024 - 1);
 assert.equal(s.calls.length, 2);
 assert.ok(s.calls[1].quality < s.calls[0].quality);
});

test('reduces dimensions after quality attempts and rejects an irreducibly large image', async t => {
 const s = browser(t, { output: () => url(300 * 1024 + 1) });
 await assert.rejects(prepareImage(file()), /仍超过 300KB/);
 assert.ok(s.calls.some(c => c.width < 800));
 assert.equal(s.closed, 1);
});

test('reports corrupt image decoding failures in Chinese', async t => {
 const s = browser(t, { decodeError: true });
 await assert.rejects(prepareImage(file()), /图片无法读取，可能已损坏/);
 assert.equal(s.calls.length, 0);
});
