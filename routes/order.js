const Telegraf = require('telegraf');
const { BOT_REPLIES } = require('../_lib/config');
const { saveOrder } = require('../_lib/db');

const bot = new Telegraf(process.env.BOT_TOKEN);

module.exports = async (req, res) => {
  try {
    const order = req.body;
    const user = order.url_params.your_telegram_id;

    if (order.product_id === 'Hh9ctvcL4koxPlJFzDnCIw==' && user) {
      await saveOrder(order);
      await bot.telegram.sendMessage(user, BOT_REPLIES.thankMessage);
    } else {
      await saveOrder(order);
      await bot.telegram.sendMessage(
        86907467,
        `Кто-то задонатил без userId:

        ${JSON.stringify(req.body, null, 2)}`
      );
    }

    res.status(200).send('ok');
  } catch (error) {
    console.log(error);
    res.status(200).send('ok');
  }
};
