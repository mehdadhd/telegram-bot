const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI");
const channelUsername = "@ztuwzu5eykfri5w4y";

// لیست ارزهای اضافه شده توسط کاربران
let userAddedCoins = [];

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
  const userId = ctx.from.id;

  if (!(await isUserMember(userId, ctx))) {
    return ctx.reply(
      "❌ برای استفاده از این ربات، ابتدا عضو کانال شوید.",
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

  ctx.reply(
    "✅ خوش آمدید! لطفاً از منوی زیر استفاده کنید:",
    Markup.keyboard([["📊 قیمت لحظه‌ای کریپتو"], ["🔔 هشدار قیمتی"]]).resize()
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
        [Markup.button.callback("🔄 بررسی عضویت", "check_membership")],
      ])
    );
  }

  // ارسال پیام قیمت‌ها همراه با دکمه بروزرسانی
  await sendPriceList(ctx);
});

// تابع برای ارسال قیمت‌ها
async function sendPriceList(ctx) {
  try {
    const baseCoins = [
      "bitcoin",
      "notcoin",
      "ethereum",
      "the-open-network",
      "solana",
      "dogecoin",
    ];
    const allCoins = [...baseCoins, ...userAddedCoins];
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${allCoins.join(
        ","
      )}&vs_currencies=usd`
    );

    let priceMessage = "📊 **قیمت لحظه‌ای ارزهای دیجیتال:**\n\n";
    for (let coin in response.data) {
      priceMessage += `💰 **${
        coin.charAt(0).toUpperCase() + coin.slice(1)
      }:** ${response.data[coin].usd} دلار\n`;
    }
    priceMessage += "\n🔄 *قیمت‌ها هر لحظه ممکن است تغییر کنند!*";

    const sentMessage = await ctx.reply(priceMessage, {
      parse_mode: "Markdown",
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("🔄 بروزرسانی", "refresh_prices")],
      ]),
    });

    // ذخیره آی‌دی پیام برای بروزرسانی بعدی
    ctx.session = { messageId: sentMessage.message_id };
  } catch (error) {
    console.error("خطا در دریافت قیمت ارزها:", error);
    ctx.reply("❌ مشکلی در دریافت قیمت‌ها پیش آمد، لطفاً بعداً امتحان کنید.");
  }
}

// دکمه بروزرسانی قیمت‌ها
bot.action("refresh_prices", async (ctx) => {
  try {
    await ctx.answerCbQuery("♻️ در حال بروزرسانی قیمت‌ها...");

    const baseCoins = [
      "bitcoin",
      "notcoin",
      "ethereum",
      "the-open-network",
      "solana",
      "dogecoin",
    ];
    const allCoins = [...baseCoins, ...userAddedCoins];
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${allCoins.join(
        ","
      )}&vs_currencies=usd`
    );

    let priceMessage =
      "📊 **قیمت لحظه‌ای ارزهای دیجیتال (بروزرسانی شده):**\n\n";
    for (let coin in response.data) {
      priceMessage += `💰 **${
        coin.charAt(0).toUpperCase() + coin.slice(1)
      }:** ${response.data[coin].usd} دلار\n`;
    }
    priceMessage += "\n🔄 *قیمت‌ها هر لحظه ممکن است تغییر کنند!*";

    await ctx.editMessageText(priceMessage, {
      parse_mode: "Markdown",
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("🔄 بروزرسانی", "refresh_prices")],
      ]),
    });
  } catch (error) {
    console.error("خطا در بروزرسانی قیمت‌ها:", error);
    ctx.answerCbQuery("❌ بروزرسانی قیمت‌ها با خطا مواجه شد.");
  }
});

// بررسی عضویت مجدد
bot.action("check_membership", async (ctx) => {
  const userId = ctx.from.id;

  if (await isUserMember(userId, ctx)) {
    ctx.reply(
      "✅ عضویت شما تایید شد! حالا می‌توانید از امکانات ربات استفاده کنید.",
      Markup.keyboard([["📊 قیمت لحظه‌ای کریپتو"], ["🔔 هشدار قیمتی"]]).resize()
    );
  } else {
    ctx.answerCbQuery("❌ هنوز عضو کانال نشده‌اید!", { show_alert: true });
  }
});

// راه‌اندازی ربات
bot.launch();
