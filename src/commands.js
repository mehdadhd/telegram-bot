const { Markup } = require("telegraf");
const { CHANNEL_USERNAME, BASE_COINS } = require("../config");
const {
  isUserMember,
  getMarketOverview,
  getTetherPrice,
  getWatchlistData,
  getFearGreedIndex,
  getTopGainersAndLosers,
  getPriceHistory,
} = require("./api");

function attachCommands(bot) {
  bot.start(async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) {
      return ctx.reply(
        "❌ برای استفاده از این ربات، ابتدا عضو کانال شوید.",
        Markup.inlineKeyboard([
          [
            Markup.button.url(
              "📢 عضویت در کانال",
              `https://t.me/${CHANNEL_USERNAME.replace("@", "")}`
            ),
          ],
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
      const [marketData, fearGreed, topData] = await Promise.all([
        getMarketOverview(),
        getFearGreedIndex(),
        getTopGainersAndLosers(),
      ]);

      const totalMarketCap = marketData.total_market_cap.usd.toLocaleString();
      const totalVolume = marketData.total_volume.usd.toLocaleString();
      const btcDominance = marketData.market_cap_percentage.btc.toFixed(1);
      const marketCapChange =
        marketData.market_cap_change_percentage_24h_usd.toFixed(2);

      let message = "🌍 **نمای کلی بازار کریپتو**:\n\n";
      message += `💰 ارزش کل بازار: ${totalMarketCap} دلار\n`;
      message += `📉 حجم معاملات 24 ساعته: ${totalVolume} دلار\n`;
      message += `🏆 دامیننس بیت‌کوین: ${btcDominance}%\n`;
      message += `📈 تغییرات 24 ساعته: ${
        marketCapChange >= 0 ? "+" : ""
      }${marketCapChange}%\n`;
      message += "─".repeat(20) + "\n";

      if (fearGreed) {
        const value = fearGreed.value;
        const classification = fearGreed.value_classification;
        message += `😨 **شاخص ترس و طمع**: ${value} (${classification})\n`;
        message += "─".repeat(20) + "\n";
      } else {
        message += "😨 شاخص ترس و طمع: در دسترس نیست\n";
      }

      if (topData) {
        message += `🚀 **برترین رشد (24h)**: ${topData.topGainer.name}\n`;
        message += `   ${topData.topGainer.price_change_percentage_24h.toFixed(
          2
        )}%\n`;
        message += `📉 **برترین ریزش (24h)**: ${topData.topLoser.name}\n`;
        message += `   ${topData.topLoser.price_change_percentage_24h.toFixed(
          2
        )}%\n`;
      } else {
        message += "🚀 برترین رشد و ریزش: در دسترس نیست\n";
      }

      ctx.reply(message, { parse_mode: "Markdown" });
    } catch (error) {
      ctx.reply(
        "❌ مشکلی در دریافت اطلاعات بازار پیش آمد، لطفاً بعداً امتحان کنید."
      );
    }
  });

  bot.hears("📊 واچ‌لیست قیمتی", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) return sendMembershipPrompt(ctx);
    try {
      if (!global.userWatchlists) global.userWatchlists = {};
      if (!global.userWatchlists[userId])
        global.userWatchlists[userId] = [...BASE_COINS];

      const userCoins = global.userWatchlists[userId];
      const watchlistData = await getWatchlistData(userCoins);
      await ctx.reply(formatWatchlist(watchlistData), {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback("🔄 بروزرسانی", "update_prices")],
          ],
        },
      });
      sendWatchlistMenu(ctx);
    } catch (error) {
      ctx.reply(
        "❌ مشکلی در دریافت واچ‌لیست پیش آمد، لطفاً بعداً امتحان کنید."
      );
    }
  });

  bot.hears("🔔 هشدار قیمتی", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) return sendMembershipPrompt(ctx);
    sendAlertMenu(ctx);
  });

  bot.hears("📜 لیست هشدارها", async (ctx) => {
    const userId = ctx.from.id;
    const userAlerts = global.priceAlerts.filter(
      (alert) => alert.userId === userId
    );
    if (userAlerts.length === 0) {
      return ctx.reply("❌ شما هنوز هشداری ثبت نکرده‌اید!");
    }

    let message = "📜 **لیست هشدارهای شما**:\n\n";
    userAlerts.forEach((alert, index) => {
      message += `${index + 1}. ارز: *${alert.coin}*\n`;
      message += `   💰 قیمت هدف: ${alert.targetPrice} دلار\n`;
      message += `   🔔 نوع: ${
        alert.type === "above" ? "بالاتر از" : "پایین‌تر از"
      }\n`;
      message += "─".repeat(20) + "\n";
    });
    ctx.reply(message, { parse_mode: "Markdown" });
  });

  bot.hears("🔔 ثبت هشدار جدید", async (ctx) => {
    ctx.reply(
      "لطفاً اطلاعات هشدار را وارد کنید:\n" +
        "فرمت: `ارز قیمت نوع`\n" +
        "مثال: `bitcoin 70000 above` یا `notcoin 0.003 below`\n" +
        "📝 توضیح:\n" +
        "- `above`: وقتی قیمت بالاتر از هدف برسه\n" +
        "- `below`: وقتی قیمت پایین‌تر از هدف برسه",
      {
        reply_markup: {
          force_reply: true,
          keyboard: [[{ text: "↩️ بازگشت به منو اصلی" }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
        parse_mode: "Markdown",
      }
    );
  });

  bot.hears("🗑️ پاک کردن هشدارها", async (ctx) => {
    const userId = ctx.from.id;
    const initialLength = global.priceAlerts.length;
    global.priceAlerts = global.priceAlerts.filter(
      (alert) => alert.userId !== userId
    );
    const removedCount = initialLength - global.priceAlerts.length;

    if (removedCount > 0) {
      ctx.reply(`🗑️ ${removedCount} هشدار شما با موفقیت پاک شد!`);
    } else {
      ctx.reply("❌ شما هشداری برای پاک کردن ندارید!");
    }
    sendAlertMenu(ctx);
  });

  bot.hears("💵 قیمت تتر", async (ctx) => {
    try {
      const price = await getTetherPrice();
      ctx.reply(`💵 قیمت تتر (USDT): ${price.toLocaleString()} تومان`);
    } catch (error) {
      ctx.reply(
        "❌ مشکلی در دریافت قیمت تتر پیش آمد، لطفاً بعداً امتحان کنید."
      );
    }
  });

  bot.hears("↩️ بازگشت به منو اصلی", (ctx) => sendMainMenu(ctx));

  bot.hears("➕ اضافه کردن ارز جدید", (ctx) =>
    ctx.reply("لطفاً نماد یا نام ارز را به انگلیسی وارد کنید:", {
      reply_markup: { force_reply: true },
    })
  );

  bot.hears("➖ حذف ارز از واچ‌لیست", (ctx) =>
    ctx.reply("لطفاً نام ارزی که می‌خواهید حذف کنید را وارد کنید:", {
      reply_markup: { force_reply: true },
    })
  );

  bot.hears("🔮 پیش‌بینی قیمت", (ctx) => {
    ctx.reply(
      "📈 برای پیش‌بینی قیمت، نام ارز را وارد کنید:\n" +
        "مثال: `bitcoin` یا `notcoin`",
      {
        reply_markup: {
          keyboard: [[{ text: "↩️ بازگشت به منو اصلی" }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
        parse_mode: "Markdown",
      }
    );
  });

  bot.on("message", async (ctx) => {
    const text = ctx.message.text;
    const userId = ctx.from.id;

    // اضافه کردن ارز جدید
    if (ctx.message.reply_to_message?.text.includes("لطفاً نماد یا نام ارز")) {
      const newCoin = text.toLowerCase();
      try {
        const coinCheck = await getWatchlistData([newCoin]);
        if (coinCheck.length > 0) {
          if (!global.userWatchlists) global.userWatchlists = {};
          if (!global.userWatchlists[userId])
            global.userWatchlists[userId] = [...BASE_COINS];

          if (!global.userWatchlists[userId].includes(newCoin)) {
            global.userWatchlists[userId].push(newCoin);
            ctx.reply(`✅ ارز ${newCoin} به واچ‌لیست شما اضافه شد.`);
            const watchlistData = await getWatchlistData(
              global.userWatchlists[userId]
            );
            await ctx.reply(formatWatchlist(watchlistData), {
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [Markup.button.callback("🔄 بروزرسانی", "update_prices")],
                ],
              },
            });
          } else {
            ctx.reply(`❌ ارز ${newCoin} قبلاً در واچ‌لیست شما وجود دارد.`);
          }
        } else {
          ctx.reply(
            "❌ ارز درخواستی یافت نشد. لطفاً نماد یا نام ارز را بررسی کنید."
          );
        }
        sendWatchlistMenu(ctx); // بازگشت به منوی واچ‌لیست
      } catch (error) {
        ctx.reply("❌ خطایی رخ داد. لطفاً دوباره تلاش کنید.");
      }
    }

    // حذف ارز از واچ‌لیست
    else if (
      ctx.message.reply_to_message?.text.includes(
        "لطفاً نام ارزی که می‌خواهید حذف کنید"
      )
    ) {
      const coinToRemove = text.toLowerCase();
      if (
        !global.userWatchlists[userId] ||
        !global.userWatchlists[userId].includes(coinToRemove)
      ) {
        ctx.reply("❌ این ارز در واچ‌لیست شما نیست!");
        sendWatchlistMenu(ctx);
        return;
      }

      global.userWatchlists[userId] = global.userWatchlists[userId].filter(
        (coin) => coin !== coinToRemove
      );
      ctx.reply(`✅ ارز ${coinToRemove} از واچ‌لیست شما حذف شد.`);

      const watchlistData = await getWatchlistData(
        global.userWatchlists[userId]
      );
      await ctx.reply(formatWatchlist(watchlistData), {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback("🔄 بروزرسانی", "update_prices")],
          ],
        },
      });

      sendWatchlistMenu(ctx); // بازگشت به منوی واچ‌لیست
    }

    // ثبت هشدار جدید
    else if (
      ctx.message.reply_to_message?.text.includes(
        "لطفاً اطلاعات هشدار را وارد کنید"
      )
    ) {
      if (text === "↩️ بازگشت به منو اصلی") {
        return sendMainMenu(ctx);
      }

      const [coin, targetPriceStr, type] = text.split(" ");
      if (!coin || !targetPriceStr || !["above", "below"].includes(type)) {
        return ctx.reply(
          "❌ فرمت اشتباه!\n" +
            "مثال: `bitcoin 70000 above` یا `notcoin 0.003 below`\n" +
            "- `above`: هشدار برای وقتی قیمت بالاتر از هدف برسه\n" +
            "- `below`: هشدار برای وقتی قیمت پایین‌تر از هدف برسه",
          { parse_mode: "Markdown" }
        );
      }

      const targetPrice = parseFloat(targetPriceStr);
      if (isNaN(targetPrice)) {
        return ctx.reply("❌ قیمت باید عدد باشد! مثال: `bitcoin 70000 above`");
      }

      try {
        const coinCheck = await getWatchlistData([coin.toLowerCase()]);
        if (coinCheck.length === 0) {
          return ctx.reply("❌ ارز درخواستی یافت نشد!");
        }

        global.priceAlerts.push({
          userId,
          coin: coin.toLowerCase(),
          targetPrice,
          type,
        });

        ctx.reply(
          `✅ هشدار قیمتی ثبت شد!\n` +
            `ارز: *${coin}*\n` +
            `قیمت هدف: ${targetPrice} دلار\n` +
            `نوع: ${type === "above" ? "بالاتر از" : "پایین‌تر از"}`,
          { parse_mode: "Markdown" }
        );
        sendAlertMenu(ctx);
      } catch (error) {
        ctx.reply("❌ خطایی رخ داد. لطفاً دوباره تلاش کنید.");
      }
    }

    // پیش‌بینی قیمت پیشرفته‌تر با نمودار
    else if (
      ctx.message.reply_to_message?.text.includes(
        "لطفاً نام ارز را برای پیش‌بینی قیمت"
      )
    ) {
      if (text === "↩️ بازگشت به منو اصلی") {
        return sendMainMenu(ctx);
      }

      const coin = text.toLowerCase();
      try {
        const [history, currentData] = await Promise.all([
          getPriceHistory(coin),
          getWatchlistData([coin]),
        ]);

        if (!history || history.length < 7 || !currentData[0]) {
          return ctx.reply("❌ داده کافی برای پیش‌بینی این ارز در دسترس نیست!");
        }

        // محاسبه میانگین متحرک ساده (SMA) و تحلیل
        const prices = history.map((entry) => entry[1]);
        const sma7 =
          prices.slice(-7).reduce((sum, price) => sum + price, 0) / 7;
        const sma14 =
          prices.slice(-14).reduce((sum, price) => sum + price, 0) / 14;
        const currentPrice = currentData[0].current_price;
        const priceChange24h = currentData[0].price_change_percentage_24h;
        const trend = currentPrice > sma7 && sma7 > sma14 ? "صعودی" : "نزولی";
        const confidence = Math.abs(
          ((currentPrice - sma7) / sma7) * 100
        ).toFixed(2); // درصد اطمینان ساده

        let message = "🔮 **پیش‌بینی قیمت**:\n\n";
        message += `ارز: *${currentData[0].name}*\n`;
        message += `💰 قیمت فعلی: ${currentPrice.toLocaleString("en-US", {
          minimumFractionDigits: 4,
        })} دلار\n`;
        message += `📊 میانگین 7 روزه: ${sma7.toLocaleString("en-US", {
          minimumFractionDigits: 4,
        })} دلار\n`;
        message += `📊 میانگین 14 روزه: ${sma14.toLocaleString("en-US", {
          minimumFractionDigits: 4,
        })} دلار\n`;
        message += `📈 تغییرات 24 ساعته: ${
          priceChange24h >= 0 ? "+" : ""
        }${priceChange24h.toFixed(2)}%\n`;
        message += `🔍 روند پیش‌بینی‌شده: *${trend}*\n`;
        message += `📉 اطمینان تقریبی: ${confidence}%\n`;
        message +=
          "\n⚠️ *توجه*: این تحلیل ساده‌ست و صرفاً جهت اطلاعه، نه توصیه مالی!";

        // ساخت نمودار با QuickChart
        const chartUrl = `https://quickchart.io/chart?c={type:'line',data:{labels:${JSON.stringify(
          prices.slice(-7).map((_, i) => `Day ${i + 1}`)
        )},datasets:[{label:'${currentData[0].name}',data:${JSON.stringify(
          prices.slice(-7)
        )},fill:false,borderColor:'blue'}]}}`;

        await ctx.reply(message, { parse_mode: "Markdown" });
        await ctx.replyWithPhoto(chartUrl);
      } catch (error) {
        ctx.reply("❌ خطایی رخ داد یا ارز پیدا نشد. لطفاً دوباره تلاش کنید.");
      }
    }
  });

  function sendMainMenu(ctx) {
    ctx.reply(
      "✅ خوش آمدید! لطفاً از منوی زیر استفاده کنید:",
      Markup.keyboard([
        ["🌍 نمای کلی بازار"],
        ["📊 واچ‌لیست قیمتی"],
        ["🔔 هشدار قیمتی"],
        ["🔮 پیش‌بینی قیمت"],
      ]).resize()
    );
  }

  function sendAlertMenu(ctx) {
    ctx.reply(
      "📢 منوی هشدار قیمتی:\nلطفاً یکی از گزینه‌ها را انتخاب کنید:",
      Markup.keyboard([
        ["📜 لیست هشدارها"],
        ["🔔 ثبت هشدار جدید"],
        ["🗑️ پاک کردن هشدارها"],
        ["↩️ بازگشت به منو اصلی"],
      ]).resize()
    );
  }

  function sendWatchlistMenu(ctx) {
    ctx.reply(
      "لطفا یک گزینه را انتخاب کنید:",
      Markup.keyboard([
        ["💵 قیمت تتر"],
        ["➕ اضافه کردن ارز جدید"],
        ["➖ حذف ارز از واچ‌لیست"],
        ["↩️ بازگشت به منو اصلی"],
      ]).resize()
    );
  }

  function sendMembershipPrompt(ctx) {
    return ctx.reply(
      "❌ برای استفاده از این قابلیت، ابتدا عضو کانال شوید.",
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "📢 عضویت در کانال",
            `https://t.me/${CHANNEL_USERNAME.replace("@", "")}`
          ),
        ],
        [Markup.button.callback("🔄 بررسی عضویت", "check_membership")],
      ])
    );
  }

  function formatWatchlist(coinsData) {
    let message = "📊 **واچ‌لیست قیمتی**:\n\n";
    coinsData.forEach((coin, index) => {
      const name = coin.name;
      const price = coin.current_price.toLocaleString("en-US", {
        minimumFractionDigits: 4,
      });
      const change24h = coin.price_change_percentage_24h.toFixed(2);
      const changeEmoji = change24h >= 0 ? "📈" : "📉";

      message += `💸 *${name}*\n`;
      message += `   💰 قیمت: ${price} دلار\n`;
      message += `   ${changeEmoji} تغییرات 24h: ${
        change24h >= 0 ? "+" : ""
      }${change24h}%\n`;
      if (index < coinsData.length - 1) message += "─".repeat(20) + "\n";
    });
    message += "\n🔄 *قیمت‌ها و تغییرات هر لحظه به‌روزرسانی می‌شوند!*";
    return message;
  }
}

module.exports = { attachCommands };
