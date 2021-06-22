import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { Telegraf } from 'telegraf';
import { telegrafThrottler } from 'telegraf-throttler';
import order from './routes/order.js';
import { handleUserMessage, handleTimeout } from './_lib/index.js';
import { updateUser, canUseBot } from './_lib/db.js';
import { BOT_REPLIES, ALLOWED_UPDATES } from './_lib/config.js';

const BOT_TOKEN =
  process.env.NODE_ENV == 'development'
    ? process.env.BOT_TOKEN_DEV
    : process.env.BOT_TOKEN;

const bot = new Telegraf(BOT_TOKEN);
const throttler = telegrafThrottler();

bot.use(throttler);

bot.start(async (ctx) => {
  return ctx.reply(BOT_REPLIES.startCommand);
});

bot.help((ctx) => {
  return ctx.replyWithMarkdown(BOT_REPLIES.helpCommand, {
    disable_web_page_preview: true,
  });
});

bot.command('support', async (ctx) => {
  return ctx.replyWithMarkdown(BOT_REPLIES.supportCommand(ctx.chat.id), {
    disable_web_page_preview: true,
  });
});

bot.on(ALLOWED_UPDATES, async (ctx) => {
  if (await canUseBot(ctx.chat.id)) {
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

      await updateUser(ctx.chat.id);

      console.log(`PDF was generated for ${ctx.message.text} and sended to user.`);

      return ctx.replyWithDocument(
        { source: pdf, filename: `${name}.pdf`, caption: message },
        {
          reply_to_message_id: ctx.message.message_id,
        }
      );
    }

    if (message.includes('goes wrong')) {
      console.log('Bot is down. Last message was:', ctx.message.text);
      ctx.telegram.sendMessage(86907467, "Check me, maybe I'm down.");
    }

    console.log(`No pdf generated for: ${ctx.message.text}. Reason: ${message}`);

    return ctx.reply(message, {
      reply_to_message_id: ctx.message.message_id,
    });
  }

  return ctx.reply(BOT_REPLIES.limit);
});

bot.catch((reason) => {
  console.error(reason);
});

const expressApp = express();
const bodyParser = express.urlencoded({ extended: true });
expressApp.use(bot.webhookCallback('/api'));

expressApp.get('/', (req, res) => {
  res.status(200).send('ok');
});

expressApp.all('/api', (req, res) => {
  res.status(200).send('ok');
});

expressApp.post('/order', bodyParser, order);

expressApp.listen(3333, () => {
  console.log('Bot listening on port 3333!');
});
