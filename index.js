import dotenv from 'dotenv';
dotenv.config();

import { Telegraf } from 'telegraf';
import { telegrafThrottler } from 'telegraf-throttler';
import { handleUserMessage, handleTimeout, getUrls } from './_lib/index.js';
import { updateUser, canUseBot } from './_lib/db.js';
import { BOT_REPLIES, ALLOWED_UPDATES } from './_lib/config.js';

const BOT_TOKEN =
  process.env.NODE_ENV == 'development'
    ? process.env.BOT_TOKEN_DEV
    : process.env.BOT_TOKEN;

const bot = new Telegraf(BOT_TOKEN);
const throttler = telegrafThrottler();
const isPrivateChat = (ctx) => {
  return ctx.message.chat.type === 'private';
};

bot.use(throttler);

bot.start(async (ctx) => {
  return ctx.reply(BOT_REPLIES.startCommand);
});

bot.help((ctx) => {
  return ctx.replyWithMarkdown(BOT_REPLIES.helpCommand, {
    disable_web_page_preview: true,
  });
});

bot.on(ALLOWED_UPDATES, async (ctx) => {
  if (await canUseBot(ctx.from.id)) {
    const { pdf, name, message } = await handleTimeout(() =>
      handleUserMessage(ctx)
    );

    if (pdf) {
      if (message) {
        ctx.reply(message, {
          reply_to_message_id: ctx.message.message_id,
        });
      }

      ctx.replyWithChatAction('upload_document');

      await updateUser(ctx.from.id);

      console.log(`PDF was generated for message: ${getUrls(ctx.message)[0]}.`);

      return ctx.replyWithDocument(
        { source: pdf, filename: `${name}.pdf`, caption: message },
        {
          reply_to_message_id: ctx.message.message_id,
        }
      );
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

bot.catch((reason, ctx) => {
  console.error('ERROR', reason);

  if (reason.name === 'FetchError') {
    return ctx.reply("Can't generate pdf from the link 😞", {
      reply_to_message_id: ctx.message.message_id,
    });
  }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
