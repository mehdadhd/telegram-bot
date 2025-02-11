const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI");

bot.start((ctx) => {
  ctx.reply(
    "سلام! لطفاً یکی از گزینه‌های زیر رو انتخاب کن:",
    Markup.keyboard([["💰 قیمت دلار", "ℹ️ درباره ما"], ["❓ راهنما"]]).resize()
  );
});

// دریافت قیمت دلار از API جایگزین
bot.hears("💰 قیمت دلار", async (ctx) => {
  try {
    const response = await axios.get(
      "https://api.tgju.org/v1/market/indicator/summary"
    );
    const price = response.data.data.find(
      (item) => item.key === "price_dollar_rl"
    );

    if (price && price.value) {
      ctx.reply(`💵 قیمت دلار امروز: ${price.value} تومان`);
    } else {
      ctx.reply("❌ نتونستم قیمت دلار رو بگیرم، لطفاً بعداً امتحان کن.");
    }
  } catch (error) {
    ctx.reply("❌ مشکلی در دریافت قیمت دلار پیش آمد، لطفاً بعداً امتحان کنید.");
  }
});

bot.hears("ℹ️ درباره ما", (ctx) => ctx.reply("این یه ربات تستی هست! 😎"));
bot.hears("❓ راهنما", (ctx) =>
  ctx.reply("برای استفاده از ربات یکی از دکمه‌ها رو بزن.")
);

bot.launch();
