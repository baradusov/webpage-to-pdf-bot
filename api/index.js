const Telegraf = require('telegraf');
const Extra = require('telegraf/extra');
const { logger, handleTimeout, handleUserMessage } = require('./_lib');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
  await logger('botStart', ctx.message.from.id, 'new user');
  return ctx.reply("You send me a link, I'll send you a readable pdf file.");
});

bot.entity('url', async (ctx) => {
  const { pdf, name, message } = await handleTimeout(() =>
    handleUserMessage(ctx)
  );

  if (pdf) {
    if (message) {
      ctx.reply(message, Extra.inReplyTo(ctx.message.message_id));
    }

    return ctx.replyWithDocument(
      { source: pdf, filename: `${name}.pdf`, caption: message },
      Extra.inReplyTo(ctx.message.message_id)
    );
  }

  await logger(
    'botFailure',
    ctx.message.from.id,
    ctx.message.text,
    "Can't handle it, the webpage is too big. Try sending it to me again, sometimes it helps."
  );
  return ctx.reply(message, Extra.inReplyTo(ctx.message.message_id));
});

bot.on('message', async ({ reply, message }) => {
  await logger(
    'botFailure',
    message.from.id,
    message.text,
    "It doesn't seem to be a link 🤔"
  );

  return reply(
    "It doesn't seem to be a link 🤔",
    Extra.inReplyTo(message.message_id)
  );
});

module.exports = async (req, res) => {
  try {
    console.log(JSON.stringify(req.body, null, 2));
    await bot.handleUpdate(req.body);
    res.json({ status: 200, body: '' });
  } catch (error) {
    res.json({ status: 200, body: '' });
  }
};
