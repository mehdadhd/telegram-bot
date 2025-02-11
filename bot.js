const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI"); // جایگزین کنید با توکن ربات خود
const channelUsername = "@ztuwzu5eykfri5w4y"; // جایگزین کنید با نام کانال موردنظر

// بررسی عضویت هنگام /start
bot.start(async (ctx) => {
  const userId = ctx.from.id;

  try {
    const response = await ctx.telegram.getChatMember(channelUsername, userId);

    if (
      response.status === "member" ||
      response.status === "administrator" ||
      response.status === "creator"
    ) {
      ctx.reply(
        "✅ خوش آمدید! از منوی زیر استفاده کنید:",
        Markup.keyboard([["📊 قیمت لحظه‌ای کریپتو"]]).resize()
      );
    } else {
      ctx.reply(
        "❌ برای استفاده از ربات، ابتدا عضو کانال شوید.",
        Markup.inlineKeyboard([
          [
            Markup.button.url(
              "📢 عضویت در کانال",
              `https://t.me/${channelUsername.replace("@", "")}`
            ),
          ],
          [Markup.button.callback("🔄 بررسی عضویت", "check_membership")],
        ])
      );
    }
  } catch (error) {
    console.log("خطا در بررسی عضویت: ", error.message);
    ctx.reply("❌ خطایی رخ داد، لطفاً بعداً دوباره امتحان کنید.");
  }
});

// بررسی عضویت مجدد
bot.action("check_membership", async (ctx) => {
  const userId = ctx.from.id;

  try {
    const response = await ctx.telegram.getChatMember(channelUsername, userId);

    if (
      response.status === "member" ||
      response.status === "administrator" ||
      response.status === "creator"
    ) {
      ctx.reply(
        "✅ عضویت شما تایید شد! از امکانات ربات استفاده کنید.",
        Markup.keyboard([["📊 قیمت لحظه‌ای کریپتو"]]).resize()
      );
    } else {
      ctx.answerCbQuery("❌ هنوز عضو کانال نشده‌اید!", { show_alert: true });
    }
  } catch (error) {
    console.log("خطا در بررسی عضویت مجدد: ", error.message);
    ctx.answerCbQuery("❌ خطایی رخ داد، لطفاً دوباره امتحان کنید.", {
      show_alert: true,
    });
  }
});

// دکمه "📊 قیمت لحظه‌ای کریپتو" که قیمت همه ارزها را در یک پیام ارسال می‌کند
bot.hears("📊 قیمت لحظه‌ای کریپتو", async (ctx) => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,notcoin,ethereum,the-open-network,solana,dogecoin&vs_currencies=usd"
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

🔄 *قیمت‌ها هر لحظه ممکن است تغییر کنند!*
`;

    ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("خطا در دریافت قیمت ارزها:", error);
    ctx.reply("❌ مشکلی در دریافت قیمت‌ها پیش آمد، لطفاً بعداً امتحان کنید.");
  }
});

// راه‌اندازی ربات
bot.launch();
