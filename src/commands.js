const { Markup } = require("telegraf");
const { CHANNEL_USERNAME, BASE_COINS } = require("../config");
const { isUserMember, getMarketOverview, getTetherPrice, getWatchlistData } = require("./api");

function attachCommands(bot) {
  bot.start(async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) {
      return ctx.reply(
        "❌ برای استفاده از این ربات، ابتدا عضو کانال شوید.",
        Markup.inlineKeyboard([
          [Markup.button.url("📢 عضویت در کانال", `https://t.me/${CHANNEL_USERNAME.replace("@", "")}`)],
          [Markup.button.callback("🔄 بررسی عضویت", "check_membership")],
        ])
      );
    }
    sendMainMenu(ctx);
  });

  bot.hears("🌍 نمای کلی بازار", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) return sendMembershipPrompt(ctx);
    try {
      const data = await getMarketOverview();
      const totalMarketCap = data.total_market_cap.usd.toLocaleString();
      const totalVolume = data.total_volume.usd.toLocaleString();
      const btcDominance = data.market_cap_percentage.btc.toFixed(1);
      const marketCapChange = data.market_cap_change_percentage_24h_usd.toFixed(2);

      let message = "🌍 **نمای کلی بازار کریپتو**:\n\n";
      message += `💰 ارزش کل بازار: ${totalMarketCap} دلار\n`;
      message += `📉 حجم معاملات 24 ساعته: ${totalVolume} دلار\n`;
      message += `🏆 دامیننس بیت‌کوین: ${btcDominance}%\n`;
      message += `📈 تغییرات 24 ساعته: ${marketCapChange >= 0 ? "+" : ""}${marketCapChange}%\n`;

      ctx.reply(message, { parse_mode: "Markdown" });
    } catch (error) {
      ctx.reply("❌ مشکلی در دریافت اطلاعات بازار پیش آمد، لطفاً بعداً امتحان کنید.");
    }
  });

  bot.hears("📊 واچ‌لیست قیمتی", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) return sendMembershipPrompt(ctx);
    try {
      const allCoins = [...BASE_COINS, ...global.userAddedCoins];
      const watchlistData = await getWatchlistData(allCoins);
      await ctx.reply(formatWatchlist(watchlistData), {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[Markup.button.callback("🔄 بروزرسانی", "update_prices")]] },
      });
      ctx.reply(
        "لطفا یک گزینه را انتخاب کنید:",
        Markup.keyboard([["💵 قیمت تتر"], ["➕ اضافه کردن ارز جدید"], ["↩️ بازگشت به منو اصلی"]]).resize()
      );
    } catch (error) {
      ctx.reply("❌ مشکلی در دریافت واچ‌لیست پیش آمد، لطفاً بعداً امتحان کنید.");
    }
  });

  bot.hears("🔔 هشدار قیمتی", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) return sendMembershipPrompt(ctx);
    ctx.reply(
      "این قابلیت به زودی اضافه خواهد شد. لطفاً منتظر بمانید!",
      Markup.inlineKeyboard([[Markup.button.callback("↩️ بازگشت به منو اصلی", "back_to_menu")]])
    );
  });

  bot.hears("💵 قیمت تتر", async (ctx) => {
    try {
      const price = await getTetherPrice();
      ctx.reply(`💵 قیمت تتر (USDT): ${price.toLocaleString()} تومان`);
    } catch (error) {
      ctx.reply("❌ مشکلی در دریافت قیمت تتر پیش آمد، لطفاً بعداً امتحان کنید.");
    }
  });

  bot.hears("↩️ بازگشت به منو اصلی", (ctx) => sendMainMenu(ctx));

  bot.hears("➕ اضافه کردن ارز جدید", (ctx) =>
    ctx.reply("لطفاً نماد یا نام ارز را به انگلیسی وارد کنید:", { reply_markup: { force_reply: true } })
  );

  bot.on("message", async (ctx) => {
    if (ctx.message.reply_to_message?.text.includes("لطفاً نماد یا نام ارز")) {
      const newCoin = ctx.message.text.toLowerCase();
      try {
        const coinCheck = await getWatchlistData([newCoin]);
        if (coinCheck.length > 0) {
          if (!global.userAddedCoins.includes(newCoin)) {
            global.userAddedCoins.push(newCoin);
            ctx.reply(`✅ ارز ${newCoin} به لیست اضافه شد.`);
            const allCoins = [...BASE_COINS, ...global.userAddedCoins];
            const watchlistData = await getWatchlistData(allCoins);
            await ctx.reply(formatWatchlist(watchlistData), {
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: [[Markup.button.callback("🔄 بروزرسانی", "update_prices")]] },
            });
          } else {
            ctx.reply(`❌ ارز ${newCoin} قبلاً در لیست وجود دارد.`);
          }
        } else {
          ctx.reply("❌ ارز درخواستی یافت نشد. لطفاً نماد یا نام ارز را بررسی کنید.");
        }
        ctx.reply(
          "لطفا یک گزینه را انتخاب کنید:",
          Markup.keyboard([["💵 قیمت تتر"], ["➕ اضافه کردن ارز جدید"], ["↩️ بازگشت به منو اصلی"]]).resize()
        );
      } catch (error) {
        ctx.reply("❌ خطایی رخ داد. لطفاً دوباره تلاش کنید.");
      }
    }
  });

  function sendMainMenu(ctx) {
    ctx.reply(
      "✅ خوش آمدید! لطفاً از منوی زیر استفاده کنید:",
      Markup.keyboard([["🌍 نمای کلی بازار"], ["📊 واچ‌لیست قیمتی"], ["🔔 هشدار قیمتی"]]).resize()
    );
  }

  function sendMembershipPrompt(ctx) {
    return ctx.reply(
      "❌ برای استفاده از این قابلیت، ابتدا عضو کانال شوید.",
      Markup.inlineKeyboard([
        [Markup.button.url("📢 عضویت در کانال", `https://t.me/${CHANNEL_USERNAME.replace("@", "")}`)],
        [Markup.button.callback("🔄 بررسی عضویت", "check_membership")],
      ])
    );
  }

  function formatWatchlist(coinsData) {
    let message = "📊 **واچ‌لیست قیمتی**:\n\n";
    coinsData.forEach((coin, index) => {
      const name = coin.name;
      const price = coin.current_price.toLocaleString("en-US", { minimumFractionDigits: 4 }); // دقت بیشتر در قیمت
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

module.exports = { attachCommands };