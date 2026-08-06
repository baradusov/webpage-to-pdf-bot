import puppeteer from 'puppeteer';

// chrome-headless-shell rather than full Chrome: the PDF path only calls
// setContent() and pdf(), so nothing here needs the features the full binary
// carries. See .puppeteerrc.cjs, which skips the other download.
const LAUNCH_OPTIONS = {
  headless: 'shell',
  args: ['--no-sandbox'],
  handleSIGTERM: true,
  handleSIGINT: true,
};

// The instance is kept between requests, so it is worth handing the memory
// back when nobody is sending links.
const IDLE_MS = Number(process.env.BROWSER_IDLE_MS) || 300000;

let browserPromise = null;
let idleTimer = null;
let openPages = 0;

const launch = async () => puppeteer.launch(LAUNCH_OPTIONS);

const clearIdleTimer = () => {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
};

const scheduleIdleClose = () => {
  clearIdleTimer();

  if (IDLE_MS <= 0) return;

  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (openPages === 0) closeBrowser();
  }, IDLE_MS);

  // A pending close must not be the reason the process stays alive.
  idleTimer.unref?.();
};

const acquire = async () => {
  // Two passes: a browser that died while idle leaves a resolved promise
  // behind, and that is only noticed here.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!browserPromise) {
      browserPromise = launch();
    }

    let browser;

    try {
      browser = await browserPromise;
    } catch (error) {
      browserPromise = null;
      throw error;
    }

    if (browser.connected) return browser;

    browserPromise = null;
  }

  throw new Error('Browser kept disconnecting on launch');
};

export const withPage = async (fn) => {
  clearIdleTimer();

  const browser = await acquire();

  openPages += 1;
  let page = null;

  try {
    page = await browser.newPage();

    return await fn(page);
  } finally {
    openPages -= 1;

    if (page) {
      await page.close().catch(() => {});
    }

    if (openPages === 0) scheduleIdleClose();
  }
};

export const closeBrowser = async () => {
  clearIdleTimer();

  const pending = browserPromise;
  browserPromise = null;

  if (!pending) return;

  await pending.then((browser) => browser.close()).catch(() => {});
};
