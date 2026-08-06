// The bot launches with `headless: 'shell'`, so chrome-headless-shell is the
// only binary it runs — skip full Chrome, another ~350 MB on every `npm ci`.
module.exports = {
  chrome: { skipDownload: true },
};
