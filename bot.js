const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI"); // جایگزین کنید با توکن ربات خود
const channelUsername = "@ztuwzu5eykfri5w4y"; // جایگزین کنید با نام کانال موردنظر

let cryptoList = [
  "bitcoin",
  "notcoin",
  "ethereum",
  "the-open-network",
  "solana",
  "dogecoin",
];
const userStates = {};

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
      "❌ لطفاً برای استفاده از امکانات ربات به کانال زیر عضو شوید و سپس روی دکمه 'بررسی عضویت' کلیک کنید.",
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
    Markup.keyboard([["📊 قیمت لحظه‌ای کریپتو"]]).resize()
  );
});

// دکمه "📊 قیمت لحظه‌ای کریپتو"
bot.hears("📊 قیمت لحظه‌ای کریپتو", async (ctx) => {
  await sendCryptoPrices(ctx);
});

// ارسال قیمت ارزهای دیجیتال
async function sendCryptoPrices(ctx) {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoList.join(
        ","
      )}&vs_currencies=usd`
    );

    const prices = response.data;
    let message = "📊 **قیمت لحظه‌ای ارزهای دیجیتال**:\n\n";

    cryptoList.forEach((crypto) => {
      if (prices[crypto]) {
        message += `💰 **${crypto.toUpperCase()}**: ${
          prices[crypto].usd
        } دلار\n`;
      }
    });

    message += "\n🔄 *قیمت‌ها هر لحظه ممکن است تغییر کنند!*";

    ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("🔄 بروزرسانی قیمت‌ها", "update_prices")],
        [Markup.button.callback("➕ افزودن ارز دیجیتال جدید", "add_currency")],
      ]),
    });
  } catch (error) {
    console.error("خطا در دریافت قیمت ارزها:", error);
    ctx.reply("❌ مشکلی در دریافت قیمت‌ها پیش آمد، لطفاً بعداً امتحان کنید.");
  }
}

// بروزرسانی قیمت‌ها
bot.action("update_prices", async (ctx) => {
  await sendCryptoPrices(ctx);
});

// افزودن ارز دیجیتال جدید
bot.action("add_currency", (ctx) => {
  const userId = ctx.from.id;
  userStates[userId] = "awaiting_currency";
  ctx.reply(
    "🔹 لطفاً نام ارز دیجیتال موردنظر را به انگلیسی ارسال کنید (مثلاً: shiba-inu)"
  );
});

bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  if (userStates[userId] === "awaiting_currency") {
    const newCrypto = ctx.message.text.toLowerCase().trim();
    delete userStates[userId];

    if (!cryptoList.includes(newCrypto)) {
      cryptoList.push(newCrypto);
      ctx.reply(`✅ ارز **${newCrypto.toUpperCase()}** با موفقیت اضافه شد!`);
      await sendCryptoPrices(ctx);
    } else {
      ctx.reply("⚠️ این ارز قبلاً در لیست وجود دارد!");
    }
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
