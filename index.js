const { send, json } = require('micro');
const Telegraf = require('telegraf');
const Extra = require('telegraf/extra');
const { handleTimeout, handleUserMessage } = require('./_lib');
const { updateUser, canUseBot } = require('./_lib/db');
const { BOT_REPLIES, ALLOWED_UPDATES } = require('./_lib/config');

const bot = new Telegraf(process.env.BOT_TOKEN);

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
      ctx.telegram.sendMessage(
        86907467,
        'бот сломался! перезагрузи на https://vercel.com/baradusov/webpage-to-pdf-bot!'
      );
    }

    return ctx.reply(message, Extra.inReplyTo(ctx.message.message_id));
  }

  return ctx.reply(BOT_REPLIES.limit);
});

module.exports = async (req, res) => {
  try {
    const data = await json(req);
    console.log(JSON.stringify(data, null, 2));
    await bot.handleUpdate(data);
    send(res, 200, 'ok');
  } catch (error) {
    console.log('################', error);
    send(res, 200, 'ok');
  }
};
