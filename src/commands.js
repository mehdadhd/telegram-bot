const { Markup } = require("telegraf");
const moment = require("moment-jalaali");
const momentTimezone = require("moment-timezone");
moment.loadPersian({ dialect: "persian-modern" });
moment.tz = momentTimezone.tz;
moment.tz.setDefault("Asia/Tehran");
const { CHANNEL_USERNAME, BASE_COINS } = require("../config");
const {
  isUserMember,
  getMarketOverview,
  getTetherPrice,
  getWatchlistData,
  getFearGreedIndex,
  getTopGainersAndLosers,
  getGoldAndCoinPrices,
  getDollarPrice,
} = require("./api");

// کش کوتاه‌مدت برای واچ‌لیست
let priceCache = {};
let lastFetchTime = {};

async function getCachedWatchlistData(coins) {
  const coinList = coins.join(",");
  const now = Date.now();
  if (
    priceCache[coinList] &&
    now - lastFetchTime[coinList] < 10000 // 10 ثانیه
  ) {
    return priceCache[coinList];
  }
  const data = await getWatchlistData(coins);
  priceCache[coinList] = data;
  lastFetchTime[coinList] = now;
  return data;
}

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
      const data = await getMarketOverview();
      const totalMarketCap = data.total_market_cap.usd.toLocaleString();
      const totalVolume = data.total_volume.usd.toLocaleString();
      const btcDominance = data.market_cap_percentage.btc.toFixed(1);
      const marketCapChange =
        data.market_cap_change_percentage_24h_usd.toFixed(2);

      let message = "🌍 **نمای کلی بازار کریپتو**:\n\n";
      message += "💰 ارزش کل بازار: " + totalMarketCap + " دلار\n";
      message += "📉 حجم معاملات 24 ساعته: " + totalVolume + " دلار\n";
      message += "🏆 دامیننس بیت‌کوین: " + btcDominance + "%\n";
      message +=
        "📈 تغییرات 24 ساعته: " +
        (marketCapChange >= 0 ? "+" : "") +
        marketCapChange +
        "%\n";

      ctx.reply(message, { parse_mode: "Markdown" });
      sendMarketMenu(ctx);
    } catch (error) {
      ctx.reply(
        "❌ مشکلی در دریافت اطلاعات بازار پیش آمد، لطفاً بعداً امتحان کنید."
      );
    }
  });

  bot.hears("📊 مشاهده واچ‌لیست", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) return sendMembershipPrompt(ctx);
    try {
      if (!global.userWatchlists[userId])
        global.userWatchlists[userId] = [...BASE_COINS];
      const userCoins = global.userWatchlists[userId];
      const watchlistData = await getCachedWatchlistData(userCoins);
      const now = moment().format("jYYYY/jMM/jDD - HH:mm - dddd");
      const message = `${formatWatchlist(
        watchlistData
      )}\n\n📅 **تاریخ و ساعت:** ${now}`;

      await ctx.reply(message, {
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

  bot.hears("💰 بازار ارز و طلا", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) return sendMembershipPrompt(ctx);
    sendCurrencyAndGoldMenu(ctx);
  });

  bot.hears("🔢 تبدیل پیشرفته", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) return sendMembershipPrompt(ctx);
    ctx.reply(
      "لطفاً تعداد واحد و ارز را وارد کنید:\n" +
        "یه تعداد ارزی بدید که ربات تبدیل به دلار کنه و با نرخ دلار اونو به تومان نشون بده\n" +
        "مثال: `2 bitcoin` یا `5000 not`\n" +
        "فرمت: `تعداد ارز`",
      {
        parse_mode: "Markdown",
        reply_markup: {
          force_reply: true,
          inline_keyboard: [
            [Markup.button.callback("لغو", "cancel_conversion")],
          ],
        },
      }
    );
  });

  bot.hears("🔔 هشدار قیمتی", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) return sendMembershipPrompt(ctx);
    sendAlertMenu(ctx);
  });

  bot.hears("😨 شاخص ترس و طمع", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) return sendMembershipPrompt(ctx);
    try {
      const fearGreed = await getFearGreedIndex();
      if (fearGreed) {
        const value = fearGreed.value;
        const classification = fearGreed.value_classification;

        let message = "😨 **شاخص ترس و طمع کریپتو**\n\n";
        message += "📖 **راهنما:**\n";
        message += "😱 **0-24**: ترس شدید (فروش زیاد بازار)\n";
        message += "😨 **25-44**: ترس (احتیاط در خرید)\n";
        message += "😐 **45-55**: خنثی (بازار متعادل)\n";
        message += "😊 **56-75**: طمع (تمایل به خرید)\n";
        message += "🤩 **76-100**: طمع شدید (احتمال حباب)\n\n";
        message += `📊 **شاخص فعلی**: ${value} (${classification})`;

        ctx.reply(message, { parse_mode: "Markdown" });
      } else {
        ctx.reply("😨 شاخص ترس و طمع: در دسترس نیست");
      }
      sendMarketMenu(ctx);
    } catch (error) {
      ctx.reply(
        "❌ مشکلی در دریافت شاخص ترس و طمع پیش آمد، لطفاً بعداً امتحان کنید."
      );
    }
  });

  bot.hears("📈 برترین‌ها و بازندگان", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) return sendMembershipPrompt(ctx);
    try {
      const data = await getTopGainersAndLosers();
      if (!data) throw new Error("داده‌ها در دسترس نیست");

      const topGainers = data.topGainers;
      const topLosers = data.topLosers;

      let message = "📈 **برترین‌ها و بازندگان بازار (24h)**:\n\n";
      message += "🚀 **5 ارز با بیشترین رشد**:\n";
      topGainers.forEach((coin, index) => {
        message += `${index + 1}. *${
          coin.name
        }*: ${coin.price_change_percentage_24h.toFixed(2)}%\n`;
      });
      message += "\n📉 **5 ارز با بیشترین ضرر**:\n";
      topLosers.forEach((coin, index) => {
        message += `${index + 1}. *${
          coin.name
        }*: ${coin.price_change_percentage_24h.toFixed(2)}%\n`;
      });

      ctx.reply(message, { parse_mode: "Markdown" });
      sendMarketMenu(ctx);
    } catch (error) {
      ctx.reply(
        "❌ مشکلی در دریافت برترین‌ها و بازندگان پیش آمد، لطفاً بعداً امتحان کنید."
      );
    }
  });

  bot.hears("🏅 قیمت سکه و طلا", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) return sendMembershipPrompt(ctx);
    try {
      const prices = await getGoldAndCoinPrices();
      let message = "🏅 **قیمت سکه و طلا (به تومان)**:\n\n";
      message +=
        "💰 یک گرم طلای 18 عیار: " +
        prices.goldGram.toLocaleString() +
        " تومان\n";
      message +=
        "💰 سکه تمام بهار: " + prices.fullCoin.toLocaleString() + " تومان\n";
      message += "💰 نیم سکه: " + prices.halfCoin.toLocaleString() + " تومان\n";
      message +=
        "💰 ربع سکه: " + prices.quarterCoin.toLocaleString() + " تومان\n";

      ctx.reply(message, { parse_mode: "Markdown" });
      sendCurrencyAndGoldMenu(ctx);
    } catch (error) {
      ctx.reply(
        "❌ مشکلی در دریافت قیمت سکه و طلا پیش آمد، لطفاً بعداً امتحان کنید.",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  "بازگشت به منوی بازار ارز و طلا",
                  "back_to_currency"
                ),
              ],
            ],
          },
        }
      );
      console.error("Error in gold and coin prices:", error);
    }
  });

  bot.hears("💵 قیمت دلار", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) return sendMembershipPrompt(ctx);
    try {
      const dollarPrice = await getDollarPrice();
      if (dollarPrice) {
        ctx.reply(`💵 **قیمت دلار**: ${dollarPrice.toLocaleString()} تومان`, {
          parse_mode: "Markdown",
        });
      } else {
        ctx.reply("❌ قیمت دلار در دسترس نیست");
      }
      sendCurrencyAndGoldMenu(ctx);
    } catch (error) {
      ctx.reply(
        "❌ مشکلی در دریافت قیمت دلار پیش آمد، لطفاً بعداً امتحان کنید.",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  "بازگشت به منوی بازار ارز و طلا",
                  "back_to_currency"
                ),
              ],
            ],
          },
        }
      );
      console.error("Error in dollar price:", error);
    }
  });

  bot.hears("↩️ بازگشت به منو اصلی", (ctx) => sendMainMenu(ctx));

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
      message += "   💰 قیمت هدف: " + alert.targetPrice + " دلار\n";
      message +=
        "   🔔 نوع: " +
        (alert.type === "above" ? "بالاتر از" : "پایین‌تر از") +
        "\n";
      message += "─".repeat(20) + "\n";
    });
    ctx.reply(message, { parse_mode: "Markdown" });
  });

  bot.hears("🔔 ثبت هشدار جدید", async (ctx) => {
    ctx.reply(
      "لطفاً اطلاعات هشدار را وارد کنید:\n" +
        "مثال: `bitcoin 70000 above` یا `notcoin 0.003 below`\n" +
        "فرمت: `ارز قیمت نوع`",
      { reply_markup: { force_reply: true }, parse_mode: "Markdown" }
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

  bot.hears("➕ اضافه کردن ارز جدید", (ctx) =>
    ctx.reply(
      "لطفاً نماد یا نام ارز را به انگلیسی وارد کنید\n(مثلاً bitcoin یا notcoin):",
      {
        reply_markup: {
          force_reply: true,
          inline_keyboard: [[Markup.button.callback("لغو", "cancel_add_coin")]],
        },
      }
    )
  );

  bot.hears("➖ حذف ارز از واچ‌لیست", (ctx) =>
    ctx.reply(
      "لطفاً نماد یا نام ارزی که می‌خواهید حذف کنید را وارد کنید\n(مثلاً bitcoin یا notcoin):",
      {
        reply_markup: {
          force_reply: true,
          inline_keyboard: [
            [Markup.button.callback("لغو", "cancel_remove_coin")],
          ],
        },
      }
    )
  );

  bot.on("message", async (ctx) => {
    const text = ctx.message.text;
    const userId = ctx.from.id;

    if (!ctx.message.reply_to_message) return;

    console.log(
      "Received message:",
      text,
      "in reply to:",
      ctx.message.reply_to_message.text
    );

    if (
      ctx.message.reply_to_message.text ===
      "لطفاً نماد یا نام ارز را به انگلیسی وارد کنید\n(مثلاً bitcoin یا notcoin):"
    ) {
      const newCoin = text.toLowerCase().trim();
      try {
        const coinCheck = await getCachedWatchlistData([newCoin]);
        if (coinCheck.length > 0) {
          if (!global.userWatchlists[userId])
            global.userWatchlists[userId] = [...BASE_COINS];
          if (!global.userWatchlists[userId].includes(newCoin)) {
            global.userWatchlists[userId].push(newCoin);
            ctx.reply(`✅ ارز ${coinCheck[0].name} به واچ‌لیست شما اضافه شد.`);

            const watchlistData = await getCachedWatchlistData(
              global.userWatchlists[userId]
            );
            const now = moment().format("jYYYY/jMM/jDD - HH:mm - dddd");
            await ctx.reply(
              `${formatWatchlist(
                watchlistData
              )}\n\n📅 **تاریخ و ساعت:** ${now}`,
              {
                parse_mode: "Markdown",
                reply_markup: {
                  inline_keyboard: [
                    [Markup.button.callback("🔄 بروزرسانی", "update_prices")],
                  ],
                },
              }
            );
          } else {
            ctx.reply(
              `❌ ارز ${coinCheck[0].name} قبلاً در واچ‌لیست شما وجود دارد.`
            );
          }
          sendWatchlistMenu(ctx);
        } else {
          await ctx.reply("❌ ارزی با این نام یا نماد پیدا نشد!", {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  Markup.button.callback(
                    "بازگشت به منوی واچ‌لیست",
                    "back_to_watchlist"
                  ),
                ],
              ],
            },
          });
        }
      } catch (error) {
        await ctx.reply(
          "❌ خطایی رخ داد. لطفاً دوباره تلاش کنید یا نام ارز را چک کنید.",
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  Markup.button.callback(
                    "بازگشت به منوی واچ‌لیست",
                    "back_to_watchlist"
                  ),
                ],
              ],
            },
          }
        );
        console.error("Error in adding coin:", error);
      }
    } else if (
      ctx.message.reply_to_message.text ===
      "لطفاً نماد یا نام ارزی که می‌خواهید حذف کنید را وارد کنید\n(مثلاً bitcoin یا notcoin):"
    ) {
      const coinToRemove = text.toLowerCase().trim();
      try {
        if (
          global.userWatchlists[userId] &&
          global.userWatchlists[userId].includes(coinToRemove)
        ) {
          global.userWatchlists[userId] = global.userWatchlists[userId].filter(
            (coin) => coin !== coinToRemove
          );
          ctx.reply(`✅ ارز ${coinToRemove} از واچ‌لیست شما حذف شد.`);

          const watchlistData = await getCachedWatchlistData(
            global.userWatchlists[userId]
          );
          const now = moment().format("jYYYY/jMM/jDD - HH:mm - dddd");
          await ctx.reply(
            `${formatWatchlist(watchlistData)}\n\n📅 **تاریخ و ساعت:** ${now}`,
            {
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [Markup.button.callback("🔄 بروزرسانی", "update_prices")],
                ],
              },
            }
          );
          sendWatchlistMenu(ctx);
        } else {
          await ctx.reply("❌ این ارز در واچ‌لیست شما نیست!", {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  Markup.button.callback(
                    "بازگشت به منوی واچ‌لیست",
                    "back_to_watchlist"
                  ),
                ],
              ],
            },
          });
        }
      } catch (error) {
        await ctx.reply("❌ خطایی رخ داد. لطفاً دوباره تلاش کنید.", {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  "بازگشت به منوی واچ‌لیست",
                  "back_to_watchlist"
                ),
              ],
            ],
          },
        });
        console.error("Error in removing coin:", error);
      }
    } else if (
      ctx.message.reply_to_message.text.startsWith(
        "لطفاً اطلاعات هشدار را وارد کنید"
      )
    ) {
      console.log("Processing alert input:", text);
      const [coin, targetPriceStr, type] = text.split(" ");
      console.log(
        "Parsed input - coin:",
        coin,
        "price:",
        targetPriceStr,
        "type:",
        type
      );

      if (!coin || !targetPriceStr || !["above", "below"].includes(type)) {
        console.log("Invalid format detected");
        return ctx.reply(
          "❌ فرمت اشتباه!\n" +
            "مثال: `bitcoin 70000 above` یا `notcoin 0.003 below`",
          { parse_mode: "Markdown" }
        );
      }

      const targetPrice = parseFloat(targetPriceStr);
      if (isNaN(targetPrice)) {
        console.log("Invalid price detected");
        return ctx.reply("❌ قیمت باید عدد باشد! مثال: `bitcoin 70000 above`");
      }

      try {
        console.log("Fetching coin data for:", coin);
        const coinCheck = await getCachedWatchlistData([coin.toLowerCase()]);
        if (coinCheck.length === 0) {
          console.log("Coin not found:", coin);
          return ctx.reply("❌ ارز درخواستی یافت نشد!");
        }

        console.log("Saving alert:", { userId, coin, targetPrice, type });
        global.priceAlerts.push({
          userId,
          coin: coin.toLowerCase(),
          targetPrice,
          type,
        });

        console.log("Alert saved successfully");
        ctx.reply(
          `✅ هشدار قیمتی ثبت شد!\n` +
            `ارز: *${coinCheck[0].name}*\n` +
            `قیمت هدف: ${targetPrice} دلار\n` +
            `نوع: ${type === "above" ? "بالاتر از" : "پایین‌تر از"}`,
          { parse_mode: "Markdown" }
        );
        sendAlertMenu(ctx);
      } catch (error) {
        await ctx.reply("❌ خطایی رخ داد. لطفاً دوباره تلاش کنید.", {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  "بازگشت به منوی واچ‌لیست",
                  "back_to_watchlist"
                ),
              ],
            ],
          },
        });
        console.error("Error in saving alert:", error);
      }
    } else if (
      ctx.message.reply_to_message.text.startsWith(
        "لطفاً تعداد واحد و ارز را وارد کنید"
      )
    ) {
      console.log("Processing conversion input:", text);
      const [amountStr, coin] = text.split(" ");
      console.log("Parsed input - amount:", amountStr, "coin:", coin);

      if (!amountStr || !coin) {
        console.log("Invalid format detected");
        return ctx.reply(
          "❌ فرمت اشتباه!\n" + "مثال: `2 bitcoin` یا `5000 not`",
          { parse_mode: "Markdown" }
        );
      }

      const amount = parseFloat(amountStr);
      if (isNaN(amount)) {
        console.log("Invalid amount detected");
        return ctx.reply("❌ مقدار باید عدد باشد! مثال: `2 bitcoin`");
      }

      try {
        console.log("Fetching coin data for:", coin);
        const coinCheck = await getCachedWatchlistData([coin.toLowerCase()]);
        if (coinCheck.length === 0) {
          console.log("Coin not found:", coin);
          return ctx.reply("❌ ارز درخواستی یافت نشد!");
        }

        const coinPriceUsd = coinCheck[0].current_price;
        const totalUsd = amount * coinPriceUsd;

        console.log("Fetching dollar rate");
        const dollarRate = await getDollarPrice();
        if (dollarRate === 0) {
          throw new Error("نرخ دلار دریافت نشد");
        }

        const totalToman = totalUsd * dollarRate;
        const now = moment().format("jYYYY/jMM/jDD - HH:mm - dddd");

        let message = "🔢 **تبدیل پیشرفته**:\n\n";
        message += `ارز: *${coinCheck[0].name}*\n`;
        message += `💰 مقدار: ${amount.toLocaleString()}\n`;
        message += `💵 ارزش کل (دلار): ${totalUsd.toLocaleString()} دلار\n`;
        message += `💰 ارزش کل (تومان): ${totalToman.toLocaleString()} تومان\n`;
        message += `📅 **تاریخ و ساعت:** ${now}`;

        ctx.reply(message, { parse_mode: "Markdown" });
        sendMainMenu(ctx);
      } catch (error) {
        await ctx.reply("❌ خطایی رخ داد. لطفاً دوباره تلاش کنید.", {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback("بازگشت به منوی اصلی", "back_to_main")],
            ],
          },
        });
        console.error("Error in conversion:", error);
      }
    }
  });

  // اکشن‌های دکمه‌های لغو
  bot.action("cancel_add_coin", (ctx) => {
    sendWatchlistMenu(ctx);
    ctx.answerCbQuery();
  });

  bot.action("cancel_remove_coin", (ctx) => {
    sendWatchlistMenu(ctx);
    ctx.answerCbQuery();
  });

  bot.action("cancel_conversion", (ctx) => {
    sendMainMenu(ctx);
    ctx.answerCbQuery();
  });

  bot.action("back_to_watchlist", (ctx) => {
    sendWatchlistMenu(ctx);
    ctx.answerCbQuery();
  });

  bot.action("back_to_currency", (ctx) => {
    sendCurrencyAndGoldMenu(ctx);
    ctx.answerCbQuery();
  });

  bot.action("back_to_main", (ctx) => {
    sendMainMenu(ctx);
    ctx.answerCbQuery();
  });

  function sendMainMenu(ctx) {
    ctx.reply(
      "منوی اصلی:",
      Markup.keyboard([
        ["🌍 نمای کلی بازار"],
        ["📊 مشاهده واچ‌لیست"],
        ["🔔 هشدار قیمتی"],
        ["💰 بازار ارز و طلا"],
        ["🔢 تبدیل پیشرفته"],
      ]).resize()
    );
  }

  function sendAlertMenu(ctx) {
    ctx.reply(
      "منوی هشدار قیمتی:",
      Markup.keyboard([
        ["📜 لیست هشدارها"],
        ["🔔 ثبت هشدار جدید"],
        ["🗑️ پاک کردن هشدارها"],
        ["↩️ بازگشت به منو اصلی"],
      ]).resize()
    );
  }

  function sendMarketMenu(ctx) {
    ctx.reply(
      "منوی نمای کلی بازار:",
      Markup.keyboard([
        ["😨 شاخص ترس و طمع"],
        ["📈 برترین‌ها و بازندگان"],
        ["↩️ بازگشت به منو اصلی"],
      ]).resize()
    );
  }

  function sendCurrencyAndGoldMenu(ctx) {
    ctx.reply(
      "منوی بازار ارز و طلا:",
      Markup.keyboard([
        ["🏅 قیمت سکه و طلا"],
        ["💵 قیمت دلار"],
        ["↩️ بازگشت به منو اصلی"],
      ]).resize()
    );
  }

  function sendWatchlistMenu(ctx) {
    ctx.reply(
      "منوی واچ‌لیست:",
      Markup.keyboard([
        ["➕ اضافه کردن ارز جدید"],
        ["➖ حذف ارز از واچ‌لیست"],
        ["↩️ بازگشت به منو اصلی"],
      ]).resize()
    );
  }

  function sendMembershipPrompt(ctx) {
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

  function formatWatchlist(coinsData) {
    let message = "📊 **واچ‌لیست قیمتی**:\n\n";
    coinsData.forEach((coin, index) => {
      const name = coin.name;
      const price = coin.current_price;
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
