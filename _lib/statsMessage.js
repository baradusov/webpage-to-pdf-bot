import {
  summary,
  topUsers,
  topHosts,
  reasons,
  outcomes,
  returning,
  timings,
  slowestHosts,
} from './stats.js';

const REASON_LABELS = {
  not_a_link: 'Это не ссылка',
  not_html: 'Не веб-страница',
  no_content: 'Сайт не отдал текст',
  ParseError: 'Не разобрали вёрстку',
  NetworkError: 'Сеть не ответила',
  TimeoutError: 'Слишком долго',
  BrowserError: 'Ошибка браузера',
  CancelledError: 'Отменено',
  unknown: 'Прочее',
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

const num = (n) => Number(n || 0).toLocaleString('ru-RU');

const secs = (ms) => (ms == null ? '—' : (ms / 1000).toFixed(1) + ' с');

/** Собирает блоки rich-сообщения со статистикой за period дней. */
export const buildStatsMessage = (period = 30) => {
  const s = summary(period);
  const back = returning(period);
  const rate = s.requests ? Math.round((s.pdf / s.requests) * 100) : 0;
  const perUser = s.users ? (s.requests / s.users).toFixed(1) : '0';
  const full = outcomes(period).find((o) => o.outcome === 'full')?.count || 0;

  const blocks = [
    heading(`Статистика · ${period} дней`),
    table(
      ['Показатель', 'Значение'],
      [
        ['Запросов', num(s.requests)],
        ['Пользователей', num(s.users)],
        ['Запросов на человека', perUser],
        ['PDF отправлено', num(s.pdf)],
        ['Доля успеха', rate + '%'],
        ['Вернулись с прошлого периода', num(back)],
        ['Вызовов /full', num(full)],
      ]
    ),
  ];

  const t = timings(period);
  if (t.count) {
    blocks.push(heading('Сколько ждут ответа'));
    blocks.push(
      table(
        ['Показатель', 'Время'],
        [
          ['Половина укладывается в', secs(t.median)],
          ['Девять из десяти в', secs(t.p90)],
          ['Самый долгий', secs(t.max)],
        ]
      )
    );

    const slow = slowestHosts(period, 5);
    if (slow.length) {
      blocks.push(
        table(
          ['Самые медленные домены', 'В среднем'],
          slow.map((h) => [h.host, secs(h.avgMs)])
        )
      );
    }
  }

  const users = topUsers(period, 10);
  if (users.length) {
    blocks.push(heading('Кто чаще всех'));
    blocks.push(
      table(
        ['Чат', 'Запросов'],
        users.map((u) => [String(u.chatId), num(u.count)])
      )
    );
  }

  const hosts = topHosts(period, 10);
  if (hosts.length) {
    blocks.push(heading('Откуда ссылки'));
    blocks.push(
      table(
        ['Домен', 'Запросов'],
        hosts.map((h) => [h.host, num(h.count)])
      )
    );
  }

  const why = reasons(period);
  if (why.length) {
    blocks.push(heading('Почему не получилось'));
    blocks.push(
      table(
        ['Причина', 'Случаев'],
        why.map((r) => [REASON_LABELS[r.reason] || r.reason, num(r.count)])
      )
    );
  }

  if (!s.requests) {
    return {
      blocks: [
        heading('Статистика'),
        {
          type: 'paragraph',
          text: `За последние ${period} дней записей нет. Учёт начинается с версии 0.29.0.`,
        },
      ],
    };
  }

  return { blocks };
};
