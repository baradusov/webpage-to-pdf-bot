import { InputFile } from 'grammy';

export const startProgress = (ctx, text) =>
  ctx
    .reply(text, { reply_to_message_id: ctx.message.message_id })
    .catch((error) => {
      console.error('Progress notice failed:', error.message);
      return null;
    });

export const finishWithDocument = async (ctx, status, buffer, filename) => {
  if (status) {
    try {
      return await ctx.api.editMessageMedia(ctx.chat.id, status.message_id, {
        type: 'document',
        media: new InputFile(buffer, filename),
      });
    } catch (error) {
      console.error('Editing into a document failed:', error.message);
      await failWith(ctx, status, 'Here it is 👇').catch(() => {});
    }
  }

  return ctx.replyWithDocument(new InputFile(buffer, filename), {
    reply_to_message_id: ctx.message.message_id,
  });
};

export const failWith = (ctx, status, text) => {
  if (status) {
    return ctx.api.editMessageText(ctx.chat.id, status.message_id, text);
  }

  return ctx.reply(text, { reply_to_message_id: ctx.message.message_id });
};
