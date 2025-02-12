const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI"); // جایگزین کنید با توکن ربات خود
const channelUsername = "@ztuwzu5eykfri5w4y"; // جایگزین کنید با نام کانال موردنظر

// بررسی عضویت کاربر
async function isUserMember(userId, ctx) {
  try {
    const response = await ctx.telegram.getChatMember(channelUsername, userId);
    return (
      response.status === "member" ||
      response.status === "administrator" ||
      response.status === "creator"
    );
  } catch (error) {
    console.log("خطا در بررسی عضویت: ", error.message);
    return false;
  }
}

// هنگام /start
bot.start(async (ctx) => {
  ctx.reply(
    "✅ خوش آمدید! لطفاً از منوی زیر استفاده کنید:",
    Markup.keyboard([["📊 قیمت لحظه‌ای کریپتو"]]).resize()
  );
});

// دکمه "📊 قیمت لحظه‌ای کریپتو"
bot.hears("📊 قیمت لحظه‌ای کریپتو", async (ctx) => {
  const userId = ctx.from.id;

  if (!(await isUserMember(userId, ctx))) {
    return ctx.reply(
      "❌ برای استفاده از این قابلیت، ابتدا عضو کانال شوید.",
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "📢 عضویت در کانال",
            `https://t.me/${channelUsername.replace("@", "")}`
          ),
        ],
      ])
    );
  }

  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,notcoin,ethereum,the-open-network,solana,dogecoin,tether&vs_currencies=usd,try"
    );

    const prices = response.data;
    const message = `
📊 **قیمت لحظه‌ای ارزهای دیجیتال**:

💰 **بیت کوین (BTC):** ${prices.bitcoin.usd} دلار
💰 **ناتکوین (NOT):** ${prices.notcoin.usd} دلار
💰 **اتریوم (ETH):** ${prices.ethereum.usd} دلار
💰 **تون کوین (TON):** ${prices["the-open-network"].usd} دلار
💰 **سولانا (SOL):** ${prices.solana.usd} دلار
💰 **دوج کوین (DOGE):** ${prices.dogecoin.usd} دلار
💰 **تتر (USDT):** ${prices.tether.try} تومان

🔄 *قیمت‌ها هر لحظه ممکن است تغییر کنند!*
`;

    ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("🔄 بروزرسانی قیمت‌ها", "update_prices")],
      ]),
    });
  } catch (error) {
    console.error("خطا در دریافت قیمت ارزها:", error);
    ctx.reply("❌ مشکلی در دریافت قیمت‌ها پیش آمد، لطفاً بعداً امتحان کنید.");
  }
});

// بروزرسانی قیمت‌ها
bot.action("update_prices", async (ctx) => {
  const userId = ctx.from.id;

  if (!(await isUserMember(userId, ctx))) {
    return ctx.reply(
      "❌ برای استفاده از این قابلیت، ابتدا عضو کانال شوید.",
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "📢 عضویت در کانال",
            `https://t.me/${channelUsername.replace("@", "")}`
          ),
        ],
      ])
    );
  }

  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,notcoin,ethereum,the-open-network,solana,dogecoin,tether&vs_currencies=usd,try"
    );

    const prices = response.data;
    const message = `
📊 **قیمت لحظه‌ای ارزهای دیجیتال**:

💰 **بیت کوین (BTC):** ${prices.bitcoin.usd} دلار
💰 **ناتکوین (NOT):** ${prices.notcoin.usd} دلار
💰 **اتریوم (ETH):** ${prices.ethereum.usd} دلار
💰 **تون کوین (TON):** ${prices["the-open-network"].usd} دلار
💰 **سولانا (SOL):** ${prices.solana.usd} دلار
💰 **دوج کوین (DOGE):** ${prices.dogecoin.usd} دلار
💰 **تتر (USDT):** ${prices.tether.try} تومان

🔄 *قیمت‌ها به روز رسانی شدند!*
`;

    ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("🔄 بروزرسانی قیمت‌ها", "update_prices")],
      ]),
    });
  } catch (error) {
    console.error("خطا در دریافت قیمت‌ها:", error);
    ctx.reply("❌ مشکلی در دریافت قیمت‌ها پیش آمد، لطفاً بعداً امتحان کنید.");
  }
});

// بررسی عضویت مجدد
bot.action("check_membership", async (ctx) => {
  const userId = ctx.from.id;

  if (await isUserMember(userId, ctx)) {
    ctx.reply(
      "✅ عضویت شما تایید شد! حالا می‌توانید از امکانات ربات استفاده کنید.",
      Markup.keyboard([["📊 قیمت لحظه‌ای کریپتو"]]).resize()
    );
  } else {
    ctx.answerCbQuery("❌ هنوز عضو کانال نشده‌اید!", { show_alert: true });
  }
});

// راه‌اندازی ربات
bot.launch();
