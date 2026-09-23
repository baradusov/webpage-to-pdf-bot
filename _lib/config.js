export const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS, 10) || 15000;

export const ALLOWED_UPDATES = [
  'message:text',
  'message:audio',
  'message:dice',
  'message:document',
  'message:photo',
  'message:sticker',
  'message:video',
  'message:voice',
  'message:contact',
  'message:location',
  'message:venue',
  'message:forward_origin',
];

export const PAGE_STYLE = `
  /* Named per script: DejaVu carries Arabic glyphs and so wins fontconfig's
     default before Noto is ever reached, which prints Naskh text as sans. */
  body {
    font-size: 2em;
    font-family: 'Liberation Serif', 'Noto Naskh Arabic', 'Noto Serif Telugu', serif;
  }
  pre { padding: 20px; background-color: linen; }
  code { font-family: monospace; }
  img { max-width: 100%; height: auto; }
  footer { margin-top: 20px; }
`;

export const BOT_REPLIES = {
  startCommand: 'Send me a link. I send back a PDF you can read.\nMore in /help.',
  helpCommand: `
<b>Webpage to PDF bot</b>

Send a link — I send back a PDF.
You can also send a saved <b>.html</b> or <b>.txt</b> file.

I work with text. Videos and photo feeds will not work.

<b>News</b> @unary_bots
<b>Questions</b> @baradusov

/help — this message`,
  limit: 'The bot is off for now. News: @unary_bots',
  working: '⏳ Making your PDF…',
  notCleaned: 'No article found here, so this is the whole page.',
  pastedHtml: "That's HTML code 🙂 Telegram cuts long messages.\nSave it as a .html file and send me the file.",
  alreadyPdf: "That's already a PDF 🙂\nSend me a link to a web page.",
  gaveUp: 'This link keeps breaking me, so I skip it 🙅 Sorry.',
  tooFast: 'Too many links at once 😅 I do one at a time.\nWait a minute and send them again.',
};
