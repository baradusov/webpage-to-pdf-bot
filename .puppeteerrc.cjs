// The bot launches with `headless: true`, which since puppeteer 22 means the
// full Chrome binary. chrome-headless-shell is never used, so skip its
// download — it is another 262 MB pulled on every `npm ci`.
module.exports = {
  'chrome-headless-shell': { skipDownload: true },
};
