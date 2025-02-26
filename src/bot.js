const { Telegraf } = require("telegraf");
const { BOT_TOKEN } = require("../config");
const { attachCommands } = require("./commands");
const { attachActions } = require("./actions");

function startBot() {
  const bot = new Telegraf(BOT_TOKEN);

  // لیست ارزهای اضافه شده توسط کاربران
  global.userAddedCoins = [];

  // اتصال هندلرها
  attachCommands(bot);
  attachActions(bot);

  // راه‌اندازی ربات
  bot.launch();
  console.log("ربات با موفقیت راه‌اندازی شد!");
}

module.exports = { startBot };