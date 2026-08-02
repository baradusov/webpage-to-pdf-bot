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

test('an empty database says so plainly', () => {
  const msg = buildStatsMessage(30);

  assert.equal(tables(msg).length, 0);
  assert.match(JSON.stringify(msg), /Nothing recorded/);
});

test('the message is headings and tables', () => {
  record(1, 'https://livelaw.in/a', 'pdf');
  record(1, 'https://livelaw.in/b', 'pdf');
  record(2, 'https://barandbench.com/c', 'pdf');
  record(2, 'https://instagram.com/x', 'failed', 'no_content');
  record(3, undefined, 'failed', 'not_a_link');

  const msg = buildStatsMessage(30);

  assert.ok(headings(msg).length >= 4, 'summary, people, sites, refusals');
  assert.equal(tables(msg).length, 4);
});

test('the summary carries the right numbers', () => {
  const rows = tables(buildStatsMessage(30))[0].cells;
  const map = Object.fromEntries(rows.slice(1).map((r) => [r[0].text, r[1].text]));

  assert.equal(map['Requests'], '5');
  assert.equal(map['People'], '3');
  assert.equal(map['PDFs sent'], '3');
  assert.equal(map['Success rate'], '60%');
});

test('every table has a header row', () => {
  for (const t of tables(buildStatsMessage(30))) {
    assert.ok(t.cells[0].every((c) => c.is_header === true), 'the first row is headers');
    assert.ok(t.cells.length > 1, 'and at least one data row');
  }
});

test('every cell carries the required align and valign', () => {
  for (const t of tables(buildStatsMessage(30))) {
    for (const row of t.cells) {
      for (const c of row) {
        assert.ok(['left', 'center', 'right'].includes(c.align), 'align is required');
        assert.ok(['top', 'middle', 'bottom'].includes(c.valign), 'valign is required');
        assert.equal(typeof c.text, 'string', 'cell text is a string');
      }
    }
  }
});

test('table rows are the same width', () => {
  for (const t of tables(buildStatsMessage(30))) {
    const width = t.cells[0].length;
    assert.ok(t.cells.every((r) => r.length === width), 'all rows share a width');
  }
});

test('reason codes are turned into words', () => {
  const why = tables(buildStatsMessage(30))[3].cells.slice(1).map((r) => r[0].text);

  assert.ok(why.includes('Site returned no text'));
  assert.ok(why.includes('Not a link'));
  assert.ok(!why.includes('no_content'), 'no raw codes reach the message');
});

test('the message is built from blocks, not markup', () => {
  // Cell text in blocks is literal. Switching the builder to the html or
  // markdown fields would turn a site name into a markup vector.
  const msg = buildStatsMessage(30);

  assert.equal(msg.html, undefined, 'the html field is unused');
  assert.equal(msg.markdown, undefined, 'the markdown field is unused');
  assert.ok(Array.isArray(msg.blocks));
});

test('a site name stays plain text', () => {
  record(900, 'https://ok.example.com/a', 'pdf');

  const cells = buildStatsMessage(30)
    .blocks.filter((b) => b.type === 'table')
    .flatMap((t) => t.cells.flat());

  for (const c of cells) {
    assert.equal(typeof c.text, 'string', 'a cell is always a string, never nested markup');
  }
});

test('sites are ordered by count', () => {
  const rows = tables(buildStatsMessage(30))[2].cells.slice(1);
  const counts = rows.map((r) => Number(r[1].text));

  assert.deepEqual(counts, [...counts].sort((a, b) => b - a));
});
