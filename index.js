import dotenv from 'dotenv';
dotenv.config();

import { Bot, InputFile } from 'grammy';
import { apiThrottler } from '@grammyjs/transformer-throttler';
import { handleUserMessage, handleTimeout, getUrls } from './_lib/index.js';
import { BOT_REPLIES, ALLOWED_UPDATES } from './_lib/config.js';
import { generateScreenshot } from './_lib/generateScreenshot.js';

const BOT_TOKEN =
  process.env.NODE_ENV == 'development'
    ? process.env.BOT_TOKEN_DEV
    : process.env.BOT_TOKEN;

const bot = new Bot(BOT_TOKEN);
const throttler = apiThrottler();
const isPrivateChat = (ctx) => {
  return ctx.message.chat.type === 'private';
};

bot.api.config.use(throttler);

bot.command('start', (ctx) => {
  return ctx.reply(BOT_REPLIES.startCommand);
});

bot.command('help', (ctx) => {
  return ctx.reply(BOT_REPLIES.helpCommand, {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
});

bot.command('full', async (ctx) => {
  const urls = getUrls(ctx.message);

  if (urls) {
    const firstUrl = urls[0];
    const url = !firstUrl.includes('://') ? `http://${firstUrl}` : firstUrl;

    console.log(`Starting to screenshot: ${url}.`);

    const data = await handleTimeout(() => generateScreenshot(url));

    if (data.error) {
      return ctx.reply(data.message, {
        reply_to_message_id: ctx.message.message_id,
      });
    }

    console.log(`Screenshot was made for url: ${url}.`);

    return ctx.replyWithDocument(
      new InputFile(data.screenshot, `${data.name.trim()}.pdf`),
      {
        reply_to_message_id: ctx.message.message_id,
      }
    );
  }

  return ctx.reply('No url provided.');
});

bot.on(ALLOWED_UPDATES, async (ctx) => {
  if (process.env.BOT_STATUS !== 'disabled') {
    const { pdf, name, message } = await handleTimeout(() =>
      handleUserMessage(ctx)
    );

    if (pdf) {
      if (message) {
        ctx.reply(message, {
          reply_to_message_id: ctx.message.message_id,
        });
      }

      await ctx.replyWithChatAction('upload_document');

      console.log(`PDF was generated for message: ${getUrls(ctx.message)[0]}.`);

      return ctx.replyWithDocument(new InputFile(pdf, `${name.trim()}.pdf`), {
        reply_to_message_id: ctx.message.message_id,
      });
    }

    if (isPrivateChat(ctx)) {
      if (message.includes('goes wrong')) {
        console.log('Bot is down. Last message was:', ctx.message.text);
        ctx.telegram.sendMessage(86907467, "Check me, maybe I'm down.");
      }

      console.log(
        `No pdf generated for: ${ctx.message.text}. Reason: ${message}`
      );

      return ctx.reply(message, {
        reply_to_message_id: ctx.message.message_id,
      });
    }

    return ctx;
  }

  return ctx.reply(BOT_REPLIES.limit);
});

bot.catch((reason) => {
  const { error, ctx } = reason;

  // Forbidden: bot was blocked by the user
  if (error.error_code === 403) {
    return console.error(error.description);
  }

  // Bad Request: replied message not found
  if (error.error_code === 400) {
    return console.error(error.description);
  }

  if (reason.name === 'FetchError') {
    return ctx.reply("Can't generate pdf from the link 😞", {
      reply_to_message_id: ctx.message.message_id,
    });
  }

  console.error('ERROR', error);

  return ctx.reply('Something goes wrong 😞');
});

bot.start();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
