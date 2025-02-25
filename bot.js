const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI"); // جایگزین کنید با توکن ربات خود
const channelUsername = "@ahngmhdd"; // جایگزین کنید با نام کانال موردنظر

let userAddedCoins = [];

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
    Markup.keyboard([["📊 قیمت لحظه‌ای کریپتو", "🔔 هشدار قیمتی"]]).resize()
  );
});

bot.hears("📊 قیمت لحظه‌ای کریپتو", async (ctx) => {
  await showUpdatedPrices(ctx);
});

bot.action("update_prices", async (ctx) => {
  await showUpdatedPrices(ctx);
});

async function showUpdatedPrices(ctx) {
  try {
    const baseCoins = [
      "bitcoin",
      "notcoin",
      "ethereum",
      "ton",
      "solana",
      "dogecoin",
    ];
    const allCoins = [...baseCoins, ...userAddedCoins];
    const coinList = allCoins.join(",");
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinList}&vs_currencies=usd`
    );
    const prices = response.data;
    let priceMessage = "📊 **قیمت لحظه‌ای ارزهای دیجیتال**:\n\n";
    for (let coin in prices) {
      priceMessage += `💰 **${
        coin.charAt(0).toUpperCase() + coin.slice(1)
      }:** ${prices[coin].usd} دلار\n`;
    }
    priceMessage += "\n🔄 *قیمت‌ها هر لحظه ممکن است تغییر کنند!*";
    await ctx.reply(priceMessage, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🔄 بروزرسانی قیمت‌ها", "update_prices")],
      ]),
    });
  } catch (error) {
    console.error("خطا در دریافت قیمت ارزها:", error);
    ctx.reply("❌ مشکلی در دریافت قیمت‌ها پیش آمد، لطفاً بعداً امتحان کنید.");
  }
}

bot.action("check_membership", async (ctx) => {
  const userId = ctx.from.id;
  if (await isUserMember(userId, ctx)) {
    ctx.reply(
      "✅ عضویت شما تایید شد! حالا می‌توانید از امکانات ربات استفاده کنید.",
      Markup.keyboard([["📊 قیمت لحظه‌ای کریپتو", "🔔 هشدار قیمتی"]]).resize()
    );
  } else {
    ctx.answerCbQuery("❌ هنوز عضو کانال نشده‌اید!", { show_alert: true });
  }
});

bot.launch();
