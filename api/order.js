const Telegraf = require('telegraf');
const { addPaidPdfs } = require('./_lib/db');

const bot = new Telegraf(process.env.BOT_TOKEN);

module.exports = async (req, res) => {
  try {
    const order = req.body;
    const user = order['url_params[your_telegram_id]'];
    console.log(JSON.stringify(req.body, null, 2));

    if (order.product_id === 'Hh9ctvcL4koxPlJFzDnCIw==' && user) {
      const result = await addPaidPdfs(user);

      console.log(result);

      await bot.telegram.sendMessage(
        user,
        'You just bought 50 PDF generations. See in /limits total.'
      );
    }

    res.json({ status: 200, body: '' });
  } catch (error) {
    console.log(error);
    res.json({ status: 200, body: '' });
  }
};
