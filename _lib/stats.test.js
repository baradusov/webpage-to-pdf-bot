import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'pdfbot-stats-'));
process.env.STATS_DB_PATH = join(dir, 'stats.db');

const {
  record,
  summary,
  topUsers,
  topHosts,
  outcomes,
  reasons,
  returning,
  timings,
  slowestHosts,
  queueTimings,
} = await import('./stats.js');

const raw = new DatabaseSync(process.env.STATS_DB_PATH);
const DAY = 86400000;

after(() => {
  raw.close();
  rmSync(dir, { recursive: true, force: true });
});

test('a handled request is recorded', () => {
  record(1, 'https://example.com/a', 'pdf');

  const s = summary(30);
  assert.equal(s.requests, 1);
  assert.equal(s.users, 1);
  assert.equal(s.pdf, 1);
});

test('users are counted by distinct chat', () => {
  record(2, 'https://example.com/b', 'pdf');
  record(2, 'https://example.com/c', 'pdf');

  assert.equal(summary(30).users, 2);
});

test('the domain is extracted and www dropped', () => {
  record(3, 'https://www.livelaw.in/some/article', 'pdf');

  const hosts = topHosts(30, 20).map((h) => h.host);
  assert.ok(hosts.includes('livelaw.in'));
  assert.ok(!hosts.some((h) => h.startsWith('www.')));
});

test('a broken link records with no domain instead of throwing', () => {
  record(4, 'not a link at all', 'not_a_link');
  record(5, undefined, 'not_a_link');

  const hosts = topHosts(30, 50).map((h) => h.host);
  assert.ok(!hosts.includes(null));
  assert.equal(
    raw.prepare('SELECT COUNT(*) AS c FROM "event" WHERE "host" IS NULL').get().c,
    2
  );
});

test('the full address is not stored', () => {
  record(6, 'https://example.com/secret/path?token=abc', 'pdf');

  const stored = raw
    .prepare('SELECT "host" AS h FROM "event" WHERE "chatId" = 6')
    .get().h;

  assert.equal(stored, 'example.com');
  assert.equal(
    raw.prepare("SELECT COUNT(*) AS c FROM \"event\" WHERE \"host\" LIKE '%secret%'").get().c,
    0
  );
});

test('top users are ordered by request count', () => {
  for (let i = 0; i < 7; i++) record(99, 'https://a.com/x', 'pdf');

  const top = topUsers(30, 3);
  assert.equal(top[0].chatId, 99);
  assert.equal(top[0].count, 7);
});

test('outcomes are broken down by kind', () => {
  record(10, 'https://b.com/x', 'failed', 'no_content');
  record(10, 'https://b.com/y', 'full');

  const map = Object.fromEntries(outcomes(30).map((o) => [o.outcome, o.count]));
  assert.ok(map.pdf > 0);
  assert.equal(map.full, 1);
  assert.ok(map.failed >= 1);
});

test('refusal reasons are distinct and success carries none', () => {
  record(11, 'https://c.com/x', 'failed', 'not_html');
  record(11, 'https://c.com/y', 'failed', 'ParseError');
  record(11, 'https://c.com/z', 'pdf');

  const map = Object.fromEntries(reasons(30).map((r) => [r.reason, r.count]));
  assert.ok(map.not_html >= 1);
  assert.ok(map.ParseError >= 1);
  assert.ok(map.no_content >= 1, 'a reason from the neighbouring test counts too');

  const noReason = raw
    .prepare("SELECT COUNT(*) AS c FROM \"event\" WHERE \"outcome\" = 'pdf' AND \"reason\" IS NOT NULL")
    .get().c;
  assert.equal(noReason, 0, 'successful requests carry no reason');
});

test('the day window excludes older rows', () => {
  raw
    .prepare(
      'INSERT INTO "event" ("chatId","host","outcome","createdAt") VALUES (?,?,?,?)'
    )
    .run(777, 'old.com', 'pdf', Date.now() - 40 * DAY);

  const hosts = topHosts(30, 50).map((h) => h.host);
  assert.ok(!hosts.includes('old.com'), 'a 40-day-old row is outside a 30-day window');
  assert.ok(topHosts(60, 50).some((h) => h.host === 'old.com'));
});

test('work time is stored and reported as percentiles', () => {
  for (const ms of [1000, 2000, 3000, 4000, 30000]) {
    record(50, 'https://slow.com/x', 'pdf', null, ms);
  }

  const t = timings(30);
  assert.ok(t.count >= 5);
  assert.ok(t.median > 0 && t.median <= t.p90, 'median is not above p90');
  assert.ok(t.p90 <= t.max, 'p90 is not above the maximum');
  assert.equal(t.max, 30000);
});

test('slow domains are ordered by average time', () => {
  for (let i = 0; i < 5; i++) record(51, 'https://fast.com/a', 'pdf', null, 300);

  const slow = slowestHosts(30, 5, 5).map((h) => h.host);
  assert.ok(slow.indexOf('slow.com') < slow.indexOf('fast.com'), 'the slow domain ranks above the fast one');
});

test('refusals store time but stay out of the percentiles', () => {
  const before = timings(30).count;
  record(52, 'https://x.com/a', 'failed', 'no_content', 9999);

  assert.equal(timings(30).count, before, 'only successful work reaches the percentiles');
  assert.equal(
    raw.prepare("SELECT \"ms\" AS ms FROM \"event\" WHERE \"chatId\" = 52").get().ms,
    9999,
    'but the value itself is stored'
  );
});

test('queue time is counted separately from work time', () => {
  record(60, 'https://q.com/a', 'pdf', null, 3000, 0);
  record(60, 'https://q.com/b', 'pdf', null, 3000, 12000);
  record(60, 'https://q.com/c', 'pdf', null, 3000, 60000);

  const q = queueTimings(30);
  assert.equal(q.count, 3, 'only rows carrying queueMs count');
  assert.equal(q.max, 60000);

  assert.notEqual(timings(30).max, q.max);
});

test('queue time is skipped when there is nothing to measure', () => {
  const before = queueTimings(30).count;
  record(61, 'https://q.com/d', 'pdf', null, 3000);

  assert.equal(queueTimings(30).count, before, 'a row without queueMs is skipped');
});

test('a row without timing does not break the stats', () => {
  record(53, 'https://y.com/a', 'pdf');

  assert.ok(timings(30).median > 0);
});

test('returning means active in both windows', () => {
  const ins = raw.prepare(
    'INSERT INTO "event" ("chatId","host","outcome","createdAt") VALUES (?,?,?,?)'
  );
  ins.run(555, 'c.com', 'pdf', Date.now() - 40 * DAY);
  ins.run(555, 'c.com', 'pdf', Date.now() - 2 * DAY);
  ins.run(556, 'c.com', 'pdf', Date.now() - 40 * DAY);

  const back = returning(30);
  assert.ok(back >= 1, 'chat 555 counts as returning');

  const ids = raw
    .prepare(
      `SELECT "chatId" AS id FROM "event" WHERE "createdAt" >= ?
       INTERSECT
       SELECT "chatId" FROM "event" WHERE "createdAt" >= ? AND "createdAt" < ?`
    )
    .all(Date.now() - 30 * DAY, Date.now() - 60 * DAY, Date.now() - 30 * DAY)
    .map((r) => r.id);

  assert.ok(ids.includes(555));
  assert.ok(!ids.includes(556));
});
