// The shape only: a file name would drag personal data into the database.
export const getKind = (message) => {
  if (!message) return 'other';

  if (message.document) {
    return `document:${message.document.mime_type || 'unknown'}`;
  }

  if (message.photo) return 'photo';
  if (message.video) return 'video';
  if (message.audio) return 'audio';
  if (message.voice) return 'voice';
  if (message.sticker) return 'sticker';
  if (message.contact) return 'contact';
  if (message.location || message.venue) return 'location';
  if (message.dice) return 'dice';
  if (message.text) return 'text';

  return 'other';
};
