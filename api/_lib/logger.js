const fetch = require('node-fetch');

module.exports = async (type, user, url, reply = '') => {
  return fetch('https://api.airtable.com/v0/appIWnrHwWkaiAjLN/logging', {
    method: 'POST',
    headers: {
      Authorization: `Bearer keyhjaFuX9YJ7a8eB`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        eventDate: Date.now(),
        eventType: type,
        user: user,
        url: url,
        botReply: reply,
      },
    }),
  });
};
