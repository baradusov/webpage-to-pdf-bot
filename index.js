require('dotenv').config();

const express = require('express');
const Telegraf = require('telegraf');
const Extra = require('telegraf/extra');
const { handleUserMessage } = require('./_lib');
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
    const { pdf, name, message } = await handleUserMessage(ctx);

    if (pdf) {
      if (message) {
        ctx.reply(message, Extra.inReplyTo(ctx.message.message_id));
      }

      ctx.replyWithChatAction('upload_document');

      await updateUser(ctx.chat.id);

      return ctx.replyWithDocument(
        { source: pdf, filename: `${name}.pdf`, caption: message },
        Extra.inReplyTo(ctx.message.message_id)
      );
    }

    if (message.includes('goes wrong')) {
      ctx.telegram.sendMessage(86907467, message);
    }

    return ctx.reply(message, Extra.inReplyTo(ctx.message.message_id));
  }

  return ctx.reply(BOT_REPLIES.limit);
});

const expressApp = express();
expressApp.use(bot.webhookCallback('/api'));

expressApp.get('/', async (req, res) => {
  try {
    res.status(200).send('ok');
  } catch (error) {
    res.status(200).send('nook');
  }
});

expressApp.listen(3333, () => {
  console.log('Example app listening on port 3333!');
});
