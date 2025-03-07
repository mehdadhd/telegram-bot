const { Telegraf } = require("telegraf");
const WebSocket = require("ws");
const { BOT_TOKEN } = require("../config");
const { attachCommands } = require("./commands");
const { attachActions } = require("./actions");

function startBot() {
  const bot = new Telegraf(BOT_TOKEN);

  // متغیرهای جهانی
  global.userWatchlists = {};
  global.priceAlerts = [];
  global.livePrices = {}; // ذخیره قیمت‌های لحظه‌ای

  // اتصال به Binance WebSocket
  const ws = new WebSocket("wss://stream.binance.com:9443/ws/!ticker@arr");

  ws.on("open", () => {
    console.log("اتصال به Binance WebSocket برقرار شد!");
  });

  ws.on("message", (data) => {
    const tickers = JSON.parse(data);
    tickers.forEach((ticker) => {
      const symbol = ticker.s.toLowerCase().replace("usdt", ""); // مثلاً "btcusdt" -> "btc"
      const price = parseFloat(ticker.c); // قیمت فعلی
      global.livePrices[symbol] = price;
    });
    // console.log("قیمت‌های لحظه‌ای:", global.livePrices); // برای دیباگ
  });

  ws.on("error", (error) => {
    console.error("خطا در WebSocket:", error.message);
  });

  ws.on("close", () => {
    console.log("اتصال WebSocket قطع شد، تلاش برای اتصال مجدد...");
    setTimeout(startBot, 1000); // تلاش مجدد بعد 1 ثانیه
  });

  attachCommands(bot);
  attachActions(bot);

  bot.launch();
  console.log("ربات با موفقیت راه‌اندازی شد!");
}

module.exports = { startBot };