const { Telegraf, Markup } = require("telegraf");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI");

bot.start((ctx) => {
  ctx.reply(
    "سلام! لطفاً یکی از گزینه‌های زیر رو انتخاب کن:",
    Markup.keyboard([
      ["🔰 شروع", "ℹ️ درباره ما"], // دکمه‌های ردیف اول
      ["❓ راهنما"], // دکمه‌های ردیف دوم
    ]).resize() // کیبورد رو کوچیک می‌کنه تا ظاهر بهتری داشته باشه
  );
});

bot.hears("🔰 شروع", (ctx) => ctx.reply("شما دکمه شروع رو زدید! 🚀"));
bot.hears("ℹ️ درباره ما", (ctx) => ctx.reply("این یه ربات تستی هست! 😎"));
bot.hears("❓ راهنما", (ctx) =>
  ctx.reply("برای استفاده از ربات یکی از دکمه‌ها رو بزن.")
);

bot.launch();
