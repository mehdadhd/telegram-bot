const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI"); // توکن ربات خودت را وارد کن
const channelUsername = "@ztuwzu5eykfri5w4y"; // یوزرنیم کانال مورد نظر

// بررسی عضویت کاربر در کانال هنگام /start
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
        Markup.keyboard([["💰 قیمت بیت کوین", "💰 قیمت ناتکوین"]]).resize()
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
    ctx.reply(
      "❌ برای استفاده از ربات، ابتدا باید عضو کانال شوید.",
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
        Markup.keyboard([["💰 قیمت بیت کوین", "💰 قیمت ناتکوین"]]).resize()
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

// دریافت قیمت بیت کوین
bot.hears("💰 قیمت بیت کوین", async (ctx) => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    );
    const price = response.data.bitcoin.usd;
    ctx.reply(`💰 قیمت لحظه‌ای **بیت کوین**: ${price} دلار`);
  } catch (error) {
    console.error("خطا در دریافت قیمت بیت کوین:", error);
    ctx.reply(
      "❌ مشکلی در دریافت قیمت بیت کوین پیش آمد، لطفاً بعداً امتحان کنید."
    );
  }
});

// دریافت قیمت نات کوین
bot.hears("💰 قیمت ناتکوین", async (ctx) => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=near&vs_currencies=usd"
    );
    const price = response.data.near.usd;
    ctx.reply(`💰 قیمت لحظه‌ای **ناتکوین (Near Protocol)**: ${price} دلار`);
  } catch (error) {
    console.error("خطا در دریافت قیمت ناتکوین:", error);
    ctx.reply(
      "❌ مشکلی در دریافت قیمت ناتکوین پیش آمد، لطفاً بعداً امتحان کنید."
    );
  }
});

bot.launch();
