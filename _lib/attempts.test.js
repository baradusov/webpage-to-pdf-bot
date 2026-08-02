import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'pdfbot-attempts-'));
process.env.ATTEMPTS_DB_PATH = join(dir, 'attempts.db');

const { startAttempt, finishAttempt, pending, MAX_TRIES } =
  await import('./attempts.js');

const raw = new DatabaseSync(process.env.ATTEMPTS_DB_PATH);

after(() => {
  raw.close();
  rmSync(dir, { recursive: true, force: true });
});

test('a first sighting is served', () => {
  const r = startAttempt(1);

  assert.equal(r.tries, 1);
  assert.equal(r.giveUp, false);
});

test('an update that keeps coming back is eventually skipped', () => {
  let giveUp = false;

  for (let i = 0; i < MAX_TRIES; i++) {
    giveUp = startAttempt(2).giveUp;
    assert.equal(giveUp, false, `try ${i + 1} should still be served`);
  }

  assert.equal(startAttempt(2).giveUp, true, 'past the limit it is skipped');
});

test('a finished update leaves no trace', () => {
  startAttempt(3);
  startAttempt(3);
  finishAttempt(3);

  assert.equal(startAttempt(3).tries, 1, 'the counter starts over');
});

test('updates are counted separately', () => {
  for (let i = 0; i <= MAX_TRIES; i++) startAttempt(10);

  assert.equal(startAttempt(10).giveUp, true);
  assert.equal(startAttempt(11).giveUp, false);
});

test('the table does not grow without bound', () => {
  raw
    .prepare('INSERT INTO "attempt" ("updateId","tries","firstSeen") VALUES (?,?,?)')
    .run(999, 1, Date.now() - 2 * 86400000);

  const before = pending();
  startAttempt(1000);

  assert.ok(pending() <= before + 1, 'the day-old row is pruned');
  assert.equal(
    raw.prepare('SELECT COUNT(*) AS c FROM "attempt" WHERE "updateId" = 999').get().c,
    0
  );
});

test('state survives a restart', async () => {
  for (let i = 0; i <= MAX_TRIES; i++) startAttempt(42);

  const again = await import('./attempts.js?reload=1');

  assert.equal(again.startAttempt(42).giveUp, true, 'the count is on disk, not in memory');
});
