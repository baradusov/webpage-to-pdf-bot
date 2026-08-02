import test from 'node:test';
import assert from 'node:assert/strict';
import { startProgress } from './progress.js';

const makeCtx = () => {
  const sent = [];
  return {
    sent,
    message: { message_id: 1 },
    reply: async (text) => {
      sent.push(text);
      return { message_id: 100 + sent.length };
    },
  };
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('fast work never shows a status message', async () => {
  const ctx = makeCtx();
  const progress = startProgress(ctx, 'working', 50);

  await wait(10);
  const status = await progress.settle();

  assert.equal(status, null);
  assert.deepEqual(ctx.sent, []);
});

test('slow work gets a status message', async () => {
  const ctx = makeCtx();
  const progress = startProgress(ctx, 'working', 20);

  await wait(60);
  const status = await progress.settle();

  assert.equal(ctx.sent.length, 1);
  assert.equal(status.message_id, 101);
});

test('settling twice does not send twice', async () => {
  const ctx = makeCtx();
  const progress = startProgress(ctx, 'working', 20);

  await wait(60);
  await progress.settle();
  await progress.settle();

  assert.equal(ctx.sent.length, 1);
});

test('a send in flight is awaited, not lost', async () => {
  const ctx = makeCtx();
  ctx.reply = async () => {
    await wait(40);
    return { message_id: 777 };
  };

  const progress = startProgress(ctx, 'working', 10);
  await wait(20);
  const status = await progress.settle();

  assert.equal(status.message_id, 777);
});

test('a failed send leaves no status rather than throwing', async () => {
  const ctx = makeCtx();
  ctx.reply = async () => {
    throw new Error('blocked by user');
  };

  const progress = startProgress(ctx, 'working', 10);
  await wait(30);

  assert.equal(await progress.settle(), null);
});
