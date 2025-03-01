const moment = require("moment-jalaali");
const momentTimezone = require("moment-timezone");
moment.loadPersian({ dialect: "persian-modern" });
moment.tz = momentTimezone.tz;
moment.tz.setDefault("Asia/Tehran");

function attachActions(bot) {
  bot.action("update_prices", async (ctx) => {
    const userId = ctx.from.id;
    try {
      if (!global.userWatchlists[userId]) global.userWatchlists[userId] = [...require("../config").BASE_COINS];
      const userCoins = global.userWatchlists[userId];
      const watchlistData = await require("./api").getWatchlistData(userCoins);

      const now = moment().format("jYYYY/jMM/jDD - HH:mm - dddd");
      const message = `${formatWatchlist(watchlistData)}\n\n📅 **تاریخ و ساعت:** ${now}`;

      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "🔄 بروزرسانی", callback_data: "update_prices" }]],
        },
      });
      ctx.answerCbQuery("واچ‌لیست با موفقیت بروزرسانی شد!");
    } catch (error) {
      ctx.answerCbQuery("❌ خطایی در بروزرسانی واچ‌لیست رخ داد.");
      console.error("Error in updating watchlist:", error);
    }
  });

  bot.action("check_membership", async (ctx) => {
    const userId = ctx.from.id;
    if (await require("./api").isUserMember(userId, ctx)) {
      ctx.editMessageText("✅ عضویت شما تأیید شد! لطفاً از منوی زیر استفاده کنید:", {
        reply_markup: require("telegraf").Markup.keyboard([
          ["🌍 نمای کلی بازار"],
          ["📊 واچ‌لیست قیمتی"],
          ["🔔 هشدار قیمتی"],
          ["💰 بازار ارز و طلا"],
        ]).resize().reply_markup,
      });
    } else {
      ctx.answerCbQuery("❌ شما هنوز عضو کانال نیستید!");
    }
  });
}

function formatWatchlist(coinsData) {
  let message = "📊 **واچ‌لیست قیمتی**:\n\n";
  coinsData.forEach((coin, index) => {
    const name = coin.name;
    const price = coin.current_price; // قیمت خام از API بدون فرمت
    const change24h = coin.price_change_percentage_24h.toFixed(2);
    const changeEmoji = change24h >= 0 ? "📈" : "📉";

    message += `💸 *${name}*\n`;
    message += `   💰 قیمت: ${price} دلار\n`;
    message += `   ${changeEmoji} تغییرات 24h: ${change24h >= 0 ? "+" : ""}${change24h}%\n`;
    if (index < coinsData.length - 1) message += "─".repeat(20) + "\n";
  });
  message += "\n🔄 *قیمت‌ها و تغییرات هر لحظه به‌روزرسانی می‌شوند!*";
  return message;
}

module.exports = { attachActions };