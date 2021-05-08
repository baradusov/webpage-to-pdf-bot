require('dotenv').config();

const express = require('express');
const Telegraf = require('telegraf');
const Extra = require('telegraf/extra');
const order = require('./routes/order');
const { handleUserMessage, handleTimeout } = require('./_lib');
const { updateUser, canUseBot } = require('./_lib/db');
const { BOT_REPLIES, ALLOWED_UPDATES } = require('./_lib/config');

const BOT_TOKEN =
  process.env.NODE_ENV == 'development'
    ? process.env.BOT_TOKEN_DEV
    : process.env.BOT_TOKEN;

const bot = new Telegraf(BOT_TOKEN);

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
        ctx.reply(message, Extra.inReplyTo(ctx.message.message_id));
      }

      ctx.replyWithChatAction('upload_document');

      await updateUser(ctx.chat.id);

      console.log('Sending pdf for update:', ctx.message);

      return ctx.replyWithDocument(
        { source: pdf, filename: `${name}.pdf`, caption: message },
        Extra.inReplyTo(ctx.message.message_id)
      );
    }

    if (message.includes('goes wrong')) {
      ctx.telegram.sendMessage(86907467, "Check me, maybe I'm down.");
    }

    return ctx.reply(message, Extra.inReplyTo(ctx.message.message_id));
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
