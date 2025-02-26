const { Markup } = require("telegraf");
const { isUserMember, getWatchlistData } = require("./api");
const { BASE_COINS } = require("../config");

function attachActions(bot) {
  // بررسی عضویت مجدد
  bot.action("check_membership", async (ctx) => {
    const userId = ctx.from.id;
    if (await isUserMember(userId, ctx)) {
      ctx.reply(
        "✅ عضویت شما تایید شد! حالا می‌توانید از امکانات ربات استفاده کنید.",
        Markup.keyboard([["🌍 نمای کلی بازار"], ["📊 واچ‌لیست قیمتی"], ["🔔 هشدار قیمتی"]]).resize()
      );
    } else {
      ctx.answerCbQuery("❌ هنوز عضو کانال نشده‌اید!", { show_alert: true });
    }
  });

  // بروزرسانی واچ‌لیست
  bot.action("update_prices", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) {
      return ctx.answerCbQuery("❌ لطفاً ابتدا عضو کانال شوید!", { show_alert: true });
    }
    try {
      const allCoins = [...BASE_COINS, ...global.userAddedCoins];
      const watchlistData = await getWatchlistData(allCoins);
      const message = formatWatchlist(watchlistData);
      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[Markup.button.callback("🔄 بروزرسانی", "update_prices")]] },
      });
      ctx.answerCbQuery("✅ واچ‌لیست بروز شد!");
    } catch (error) {
      ctx.answerCbQuery("❌ خطایی در بروزرسانی رخ داد!", { show_alert: true });
    }
  });

  // تابع فرمت‌بندی واچ‌لیست
  function formatWatchlist(coinsData) {
    let message = "📊 **واچ‌لیست قیمتی**:\n\n";
    coinsData.forEach((coin, index) => {
      const name = coin.name;
      const price = coin.current_price.toLocaleString();
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
}

module.exports = { attachActions };