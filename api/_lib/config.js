const FONTS = {
  telugu:
    'https://rawcdn.githack.com/googlefonts/noto-fonts/115d38430d957d38307457c036302b7bdbe0bbc4/unhinted/NotoSansTelugu/NotoSansTelugu-Regular.ttf',
  arabic:
    'https://rawcdn.githack.com/googlefonts/noto-fonts/115d38430d957d38307457c036302b7bdbe0bbc4/unhinted/NotoSansArabic/NotoSansArabic-Regular.ttf',
  hindi:
    'https://rawcdn.githack.com/googlefonts/noto-fonts/0723a5939124d6be880d5b8eb4666761bab4235e/unhinted/NotoSerifDevanagari/NotoSerifDevanagari-Regular.ttf',
};

const PAGE_STYLE = `
  body { font-size: 2em; }
  pre { padding: 20px; background-color: linen; }
  code { font-family: monospace; }
  img { max-width: 100%; }
`;

const BOT_REPLIES = {
  helpCommand: `
*Webpage to PDF bot* can help you to save web article as pdf file.

Send him a link, it will send back a readable pdf.

*Limits*
You have limit in 50 PDFs per day.
This limitation resets every day at 00:00 GMT+0. You can see how many PDFs you can generate today in /limits.
Reasons why this limitation exists explained in bot's news channel [@baradusov\_support](https://t.me/baradusov\_support/1).

*Updates about bot*
You can read all about the new updates in the bot's news channnel [@baradusov\_support](https://t.me/baradusov\_support).

*Contacts*
If you have any questions, suggestions, comments or something not working, feel free to message @baradusov.

*Commands*
/help — shows this message
/limits — shows your limits`,
  limitsCommand: ({ total, free, paid }) => {
    return `You have left *${total}* PDFs today.\n*${free}* free and *${paid}* paid ones.\n\nThe limitation is *50* free PDFs per day.\nMore info in /help.`;
  },
  limit:
    "You've reached your limit for today. More information about the limitation in /help.",
};

module.exports = {
  FONTS,
  PAGE_STYLE,
  BOT_REPLIES,
};
