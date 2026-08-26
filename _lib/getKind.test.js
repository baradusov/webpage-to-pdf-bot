import test from 'node:test';
import assert from 'node:assert/strict';
import { getKind } from './getKind.js';

test('a plain message is text', () => {
  assert.equal(getKind({ text: 'https://example.com' }), 'text');
});

test('a document carries its mime type', () => {
  assert.equal(
    getKind({ document: { mime_type: 'text/html' } }),
    'document:text/html'
  );
  assert.equal(getKind({ document: {} }), 'document:unknown');
});

test('media is named by its shape', () => {
  assert.equal(getKind({ photo: [{}] }), 'photo');
  assert.equal(getKind({ sticker: {} }), 'sticker');
  assert.equal(getKind({ voice: {} }), 'voice');
  assert.equal(getKind({ venue: {} }), 'location');
});

test('a document wins over a caption', () => {
  assert.equal(
    getKind({ document: { mime_type: 'application/pdf' }, caption: 'look' }),
    'document:application/pdf'
  );
});

test('anything unrecognised is other', () => {
  assert.equal(getKind({}), 'other');
  assert.equal(getKind(undefined), 'other');
});
