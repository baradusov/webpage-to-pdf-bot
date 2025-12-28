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
  'message:forward_date',
];

export const PAGE_STYLE = `
  body { font-size: 2em; }
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
You can read all about the new updates in the bot's news channnel @baradusov_support.

<b>Contacts</b>
If you have any questions, suggestions, comments or something not working, feel free to message @baradusov.

<b>Commands</b>
/help — shows this message`,
  limit:
    'The bot is disabled indefinitely. Check out @baradusov_support for more info.',
};
