const { Telegraf } = require("telegraf");

// توکن رباتی که از BotFather گرفتی رو اینجا بزار 👇
const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI");

// وقتی کاربر /start رو بزنه، این پیام رو می‌گیره
bot.start((ctx) => {
  ctx.reply("سلام! به ربات من خوش اومدی 🤖");
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
