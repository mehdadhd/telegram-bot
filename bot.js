const { Telegraf, Markup } = require("telegraf");
const axios = require("axios"); // برای گرفتن اطلاعات از API

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI");

bot.start((ctx) => {
  ctx.reply(
    "سلام! لطفاً یکی از گزینه‌های زیر رو انتخاب کن:",
    Markup.keyboard([
      ["💰 قیمت دلار", "ℹ️ درباره ما"], // دکمه‌های ردیف اول
      ["❓ راهنما"], // دکمه‌های ردیف دوم
    ]).resize()
  );
});

// دریافت قیمت دلار از API
bot.hears("💰 قیمت دلار", async (ctx) => {
  try {
    const response = await axios.get("https://api.tgju.org/v1/forex");
    const price = response.data.data["price_dollar_rl"]; // قیمت دلار در بازار آزاد
    ctx.reply(`💵 قیمت دلار امروز: ${price} تومان`);
  } catch (error) {
    ctx.reply("❌ مشکلی در دریافت قیمت دلار پیش آمد، لطفاً بعداً امتحان کنید.");
  }
});

bot.hears("ℹ️ درباره ما", (ctx) => ctx.reply("این یه ربات تستی هست! 😎"));
bot.hears("❓ راهنما", (ctx) =>
  ctx.reply("برای استفاده از ربات یکی از دکمه‌ها رو بزن.")
);

bot.launch();
