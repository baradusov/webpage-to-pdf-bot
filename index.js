import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { Bot } from 'grammy';
import { apiThrottler } from '@grammyjs/transformer-throttler';
import { handleUserMessage, handleTimeout, getUrls, getUserMessage } from './_lib/index.js';
import { BOT_REPLIES, ALLOWED_UPDATES, TIMEOUT_MS } from './_lib/config.js';
import { closeBrowser } from './_lib/browser.js';
import { record } from './_lib/stats.js';
import { buildStatsMessage } from './_lib/statsMessage.js';
import { take } from './_lib/rateLimit.js';
import { startAttempt, finishAttempt } from './_lib/attempts.js';
import { startProgress, finishWithDocument, failWith } from './_lib/progress.js';

const survivesRetries = (ctx) => {
  const { tries, giveUp } = startAttempt(ctx.update.update_id);

  if (!giveUp) return true;

  console.error(`Giving up on update ${ctx.update.update_id} after ${tries} tries`);
  record(ctx.chat.id, getUrls(ctx.message)?.[0], 'failed', 'poison_update');
  finishAttempt(ctx.update.update_id);

  ctx.reply(BOT_REPLIES.gaveUp, {
    reply_to_message_id: ctx.message.message_id,
  }).catch((error) => console.error('Give-up notice failed:', error.message));

  return false;
};

const passesRateLimit = (ctx) => {
  if (!getUrls(ctx.message)) return true;

  const gate = take(ctx.chat.id);

  if (gate.allowed) return true;

  if (gate.notify) {
    console.log(`Rate limited: ${ctx.chat.id}`);
    record(ctx.chat.id, getUrls(ctx.message)?.[0], 'rate_limited', 'rate_limited');

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

bot.command('stats', async (ctx) => {
  const admin = process.env.ADMIN_CHAT_ID;

  if (!admin || String(ctx.chat.id) !== String(admin)) {
    return;
  }

  const period = Math.min(Math.max(parseInt(ctx.match, 10) || 30, 1), 3650);

  return ctx.api.sendRichMessage(ctx.chat.id, buildStatsMessage(period));
});

bot.on(ALLOWED_UPDATES, async (ctx) => {
  if (process.env.BOT_STATUS !== 'disabled') {
    if (!passesRateLimit(ctx)) return;
    if (!survivesRetries(ctx)) return;

    const progress = getUrls(ctx.message)
      ? startProgress(ctx, BOT_REPLIES.working)
      : null;
    const startedAt = Date.now();
    const queuedMs = ctx.message?.date
      ? Math.max(0, startedAt - ctx.message.date * 1000)
      : null;
    const { pdf, name, message, errorType, reason } = await handleTimeout(
      (signal) => handleUserMessage(ctx, signal),
      TIMEOUT_MS
    );
    const status = progress ? await progress.settle() : null;

    if (pdf) {
      if (message) {
        ctx.reply(message, {
          reply_to_message_id: ctx.message.message_id,
        });
      }

      console.log(`PDF was generated for message: ${getUrls(ctx.message)[0]}.`);
      record(
        ctx.chat.id,
        getUrls(ctx.message)[0],
        'pdf',
        null,
        Date.now() - startedAt,
        queuedMs
      );
      finishAttempt(ctx.update.update_id);

      return finishWithDocument(ctx, status, pdf, `${name.trim()}.pdf`);
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
      finishAttempt(ctx.update.update_id);

      return failWith(ctx, status, message);
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

const shutdown = async (reason) => {
  await bot.stop(reason);
  await closeBrowser();
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
