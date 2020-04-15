const Telegraf = require("telegraf");
const { JSDOM } = require("jsdom");
const Readability = require("readability");
const chrome = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");

const FONTS = {
  telugu:
    "https://rawcdn.githack.com/googlefonts/noto-fonts/115d38430d957d38307457c036302b7bdbe0bbc4/unhinted/NotoSansTelugu/NotoSansTelugu-Regular.ttf",
  arabic:
    "https://rawcdn.githack.com/googlefonts/noto-fonts/115d38430d957d38307457c036302b7bdbe0bbc4/unhinted/NotoSansArabic/NotoSansArabic-Regular.ttf",
};
const PAGE_STYLE = `
  body { font-size: 2em; }
`;

const hasCaptionEntities = (message) => message.caption_entities || null;
const hasEntities = (message) => message.entities || null;

const getUrls = (message) => {
  let urls = [];

  if (hasEntities(message)) {
    const linkEntities = message.entities.filter(
      (entity) => entity.type === "url" || entity.type === "text_link"
    );

    for (const linkEntity of linkEntities) {
      if (linkEntity.type === "url") {
        urls.push(
          message.text.substring(
            linkEntity.offset,
            linkEntity.offset + linkEntity.length
          )
        );
      } else if (linkEntity.type === "text_link") {
        urls.push(linkEntity.url);
      }
    }
  }

  if (hasCaptionEntities(message)) {
    const linkCaptionEntities = message.caption_entities.filter(
      (entity) => entity.type === "url" || entity.type === "text_link"
    );

    for (const linkCaptionEntity of linkCaptionEntities) {
      if (linkCaptionEntity.type === "url") {
        urls.push(
          message.caption.substring(
            linkCaptionEntity.offset,
            linkCaptionEntity.offset + linkCaptionEntity.length
          )
        );
      } else if (linkCaptionEntity.type === "text_link") {
        urls.push(linkCaptionEntity.url);
      }
    }
  }

  return urls.length > 0 ? urls : null;
};

const getReadableContent = async (url) => {
  try {
    const doc = await JSDOM.fromURL(url);
    const reader = new Readability(doc.window.document);
    const readblePage = reader.parse();

    return readblePage;
  } catch (error) {
    if (error.name === "RequestError") {
      throw "Can't open the link 😞";
    }
  }
};

const generatePdf = async ({ title, content }) => {
  await chrome.font(FONTS.telugu);
  await chrome.font(FONTS.arabic);

  const browser = await puppeteer.launch({
    args: chrome.args,
    executablePath: await chrome.executablePath,
    headless: chrome.headless,
  });
  const page = await browser.newPage();

  await page.setContent(`
  <!doctype html>
  <html lang=en>
  <head>
  <meta charset=utf-8>
  <title>${title}</title>
  </head>
  <body>
  <h1>${title}</h1>
  ${content}
  </body>
  </html>
  `);
  await page.addStyleTag({ content: PAGE_STYLE });

  const buffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "20px",
      bottom: "20px",
      left: "20px",
      right: "20px",
    },
  });

  await browser.close();

  return {
    name: title,
    pdf: buffer,
  };
};

const getPdf = async (message) => {
  try {
    const urls = getUrls(message);
    if (!urls) {
      return {
        pdf: false,
        message: "It doesn't seem to be a link 🤔",
      };
    }

    const html = await getReadableContent(urls[0]);
    if (!html) {
      return {
        pdf: false,
        message: "Can't get the content from the link 😞",
      };
    }

    const { pdf, name } = await generatePdf(html);

    return {
      pdf,
      name,
      message: urls.length > 1 ? "One link at a time, sorry" : null,
    };
  } catch (error) {
    console.error(error);

    return {
      pdf: false,
      message: error,
    };
  }
};

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) =>
  ctx.reply("You send me a link, I'll send you a readable pdf file.")
);

bot.on("message", async (ctx) => {
  const { pdf, name, message } = await getPdf(ctx.message);

  if (pdf) {
    if (message) {
      ctx.reply(message);
    }

    return ctx.replyWithDocument({ source: pdf, filename: `${name}.pdf` });
  }

  return ctx.reply(message);
});

const test = async (ctx) => {
  const { pdf, name, message } = await getPdf(ctx.message);

  if (pdf) {
    return pdf;
  }

  return message;
};

module.exports = async (req, res) => {
  console.log(JSON.stringify(req.body, null, 2));
  await bot.handleUpdate(req.body);
  res.json({ status: 200, body: "" });

  // for local testing
  // res.setHeader("Content-Type", "application/pdf");
  // const pdf = await test(req.body);
  // res.end(pdf);
};
