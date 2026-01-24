import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { Bot, InputFile } from 'grammy';
import { apiThrottler } from '@grammyjs/transformer-throttler';
import { handleUserMessage, handleTimeout, getUrls, getUserMessage } from './_lib/index.js';
import { BOT_REPLIES, ALLOWED_UPDATES, TIMEOUT_MS } from './_lib/config.js';
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

    const data = await handleTimeout((signal) => generateScreenshot(url, signal), TIMEOUT_MS);

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
    const { pdf, name, message, errorType } = await handleTimeout(
      (signal) => handleUserMessage(ctx, signal),
      TIMEOUT_MS
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
      if (errorType === 'BrowserError' && process.env.ADMIN_CHAT_ID) {
        console.error('Browser error - notifying admin:', ctx.message.text);
        bot.api.sendMessage(process.env.ADMIN_CHAT_ID, `Bot may be having issues.\nError: ${errorType}\nURL: ${ctx.message.text}`);
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

bot.catch(async (reason) => {
  const { error, ctx } = reason;

  // Forbidden: bot was blocked by the user
  if (error.error_code === 403) {
    return console.error('Bot blocked by user:', error.description);
  }

  // Bad Request: replied message not found
  if (error.error_code === 400) {
    return console.error('Bad request:', error.description);
  }

  // Request Entity Too Large: PDF file is too big for Telegram
  if (error.error_code === 413) {
    console.error('File too large:', error.description);
    try {
      return await ctx.reply('The PDF file is too large to send (max 50 MB). Try a shorter article.', {
        reply_to_message_id: ctx.message?.message_id,
      });
    } catch (replyError) {
      return console.error('Failed to send error message:', replyError.message);
    }
  }

  console.error('Unhandled error:', error.name, error.message);

  const userMessage = getUserMessage(error);
  try {
    return await ctx.reply(userMessage, {
      reply_to_message_id: ctx.message?.message_id,
    });
  } catch (replyError) {
    console.error('Failed to send error message:', replyError.message);
  }
});

bot.start();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
