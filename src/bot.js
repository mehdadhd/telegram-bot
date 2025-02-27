const { Telegraf } = require("telegraf");
const { BOT_TOKEN } = require("../config");
const { attachCommands } = require("./commands");
const { attachActions } = require("./actions");
const { getWatchlistData } = require("./api");

function startBot() {
  const bot = new Telegraf(BOT_TOKEN);

  // تعریف متغیرهای جهانی
  global.userWatchlists = {}; // واچ‌لیست شخصی برای هر کاربر
  global.priceAlerts = [];

  attachCommands(bot);
  attachActions(bot);

  setInterval(async () => {
    if (global.priceAlerts.length === 0) return;

    const allCoins = [...new Set(global.priceAlerts.map(alert => alert.coin))];
    try {
      const watchlistData = await getWatchlistData(allCoins);
      global.priceAlerts.forEach((alert, index) => {
        const coinData = watchlistData.find(c => c.id === alert.coin);
        if (!coinData) return;

        const currentPrice = coinData.current_price;
        const { userId, targetPrice, type } = alert;

        if (
          (type === "above" && currentPrice >= targetPrice) ||
          (type === "below" && currentPrice <= targetPrice)
        ) {
          bot.telegram.sendMessage(
            userId,
            `🔔 هشدار قیمتی!\nارز: *${coinData.name}*\nقیمت فعلی: ${currentPrice.toLocaleString()} دلار\nبه هدف ${type === "above" ? "بالاتر از" : "پایین‌تر از"} ${targetPrice} دلار رسید!`,
            { parse_mode: "Markdown" }
          );
          global.priceAlerts.splice(index, 1);
        }
      });
    } catch (error) {
      console.error("خطا در چک کردن هشدارها:", error.message);
    }
  }, 5 * 60 * 1000);

  bot.launch();
  console.log("ربات با موفقیت راه‌اندازی شد!");
}

module.exports = { startBot };