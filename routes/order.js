import { Telegraf } from 'telegraf';
import { BOT_REPLIES } from '../_lib/config.js';
import { saveOrder } from '../_lib/db.js';

const bot = new Telegraf(process.env.BOT_TOKEN);

export default async (req, res) => {
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
    console.error('order error:', error);
    res.status(200).send('ok');
  }
};
