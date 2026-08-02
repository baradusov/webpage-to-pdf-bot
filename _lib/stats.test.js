import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Отдельный файл на прогон: у каждого подключения к ':memory:' своя база,
// а тесту нужно смотреть в ту же, куда пишет модуль.
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
} = await import('./stats.js');

const raw = new DatabaseSync(process.env.STATS_DB_PATH);
const DAY = 86400000;

after(() => {
  raw.close();
  rmSync(dir, { recursive: true, force: true });
});

test('запрос попадает в статистику', () => {
  record(1, 'https://example.com/a', 'pdf');

  const s = summary(30);
  assert.equal(s.requests, 1);
  assert.equal(s.users, 1);
  assert.equal(s.pdf, 1);
});

test('пользователи считаются по уникальным чатам', () => {
  record(2, 'https://example.com/b', 'pdf');
  record(2, 'https://example.com/c', 'pdf');

  assert.equal(summary(30).users, 2);
});

test('домен вычленяется, www отбрасывается', () => {
  record(3, 'https://www.livelaw.in/some/article', 'pdf');

  const hosts = topHosts(30, 20).map((h) => h.host);
  assert.ok(hosts.includes('livelaw.in'));
  assert.ok(!hosts.some((h) => h.startsWith('www.')));
});

test('битая ссылка не роняет запись, домен остаётся пустым', () => {
  record(4, 'не ссылка вовсе', 'not_a_link');
  record(5, undefined, 'not_a_link');

  const hosts = topHosts(30, 50).map((h) => h.host);
  assert.ok(!hosts.includes(null));
  assert.equal(
    raw.prepare('SELECT COUNT(*) AS c FROM "event" WHERE "host" IS NULL').get().c,
    2
  );
});

test('полный адрес не сохраняется', () => {
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

test('топ пользователей отсортирован по числу запросов', () => {
  for (let i = 0; i < 7; i++) record(99, 'https://a.com/x', 'pdf');

  const top = topUsers(30, 3);
  assert.equal(top[0].chatId, 99);
  assert.equal(top[0].count, 7);
});

test('исходы разложены по видам', () => {
  record(10, 'https://b.com/x', 'failed', 'no_content');
  record(10, 'https://b.com/y', 'full');

  const map = Object.fromEntries(outcomes(30).map((o) => [o.outcome, o.count]));
  assert.ok(map.pdf > 0);
  assert.equal(map.full, 1);
  assert.ok(map.failed >= 1);
});

test('причины отказов различимы, а у успеха причины нет', () => {
  record(11, 'https://c.com/x', 'failed', 'not_html');
  record(11, 'https://c.com/y', 'failed', 'ParseError');
  record(11, 'https://c.com/z', 'pdf');

  const map = Object.fromEntries(reasons(30).map((r) => [r.reason, r.count]));
  assert.ok(map.not_html >= 1);
  assert.ok(map.ParseError >= 1);
  assert.ok(map.no_content >= 1, 'причина из соседнего теста тоже должна попасть');

  const noReason = raw
    .prepare("SELECT COUNT(*) AS c FROM \"event\" WHERE \"outcome\" = 'pdf' AND \"reason\" IS NOT NULL")
    .get().c;
  assert.equal(noReason, 0, 'у успешных запросов причины быть не должно');
});

test('окно в днях отсекает старое', () => {
  raw
    .prepare(
      'INSERT INTO "event" ("chatId","host","outcome","createdAt") VALUES (?,?,?,?)'
    )
    .run(777, 'old.com', 'pdf', Date.now() - 40 * DAY);

  const hosts = topHosts(30, 50).map((h) => h.host);
  assert.ok(!hosts.includes('old.com'), 'запись сорокадневной давности не должна попасть в окно 30 дней');
  assert.ok(topHosts(60, 50).some((h) => h.host === 'old.com'));
});

test('время ответа сохраняется и считается по процентилям', () => {
  for (const ms of [1000, 2000, 3000, 4000, 30000]) {
    record(50, 'https://slow.com/x', 'pdf', null, ms);
  }

  const t = timings(30);
  assert.ok(t.count >= 5);
  assert.ok(t.median > 0 && t.median <= t.p90, 'медиана не больше p90');
  assert.ok(t.p90 <= t.max, 'p90 не больше максимума');
  assert.equal(t.max, 30000);
});

test('медленные домены отсортированы по среднему времени', () => {
  for (let i = 0; i < 5; i++) record(51, 'https://fast.com/a', 'pdf', null, 300);

  const slow = slowestHosts(30, 5, 5).map((h) => h.host);
  assert.ok(slow.indexOf('slow.com') < slow.indexOf('fast.com'), 'медленный домен выше быстрого');
});

test('у отказов время тоже пишется, но в процентили не идёт', () => {
  const before = timings(30).count;
  record(52, 'https://x.com/a', 'failed', 'no_content', 9999);

  assert.equal(timings(30).count, before, 'в процентили попадают только успешные ответы');
  assert.equal(
    raw.prepare("SELECT \"ms\" AS ms FROM \"event\" WHERE \"chatId\" = 52").get().ms,
    9999,
    'но само значение сохранено'
  );
});

test('запись без времени не ломает статистику', () => {
  record(53, 'https://y.com/a', 'pdf');

  assert.ok(timings(30).median > 0);
});

test('вернувшимся считается тот, кто был активен в обоих окнах', () => {
  const ins = raw.prepare(
    'INSERT INTO "event" ("chatId","host","outcome","createdAt") VALUES (?,?,?,?)'
  );
  // был и в прошлом окне, и в этом
  ins.run(555, 'c.com', 'pdf', Date.now() - 40 * DAY);
  ins.run(555, 'c.com', 'pdf', Date.now() - 2 * DAY);
  // только в прошлом
  ins.run(556, 'c.com', 'pdf', Date.now() - 40 * DAY);

  const back = returning(30);
  assert.ok(back >= 1, 'пользователь 555 должен считаться вернувшимся');

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
