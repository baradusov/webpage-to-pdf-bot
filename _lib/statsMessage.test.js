import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'pdfbot-msg-'));
process.env.STATS_DB_PATH = join(dir, 'stats.db');

const { record } = await import('./stats.js');
const { buildStatsMessage } = await import('./statsMessage.js');

after(() => rmSync(dir, { recursive: true, force: true }));

const tables = (msg) => msg.blocks.filter((b) => b.type === 'table');
const headings = (msg) => msg.blocks.filter((b) => b.type === 'heading');

test('на пустой базе сообщение объясняет, что данных нет', () => {
  const msg = buildStatsMessage(30);

  assert.equal(tables(msg).length, 0);
  assert.match(JSON.stringify(msg), /записей нет/);
});

test('сообщение состоит из заголовков и таблиц', () => {
  record(1, 'https://livelaw.in/a', 'pdf');
  record(1, 'https://livelaw.in/b', 'pdf');
  record(2, 'https://barandbench.com/c', 'pdf');
  record(2, 'https://instagram.com/x', 'failed', 'no_content');
  record(3, undefined, 'failed', 'not_a_link');

  const msg = buildStatsMessage(30);

  assert.ok(headings(msg).length >= 4, 'сводка, люди, домены, отказы');
  assert.equal(tables(msg).length, 4);
});

test('в сводке верные числа', () => {
  const rows = tables(buildStatsMessage(30))[0].cells;
  const map = Object.fromEntries(rows.slice(1).map((r) => [r[0].text, r[1].text]));

  assert.equal(map['Запросов'], '5');
  assert.equal(map['Пользователей'], '3');
  assert.equal(map['PDF отправлено'], '3');
  assert.equal(map['Доля успеха'], '60%');
});

test('у каждой таблицы есть строка заголовков', () => {
  for (const t of tables(buildStatsMessage(30))) {
    assert.ok(t.cells[0].every((c) => c.is_header === true), 'первая строка — заголовки');
    assert.ok(t.cells.length > 1, 'и хотя бы одна строка данных');
  }
});

test('каждая ячейка несёт обязательные align и valign', () => {
  for (const t of tables(buildStatsMessage(30))) {
    for (const row of t.cells) {
      for (const c of row) {
        assert.ok(['left', 'center', 'right'].includes(c.align), 'align обязателен');
        assert.ok(['top', 'middle', 'bottom'].includes(c.valign), 'valign обязателен');
        assert.equal(typeof c.text, 'string', 'текст ячейки — строка');
      }
    }
  }
});

test('строки таблиц одной ширины', () => {
  for (const t of tables(buildStatsMessage(30))) {
    const width = t.cells[0].length;
    assert.ok(t.cells.every((r) => r.length === width), 'все строки одной ширины');
  }
});

test('коды причин переведены на человеческий', () => {
  const why = tables(buildStatsMessage(30))[3].cells.slice(1).map((r) => r[0].text);

  assert.ok(why.includes('Сайт не отдал текст'));
  assert.ok(why.includes('Это не ссылка'));
  assert.ok(!why.includes('no_content'), 'сырых кодов в сообщении быть не должно');
});

test('сообщение собирается блоками, а не разметкой', () => {
  // В блоках текст ячеек трактуется буквально. Если кто-то переведёт сборку
  // на поля html или markdown, чужой домен станет вектором для разметки.
  const msg = buildStatsMessage(30);

  assert.equal(msg.html, undefined, 'html-поле не используется');
  assert.equal(msg.markdown, undefined, 'markdown-поле не используется');
  assert.ok(Array.isArray(msg.blocks));
});

test('домен с разметкой остаётся обычным текстом', () => {
  record(900, 'https://ok.example.com/a', 'pdf');

  const cells = buildStatsMessage(30)
    .blocks.filter((b) => b.type === 'table')
    .flatMap((t) => t.cells.flat());

  for (const c of cells) {
    assert.equal(typeof c.text, 'string', 'ячейка всегда строка, а не вложенная разметка');
  }
});

test('домены отсортированы по убыванию', () => {
  const rows = tables(buildStatsMessage(30))[2].cells.slice(1);
  const counts = rows.map((r) => Number(r[1].text));

  assert.deepEqual(counts, [...counts].sort((a, b) => b - a));
});
