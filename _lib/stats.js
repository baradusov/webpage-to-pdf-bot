import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.STATS_DB_PATH || join(__dirname, '..', 'data', 'stats.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

// Храним только идентификатор чата, домен, исход и причину отказа — без
// полного адреса и без текста сообщения. Домена хватает на всю продуктовую
// статистику, а история чтения конкретного человека нам не нужна.
db.exec(`
  CREATE TABLE IF NOT EXISTS "event" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "chatId" INTEGER NOT NULL,
    "host" TEXT,
    "outcome" TEXT NOT NULL,
    "reason" TEXT,
    "ms" INTEGER,
    "createdAt" INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS "event_createdAt" ON "event"("createdAt");
  CREATE INDEX IF NOT EXISTS "event_chatId" ON "event"("chatId");
`);

// Миграций тут нет, поэтому недостающие столбцы досыпаем руками: база,
// созданная прошлой версией, иначе молча потеряет запись.
const columns = db.prepare('PRAGMA table_info("event")').all().map((c) => c.name);
for (const [name, type] of [['reason', 'TEXT'], ['ms', 'INTEGER']]) {
  if (!columns.includes(name)) {
    db.exec(`ALTER TABLE "event" ADD COLUMN "${name}" ${type}`);
  }
}

const insert = db.prepare(
  'INSERT INTO "event" ("chatId", "host", "outcome", "reason", "ms", "createdAt") VALUES (?, ?, ?, ?, ?, ?)'
);

const getHost = (url) => {
  try {
    const host = new URL(url).hostname;
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return null;
  }
};

/**
 * Учёт запроса. Никогда не бросает: статистика не должна ронять бота.
 * outcome — pdf | full | failed
 * reason  — для отказов: not_a_link, not_html, no_content или имя ошибки
 * ms      — сколько человек ждал ответа
 */
export const record = (chatId, url, outcome, reason = null, ms = null) => {
  try {
    insert.run(
      Number(chatId),
      url ? getHost(url) : null,
      outcome,
      reason,
      ms == null ? null : Math.round(ms),
      Date.now()
    );
  } catch (error) {
    console.error('stats.record error:', error.message);
  }
};

const since = (days) => Date.now() - days * 86400000;

export const summary = (days = 30) => {
  const from = since(days);
  const row = db
    .prepare(
      `SELECT COUNT(*) AS requests,
              COUNT(DISTINCT "chatId") AS users,
              SUM(CASE WHEN "outcome" = 'pdf' THEN 1 ELSE 0 END) AS pdf
       FROM "event" WHERE "createdAt" >= ?`
    )
    .get(from);

  return { requests: row.requests, users: row.users, pdf: row.pdf ?? 0 };
};

export const topUsers = (days = 30, limit = 10) =>
  db
    .prepare(
      `SELECT "chatId" AS chatId, COUNT(*) AS count
       FROM "event" WHERE "createdAt" >= ?
       GROUP BY "chatId" ORDER BY count DESC LIMIT ?`
    )
    .all(since(days), limit);

export const topHosts = (days = 30, limit = 10) =>
  db
    .prepare(
      `SELECT "host" AS host, COUNT(*) AS count
       FROM "event" WHERE "createdAt" >= ? AND "host" IS NOT NULL
       GROUP BY "host" ORDER BY count DESC LIMIT ?`
    )
    .all(since(days), limit);

/** Сколько человек ждал: медиана и девяностый процентиль по успешным ответам. */
export const timings = (days = 30) => {
  const rows = db
    .prepare(
      `SELECT "ms" AS ms FROM "event"
       WHERE "createdAt" >= ? AND "ms" IS NOT NULL AND "outcome" IN ('pdf','full')
       ORDER BY "ms"`
    )
    .all(since(days))
    .map((r) => r.ms);

  if (!rows.length) return { count: 0, median: null, p90: null, max: null };

  const at = (q) => rows[Math.min(rows.length - 1, Math.floor(rows.length * q))];

  return {
    count: rows.length,
    median: at(0.5),
    p90: at(0.9),
    max: rows[rows.length - 1],
  };
};

/** Самые медленные домены — где ждать дольше всего. */
export const slowestHosts = (days = 30, limit = 5, minSamples = 5) =>
  db
    .prepare(
      `SELECT "host" AS host, COUNT(*) AS count, CAST(AVG("ms") AS INTEGER) AS avgMs
       FROM "event"
       WHERE "createdAt" >= ? AND "ms" IS NOT NULL AND "host" IS NOT NULL
         AND "outcome" IN ('pdf','full')
       GROUP BY "host" HAVING COUNT(*) >= ?
       ORDER BY avgMs DESC LIMIT ?`
    )
    .all(since(days), minSamples, limit);

export const reasons = (days = 30) =>
  db
    .prepare(
      `SELECT "reason" AS reason, COUNT(*) AS count
       FROM "event" WHERE "createdAt" >= ? AND "reason" IS NOT NULL
       GROUP BY "reason" ORDER BY count DESC`
    )
    .all(since(days));

export const outcomes = (days = 30) =>
  db
    .prepare(
      `SELECT "outcome" AS outcome, COUNT(*) AS count
       FROM "event" WHERE "createdAt" >= ?
       GROUP BY "outcome" ORDER BY count DESC`
    )
    .all(since(days));

/** Сколько людей вернулось: активны и в этом окне, и в предыдущем такой же длины. */
export const returning = (days = 30) => {
  const now = Date.now();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count FROM (
         SELECT "chatId" FROM "event" WHERE "createdAt" >= ?
         INTERSECT
         SELECT "chatId" FROM "event" WHERE "createdAt" >= ? AND "createdAt" < ?
       )`
    )
    .get(now - days * 86400000, now - 2 * days * 86400000, now - days * 86400000);

  return row.count;
};
