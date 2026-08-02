import {
  summary,
  topUsers,
  topHosts,
  reasons,
  outcomes,
  returning,
  timings,
  slowestHosts,
  queueTimings,
} from './stats.js';

const REASON_LABELS = {
  not_a_link: 'Not a link',
  not_html: 'Not a web page',
  no_content: 'Site returned no text',
  never_articles: 'Site never yields an article',
  private_address: 'Address not on the internet',
  bad_scheme: 'Unsupported scheme',
  bad_url: 'Malformed address',
  dns_failed: 'Site not found',
  rate_limited: 'Sent too fast',
  poison_update: 'Kept breaking the bot, skipped',
  TooLargeError: 'Page too big to read',
  ParseError: 'Could not parse the page',
  NetworkError: 'Network did not answer',
  TimeoutError: 'Took too long',
  BrowserError: 'Browser error',
  CancelledError: 'Cancelled',
  unknown: 'Other',
};

const cell = (text, { header = false, align = 'left' } = {}) => {
  const c = { text: String(text), align, valign: 'middle' };
  if (header) c.is_header = true;
  return c;
};

const table = (head, rows) => ({
  type: 'table',
  is_bordered: true,
  is_striped: true,
  cells: [
    head.map((h, i) => cell(h, { header: true, align: i ? 'right' : 'left' })),
    ...rows.map((r) => r.map((v, i) => cell(v, { align: i ? 'right' : 'left' }))),
  ],
});

const heading = (text) => ({ type: 'heading', text, size: 3 });

const num = (n) => Number(n || 0).toLocaleString('en-US');

const secs = (ms) => (ms == null ? '—' : (ms / 1000).toFixed(1) + 's');

export const buildStatsMessage = (period = 30) => {
  const s = summary(period);

  if (!s.requests) {
    return {
      blocks: [
        heading('Statistics'),
        {
          type: 'paragraph',
          text: `Nothing recorded in the last ${period} days. Tracking starts with 0.29.0.`,
        },
      ],
    };
  }

  const rate = Math.round((s.pdf / s.requests) * 100);
  const perUser = s.users ? (s.requests / s.users).toFixed(1) : '0';
  const full = outcomes(period).find((o) => o.outcome === 'full')?.count || 0;

  const blocks = [
    heading(`Statistics · ${period} days`),
    table(
      ['Measure', 'Value'],
      [
        ['Requests', num(s.requests)],
        ['People', num(s.users)],
        ['Requests per person', perUser],
        ['PDFs sent', num(s.pdf)],
        ['Success rate', rate + '%'],
        ['Returning from last period', num(returning(period))],
        ['/full calls', num(full)],
      ]
    ),
  ];

  const t = timings(period);
  if (t.count) {
    blocks.push(heading('How long it takes'));
    blocks.push(
      table(
        ['Measure', 'Time'],
        [
          ['Half finish within', secs(t.median)],
          ['Nine in ten within', secs(t.p90)],
          ['Longest', secs(t.max)],
        ]
      )
    );

    const q = queueTimings(period);
    if (q.count) {
      blocks.push(
        table(
          ['Waiting in the queue', 'Time'],
          [
            ['Half', secs(q.median)],
            ['Nine in ten', secs(q.p90)],
            ['Worst percent', secs(q.p99)],
            ['Longest', secs(q.max)],
          ]
        )
      );
    }

    const slow = slowestHosts(period, 5);
    if (slow.length) {
      blocks.push(
        table(
          ['Slowest sites', 'Average'],
          slow.map((h) => [h.host, secs(h.avgMs)])
        )
      );
    }
  }

  const users = topUsers(period, 10);
  if (users.length) {
    blocks.push(heading('Who sends most'));
    blocks.push(
      table(
        ['Chat', 'Requests'],
        users.map((u) => [String(u.chatId), num(u.count)])
      )
    );
  }

  const hosts = topHosts(period, 10);
  if (hosts.length) {
    blocks.push(heading('Where links come from'));
    blocks.push(
      table(
        ['Site', 'Requests'],
        hosts.map((h) => [h.host, num(h.count)])
      )
    );
  }

  const why = reasons(period);
  if (why.length) {
    blocks.push(heading('Why it did not work'));
    blocks.push(
      table(
        ['Reason', 'Cases'],
        why.map((r) => [REASON_LABELS[r.reason] || r.reason, num(r.count)])
      )
    );
  }

  return { blocks };
};
