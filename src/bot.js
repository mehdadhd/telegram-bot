const { Telegraf } = require("telegraf");
const { BOT_TOKEN } = require("../config");
const { attachCommands } = require("./commands");
const { attachActions } = require("./actions");

function startBot() {
  const bot = new Telegraf(BOT_TOKEN);

  // متغیرهای جهانی
  global.userWatchlists = {};
  global.priceAlerts = [];

  attachCommands(bot);
  attachActions(bot);

  bot.launch();
  console.log("ربات با موفقیت راه‌اندازی شد!");
}

module.exports = { startBot };