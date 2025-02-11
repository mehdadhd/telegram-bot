const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI"); // جایگزین کنید با توکن ربات خود
const channelUsername = "@ztuwzu5eykfri5w4y"; // جایگزین کنید با نام کانال موردنظر

// بررسی عضویت در کانال هنگام /start
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
        Markup.keyboard([
          ["📊 قیمت لحظه‌ای کریپتو"], // دکمه اصلی
        ]).resize()
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

// بررسی مجدد عضویت
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

// دکمه "📊 قیمت لحظه‌ای کریپتو" که زیرمنوی ارزهای دیجیتال را باز می‌کند
bot.hears("📊 قیمت لحظه‌ای کریپتو", (ctx) => {
  ctx.reply(
    "🔽 لطفاً یکی از ارزهای زیر را انتخاب کنید:",
    Markup.inlineKeyboard([
      [Markup.button.callback("💰 قیمت بیت کوین", "btc_price")],
      [Markup.button.callback("💰 قیمت ناتکوین", "not_price")],
      [Markup.button.callback("💰 قیمت اتریوم", "eth_price")],
      [Markup.button.callback("💰 قیمت تون کوین", "ton_price")],
      [Markup.button.callback("💰 قیمت سولانا", "sol_price")],
      [Markup.button.callback("💰 قیمت دوج کوین", "doge_price")],
    ])
  );
});

// تابع دریافت قیمت از API CoinGecko
async function getCryptoPrice(ctx, coinId, coinName) {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
    );
    if (response.data[coinId] && response.data[coinId].usd) {
      const price = response.data[coinId].usd;
      ctx.reply(`💰 قیمت لحظه‌ای **${coinName}**: ${price} دلار`);
    } else {
      ctx.reply(`❌ قیمت **${coinName}** در حال حاضر در دسترس نیست.`);
    }
  } catch (error) {
    console.error(`خطا در دریافت قیمت ${coinName}:`, error);
    ctx.reply(
      `❌ مشکلی در دریافت قیمت **${coinName}** پیش آمد، لطفاً بعداً امتحان کنید.`
    );
  }
}

// اصلاح نام‌های API برای ناتکوین و دوج کوین
bot.action("btc_price", (ctx) => getCryptoPrice(ctx, "bitcoin", "بیت کوین"));
bot.action("not_price", (ctx) => getCryptoPrice(ctx, "notcoin", "ناتکوین")); // اصلاح شد
bot.action("eth_price", (ctx) => getCryptoPrice(ctx, "ethereum", "اتریوم"));
bot.action("ton_price", (ctx) =>
  getCryptoPrice(ctx, "the-open-network", "تون کوین")
);
bot.action("sol_price", (ctx) => getCryptoPrice(ctx, "solana", "سولانا"));
bot.action("doge_price", (ctx) => getCryptoPrice(ctx, "dogecoin", "دوج کوین")); // اصلاح شد

// راه‌اندازی ربات
bot.launch();
