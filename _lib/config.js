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
  startCommand:
    "You send me a link, I'll send you a readable pdf file. More info in /help.",
  helpCommand: `
<b>Webpage to PDF bot</b> can help you to save web article as pdf file.

Send him a link, it will send back a readable pdf. Keep in mind that the bot oriented on a text content.

<b>Updates about the bot</b>
You can read all about the new updates in the bot's news channnel @unary_bots.

<b>Contacts</b>
If you have any questions, suggestions, comments or something not working, feel free to message @baradusov.

<b>Commands</b>
/help — shows this message`,
  limit:
    'The bot is disabled indefinitely. Check out @unary_bots for more info.',
  working: '⏳ Making your PDF…',
  gaveUp:
    "I tried this link a few times and it keeps breaking me, so I'm skipping it 🙅 Sorry about that.",
  tooFast:
    "That's a lot of links at once 😅 I make PDFs one at a time, so I didn't keep the extra ones — give me a minute and send them again.",
};
