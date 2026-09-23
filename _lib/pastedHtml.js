const TAG = /<\/?(html|head|body|div|p|span|table|section|article|h[1-6]|ul|ol|li|a|img|br|style|script|meta)\b[^>]*>/i;

export const looksLikeHtml = (text) => TAG.test(text || '');

// Telegram cuts a message at 4096 characters, so most pasted pages arrive in
// pieces. Only a page that carries both ends is worth printing.
export const isWholePage = (text) =>
  /<html[\s>]/i.test(text || '') && /<\/html>/i.test(text || '');
