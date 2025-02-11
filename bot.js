const { Telegraf } = require("telegraf");

// توکن رباتی که از BotFather گرفتی رو اینجا بزار 👇
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

// وقتی کاربر /start رو بزنه، این پیام رو می‌گیره
bot.start((ctx) => {
  ctx.reply("سلام! به ربات من خوش اومدی ");
});

// وقتی کاربر /help رو بزنه، این پیام رو دریافت می‌کنه
bot.help((ctx) => {
  ctx.reply("دستورات:\n/start - شروع ربات\n/help - راهنما");
});

// وقتی هر پیامی فرستاده بشه، همون رو جواب می‌ده!
bot.on("text", (ctx) => {
  ctx.reply(`تو گفتی: ${ctx.message.text}`);
});

// اجرای ربات
bot.launch();
console.log("✅ ربات فعال شد!");
