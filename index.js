import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { Bot, InputFile } from 'grammy';
import { apiThrottler } from '@grammyjs/transformer-throttler';
import { handleUserMessage, handleTimeout, getUrls, getUserMessage } from './_lib/index.js';
import { BOT_REPLIES, ALLOWED_UPDATES, TIMEOUT_MS } from './_lib/config.js';
import { generateScreenshot } from './_lib/generateScreenshot.js';
import { record } from './_lib/stats.js';
import { buildStatsMessage } from './_lib/statsMessage.js';
import { checkUrl } from './_lib/checkUrl.js';
import { take } from './_lib/rateLimit.js';

const passesRateLimit = (ctx) => {
  const gate = take(ctx.chat.id);

  if (gate.allowed) return true;

  // Once per cooldown, so a flood does not write thousands of rows.
  if (gate.notify) {
    console.log(`Rate limited: ${ctx.chat.id}`);
    record(ctx.chat.id, getUrls(ctx.message)?.[0], 'rate_limited', 'rate_limited');

    // Not awaited: a refusal has to stay cheap. Caught so a blocked chat
    // cannot crash the process.
    ctx.reply(BOT_REPLIES.tooFast, {
      reply_to_message_id: ctx.message.message_id,
    }).catch((error) => console.error('Rate limit notice failed:', error.message));
  }

  return false;
};

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
    link_preview_options: { is_disabled: true },
  });
});

// Deliberately absent from the command menu, and silent for non-admins.
bot.command('stats', async (ctx) => {
  const admin = process.env.ADMIN_CHAT_ID;

  if (!admin || String(ctx.chat.id) !== String(admin)) {
    return;
  }

  const period = Math.min(Math.max(parseInt(ctx.match, 10) || 30, 1), 3650);

  // Positional arguments — the object form lives on ctx.api.raw.
  return ctx.api.sendRichMessage(ctx.chat.id, buildStatsMessage(period));
});

bot.command('full', async (ctx) => {
  if (!passesRateLimit(ctx)) return;

  const urls = getUrls(ctx.message);

  if (urls) {
    const firstUrl = urls[0];
    const url = !firstUrl.includes('://') ? `http://${firstUrl}` : firstUrl;

    const allowed = await checkUrl(url);

    if (!allowed.ok) {
      console.log('Rejected url:', url, 'Reason:', allowed.reason);
      record(ctx.chat.id, url, 'failed', allowed.reason);

      return ctx.reply(allowed.message, {
        reply_to_message_id: ctx.message.message_id,
      });
    }

    console.log(`Starting to screenshot: ${url}.`);

    const startedAt = Date.now();
    const data = await handleTimeout((signal) => generateScreenshot(url, signal), TIMEOUT_MS);

    if (data.error) {
      return ctx.reply(data.message, {
        reply_to_message_id: ctx.message.message_id,
      });
    }

    console.log(`Screenshot was made for url: ${url}.`);
    record(ctx.chat.id, url, 'full', null, Date.now() - startedAt);

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
    if (!passesRateLimit(ctx)) return;

    const startedAt = Date.now();
    // Telegram's receipt time, so the gap is how long it sat in the queue.
    const queuedMs = ctx.message?.date
      ? Math.max(0, startedAt - ctx.message.date * 1000)
      : null;
    const { pdf, name, message, errorType, reason } = await handleTimeout(
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
      record(
        ctx.chat.id,
        getUrls(ctx.message)[0],
        'pdf',
        null,
        Date.now() - startedAt,
        queuedMs
      );

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
      record(
        ctx.chat.id,
        getUrls(ctx.message)?.[0],
        'failed',
        reason || errorType || 'unknown',
        Date.now() - startedAt,
        queuedMs
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
