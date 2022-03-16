export const ALLOWED_UPDATES = [
  'text',
  'audio',
  'dice',
  'document',
  'photo',
  'sticker',
  'video',
  'voice',
  'contact',
  'location',
  'venue',
  'forward',
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
*Webpage to PDF bot* can help you to save web article as pdf file.

Send him a link, it will send back a readable pdf. Keep in mind that the bot oriented on a text content.

*Updates about the bot*
You can read all about the new updates in the bot's news channnel [@baradusov\_support](https://t.me/baradusov\_support).

*Contacts*
If you have any questions, suggestions, comments or something not working, feel free to message @baradusov.

*Commands*
/help — shows this message`,
  limit:
    "For some reason you can't use the bot. Message @baradusov for more info.",
};
