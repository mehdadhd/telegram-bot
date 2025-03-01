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
  searchCoin,
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
      const data = await getMarketOverview();
      const totalMarketCap = data.total_market_cap.usd.toLocaleString();
      const totalVolume = data.total_volume.usd.toLocaleString();
      const btcDominance = data.market_cap_percentage.btc.toFixed(1);
      const marketCapChange =
        data.market_cap_change_percentage_24h_usd.toFixed(2);

      let message = "🌍 **نمای کلی بازار کریپتو**:\n\n";
      message += `💰 ارزش کل بازار: ${totalMarketCap} دلار\n`;
      message += `📉 حجم معاملات 24 ساعته: ${totalVolume} دلار\n`;
      message += `🏆 دامیننس بیت‌کوین: ${btcDominance}%\n`;
      message += `📈 تغییرات 24 ساعته: ${
        marketCapChange >= 0 ? "+" : ""
      }${marketCapChange}%\n`;

      ctx.reply(message, { parse_mode: "Markdown" });
      sendMarketMenu(ctx);
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
      if (!global.userWatchlists[userId])
        global.userWatchlists[userId] = [...BASE_COINS];
      const userCoins = global.userWatchlists[userId];
      const watchlistData = await getWatchlistData(userCoins);
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
        ctx.reply(
          `😨 **شاخص ترس و طمع کریپتو**: ${value} (${classification})`,
          { parse_mode: "Markdown" }
        );
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
      message += `💰 یک گرم طلای 18 عیار: ${prices.goldGram.toLocaleString()} تومان\n`;
      message += `💰 سکه تمام بهار: ${prices.fullCoin.toLocaleString()} تومان\n`;
      message += `💰 نیم سکه: ${prices.halfCoin.toLocaleString()} تومان\n`;
      message += `💰 ربع سکه: ${prices.quarterCoin.toLocaleString()} تومان\n`;

      ctx.reply(message, { parse_mode: "Markdown" });
      sendCurrencyAndGoldMenu(ctx);
    } catch (error) {
      ctx.reply(
        "❌ مشکلی در دریافت قیمت سکه و طلا پیش آمد، لطفاً بعداً امتحان کنید."
      );
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
        ctx.reply("❌ قیمت دلار در دسترس نیست.");
      }
      sendCurrencyAndGoldMenu(ctx);
    } catch (error) {
      ctx.reply(
        "❌ مشکلی در دریافت قیمت دلار پیش آمد، لطفاً بعداً امتحان کنید."
      );
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
    ctx.reply("لطفاً نماد یا نام ارز را وارد کنید (مثلاً BNB یا بیت‌کوین):", {
      reply_markup: { force_reply: true },
    })
  );

  bot.hears("➖ حذف ارز از واچ‌لیست", (ctx) =>
    ctx.reply(
      "لطفاً نماد یا نام ارزی که می‌خواهید حذف کنید را وارد کنید (مثلاً ETH یا اتریوم):",
      {
        reply_markup: { force_reply: true },
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
      "لطفاً نماد یا نام ارز را وارد کنید (مثلاً BNB یا بیت‌کوین):"
    ) {
      const coinInput = text.trim();
      try {
        const searchResults = await searchCoin(coinInput);
        if (searchResults.length > 0) {
          let message = "🔍 **نتایج جستجو برای:** " + coinInput + "\n\n";
          const buttons = [];
          for (const coin of searchResults) {
            const coinData = await getWatchlistData([coin.id]);
            const price = coinData[0] ? coinData[0].current_price : "نامشخص";
            message += `💸 *${coin.name}* (${coin.symbol.toUpperCase()})\n`;
            message += `   💰 قیمت: ${price} دلار\n\n`;
            buttons.push([
              Markup.button.callback(
                `اضافه کردن ${coin.name}`,
                `add_${coin.id}`
              ),
            ]);
          }
          await ctx.reply(message, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: buttons },
          });
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
        console.error("Error in searching coin:", error);
      }
    } else if (
      ctx.message.reply_to_message.text ===
      "لطفاً نماد یا نام ارزی که می‌خواهید حذف کنید را وارد کنید (مثلاً ETH یا اتریوم):"
    ) {
      const coinInput = text.trim();
      try {
        const searchResults = await searchCoin(coinInput);
        if (searchResults.length > 0) {
          let message = "🔍 **نتایج جستجو برای حذف:** " + coinInput + "\n\n";
          const buttons = [];
          for (const coin of searchResults) {
            if (
              global.userWatchlists[userId] &&
              global.userWatchlists[userId].includes(coin.id)
            ) {
              const coinData = await getWatchlistData([coin.id]);
              const price = coinData[0] ? coinData[0].current_price : "نامشخص";
              message += `💸 *${coin.name}* (${coin.symbol.toUpperCase()})\n`;
              message += `   💰 قیمت: ${price} دلار\n\n`;
              buttons.push([
                Markup.button.callback(`حذف ${coin.name}`, `remove_${coin.id}`),
              ]);
            }
          }
          if (buttons.length > 0) {
            await ctx.reply(message, {
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: buttons },
            });
          } else {
            await ctx.reply(
              "❌ هیچ ارزی با این نام یا نماد در واچ‌لیست شما نیست!",
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
          }
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
        console.error("Error in searching coin for removal:", error);
      }
    } else if (
      ctx.message.reply_to_message.text.startsWith(
        "لطفاً اطلاعات هشدار را وارد کنید"
      )
    ) {
      console.log("Processing alert input:", text);
      const [coinInput, targetPriceStr, type] = text.split(" ");
      console.log(
        "Parsed input - coin:",
        coinInput,
        "price:",
        targetPriceStr,
        "type:",
        type
      );

      if (!coinInput || !targetPriceStr || !["above", "below"].includes(type)) {
        console.log("Invalid format detected");
        return ctx.reply(
          "❌ فرمت اشتباه!\n" +
            "مثال: `bitcoin 70000 above` یا `notcoin 0.003 below`\n" +
            "- `above`: وقتی قیمت بالاتر از هدف برسه\n" +
            "- `below`: وقتی قیمت پایین‌تر از هدف برسه",
          { parse_mode: "Markdown" }
        );
      }

      const targetPrice = parseFloat(targetPriceStr);
      if (isNaN(targetPrice)) {
        console.log("Invalid price detected");
        return ctx.reply("❌ قیمت باید عدد باشد! مثال: `bitcoin 70000 above`");
      }

      try {
        console.log("Searching coin data for:", coinInput);
        const searchResults = await searchCoin(coinInput);
        if (searchResults.length > 0) {
          let message = "🔍 **نتایج جستجو برای هشدار:** " + coinInput + "\n\n";
          const buttons = [];
          for (const coin of searchResults) {
            const coinData = await getWatchlistData([coin.id]);
            const price = coinData[0] ? coinData[0].current_price : "نامشخص";
            message += `💸 *${coin.name}* (${coin.symbol.toUpperCase()})\n`;
            message += `   💰 قیمت: ${price} دلار\n\n`;
            buttons.push([
              Markup.button.callback(
                `ثبت برای ${coin.name}`,
                `alert_${coin.id}_${targetPrice}_${type}`
              ),
            ]);
          }
          await ctx.reply(message, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: buttons },
          });
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
        console.error("Error in searching coin for alert:", error);
      }
    }
  });

  bot.action(/add_(.+)/, async (ctx) => {
    const coinId = ctx.match[1];
    const userId = ctx.from.id;
    try {
      const coinCheck = await getWatchlistData([coinId]);
      if (coinCheck.length > 0) {
        if (!global.userWatchlists[userId])
          global.userWatchlists[userId] = [...BASE_COINS];
        if (!global.userWatchlists[userId].includes(coinId)) {
          global.userWatchlists[userId].push(coinId);
          await ctx.reply(
            `✅ ارز ${coinCheck[0].name} به واچ‌لیست شما اضافه شد.`
          );
          const watchlistData = await getWatchlistData(
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
        } else {
          await ctx.reply(
            `❌ ارز ${coinCheck[0].name} قبلاً در واچ‌لیست شما وجود دارد.`
          );
        }
      }
      ctx.answerCbQuery();
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
      console.error("Error in adding coin:", error);
    }
  });

  bot.action(/remove_(.+)/, async (ctx) => {
    const coinId = ctx.match[1];
    const userId = ctx.from.id;
    try {
      if (
        global.userWatchlists[userId] &&
        global.userWatchlists[userId].includes(coinId)
      ) {
        global.userWatchlists[userId] = global.userWatchlists[userId].filter(
          (coin) => coin !== coinId
        );
        await ctx.reply(`✅ ارز ${coinId} از واچ‌لیست شما حذف شد.`);
        const watchlistData = await getWatchlistData(
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
      } else {
        await ctx.reply("❌ این ارز در واچ‌لیست شما نیست!");
      }
      ctx.answerCbQuery();
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
  });

  bot.action(/alert_(.+)_(.+)_(.+)/, async (ctx) => {
    const [_, coinId, targetPriceStr, type] = ctx.match;
    const userId = ctx.from.id;
    const targetPrice = parseFloat(targetPriceStr);
    try {
      const coinCheck = await getWatchlistData([coinId]);
      if (coinCheck.length > 0) {
        global.priceAlerts.push({
          userId,
          coin: coinId,
          targetPrice,
          type,
        });
        await ctx.reply(
          `✅ هشدار قیمتی ثبت شد!\n` +
            `ارز: *${coinCheck[0].name}*\n` +
            `قیمت هدف: ${targetPrice} دلار\n` +
            `نوع: ${type === "above" ? "بالاتر از" : "پایین‌تر از"}`,
          { parse_mode: "Markdown" }
        );
        sendAlertMenu(ctx);
      }
      ctx.answerCbQuery();
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
  });

  bot.action("back_to_watchlist", (ctx) => {
    sendWatchlistMenu(ctx);
    ctx.answerCbQuery();
  });

  function sendMainMenu(ctx) {
    ctx.reply(
      "✅ خوش آمدید! لطفاً از منوی زیر استفاده کنید:",
      Markup.keyboard([
        ["🌍 نمای کلی بازار"],
        ["📊 واچ‌لیست قیمتی"],
        ["🔔 هشدار قیمتی"],
        ["💰 بازار ارز و طلا"],
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

  function sendMarketMenu(ctx) {
    ctx.reply(
      "📢 منوی نمای کلی بازار:\nلطفاً یکی از گزینه‌ها را انتخاب کنید:",
      Markup.keyboard([
        ["😨 شاخص ترس و طمع"],
        ["📈 برترین‌ها و بازندگان"],
        ["↩️ بازگشت به منو اصلی"],
      ]).resize()
    );
  }

  function sendCurrencyAndGoldMenu(ctx) {
    ctx.reply(
      "📢 منوی بازار ارز و طلا:\nلطفاً یکی از گزینه‌ها را انتخاب کنید:",
      Markup.keyboard([
        ["🏅 قیمت سکه و طلا"],
        ["💵 قیمت دلار"],
        ["↩️ بازگشت به منو اصلی"],
      ]).resize()
    );
  }

  function sendWatchlistMenu(ctx) {
    ctx.reply(
      "لطفاً یک گزینه را انتخاب کنید:",
      Markup.keyboard([
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
