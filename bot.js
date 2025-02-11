const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI");
const coinMarketCapAPIKey = "6417c9d2-9dff-4637-8487-08ef598f23c6";

bot.start((ctx) => {
  ctx.reply(
    "سلام! لطفاً یکی از گزینه‌های زیر رو انتخاب کن:",
    Markup.keyboard([
      ["💰 قیمت بیت کوین", "💰 قیمت ناتکوین"], // دکمه‌های قیمت بیت کوین و ناتکوین
      ["ℹ️ درباره ما"], // دکمه برای درباره ما
      ["❓ راهنما"], // دکمه برای راهنما
    ]).resize()
  );
});

// دریافت قیمت بیت کوین از API CoinGecko
bot.hears("💰 قیمت بیت کوین", async (ctx) => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    );
    const price = response.data.bitcoin.usd;
    ctx.reply(`💸 قیمت بیت کوین امروز: $${price} دلار`);
  } catch (error) {
    ctx.reply(
      "❌ مشکلی در دریافت قیمت بیت کوین پیش آمد، لطفاً بعداً امتحان کنید."
    );
  }
});

// دریافت قیمت ناتکوین از CoinMarketCap
bot.hears("💰 قیمت ناتکوین", async (ctx) => {
  try {
    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest",
      {
        headers: {
          "X-CMC_PRO_API_KEY": coinMarketCapAPIKey,
        },
        params: {
          start: 1,
          limit: 10,
          convert: "USD",
        },
      }
    );

    const natcoin = response.data.data.find(
      (coin) => coin.name.toLowerCase() === "natcoin"
    );
    if (natcoin) {
      const price = natcoin.quote.USD.price;
      ctx.reply(`💸 قیمت ناتکوین امروز: $${price} دلار`);
    } else {
      ctx.reply("❌ قیمت ناتکوین پیدا نشد.");
    }
  } catch (error) {
    ctx.reply(
      "❌ مشکلی در دریافت قیمت ناتکوین پیش آمد، لطفاً بعداً امتحان کنید."
    );
  }
});

bot.hears("ℹ️ درباره ما", (ctx) => ctx.reply("این یه ربات تستی هست! 😎"));
bot.hears("❓ راهنما", (ctx) =>
  ctx.reply("برای استفاده از ربات یکی از دکمه‌ها رو بزن.")
);

bot.launch();
