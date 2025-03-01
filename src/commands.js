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

function attachCommands(bot) {
  bot.start(async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) {
      return ctx.reply(
        "عضو کانال شوید ابتدا، ربات این از استفاده برای ❎",
        Markup.inlineKeyboard([
          [
            Markup.button.url(
              "کانال در عضویت 📢",
              `https://t.me/${CHANNEL_USERNAME.replace("@", "")}`
            ),
          ],
          [Markup.button.callback("عضویت بررسی 🔄", "check_membership")],
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

      let message = ":کریپتو بازار کلی نمای **🌍\n\n";
      message += `${totalMarketCap} دلار :بازار کل ارزش 💰\n`;
      message += `${totalVolume} دلار :ساعته 24 معاملات حجم 📉\n`;
      message += `${btcDominance}% :بیت‌کوین دامیننس 🏆\n`;
      message += `${
        marketCapChange >= 0 ? "+" : ""
      }${marketCapChange}% :ساعته 24 تغییرات 📈\n`;

      ctx.reply(message, { parse_mode: "Markdown" });
      sendMarketMenu(ctx);
    } catch (error) {
      ctx.reply(
        "امتحان کنید بعداً لطفاً، آمد پیش بازار اطلاعات دریافت در مشکلی ❎"
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
      )}\n\n${now} :ساعت و تاریخ **📅`;

      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback("بروزرسانی 🔄", "update_prices")],
          ],
        },
      });
      sendWatchlistMenu(ctx);
    } catch (error) {
      ctx.reply("امتحان کنید بعداً لطفاً، آمد پیش واچ‌لیست دریافت در مشکلی ❎");
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
      ":کنید وارد را ارز و واحد تعداد لطفاً\n" +
        "کنه نشون به تومان اونو نرخ دلار با و دلار به هم می‌کنه تبدیل ربات که ارزی تعداد یه بدید\n" +
        "`5000 not` یا `2 bitcoin` :مثال\n" +
        "فرمت: `ارز تعداد`",
      { reply_markup: { force_reply: true }, parse_mode: "Markdown" }
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
        ctx.reply(`(${classification}) ${value} :کریپتو طمع و ترس شاخص **😨`, {
          parse_mode: "Markdown",
        });
      } else {
        ctx.reply("نیست دسترس در :طمع و ترس شاخص 😨");
      }
      sendMarketMenu(ctx);
    } catch (error) {
      ctx.reply(
        "امتحان کنید بعداً لطفاً، آمد پیش طمع و ترس شاخص دریافت در مشکلی ❎"
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

      let message = ":(24h) بازار بازندگان و برترین‌ها **📈\n\n";
      message += ":رشد بیشترین با ارز 5 **🚀\n";
      topGainers.forEach((coin, index) => {
        message += `${coin.price_change_percentage_24h.toFixed(2)}% :*${
          coin.name
        }* .${index + 1}\n`;
      });
      message += "\n:ضرر بیشترین با ارز 5 **📉\n";
      topLosers.forEach((coin, index) => {
        message += `${coin.price_change_percentage_24h.toFixed(2)}% :*${
          coin.name
        }* .${index + 1}\n`;
      });

      ctx.reply(message, { parse_mode: "Markdown" });
      sendMarketMenu(ctx);
    } catch (error) {
      ctx.reply(
        "امتحان کنید بعداً لطفاً، آمد پیش بازندگان و برترین‌ها دریافت در مشکلی ❎"
      );
    }
  });

  bot.hears("🏅 قیمت سکه و طلا", async (ctx) => {
    const userId = ctx.from.id;
    if (!(await isUserMember(userId, ctx))) return sendMembershipPrompt(ctx);
    try {
      const prices = await getGoldAndCoinPrices();
      let message = ":(تومان به) طلا و سکه قیمت **🏅\n\n";
      message += `${prices.goldGram.toLocaleString()} تومان :عیار 18 طلای گرم یک 💰\n`;
      message += `${prices.fullCoin.toLocaleString()} تومان :بهار تمام سکه 💰\n`;
      message += `${prices.halfCoin.toLocaleString()} تومان :سکه نیم 💰\n`;
      message += `${prices.quarterCoin.toLocaleString()} تومان :سکه ربع 💰\n`;

      ctx.reply(message, { parse_mode: "Markdown" });
      sendCurrencyAndGoldMenu(ctx);
    } catch (error) {
      ctx.reply(
        "امتحان کنید بعداً لطفاً، آمد پیش طلا و سکه قیمت دریافت در مشکلی ❎",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  "طلا و ارز بازار منوی به بازگشت",
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
        ctx.reply(`${dollarPrice.toLocaleString()} تومان :دلار قیمت **💵`, {
          parse_mode: "Markdown",
        });
      } else {
        ctx.reply("نیست دسترس در دلار قیمت ❎");
      }
      sendCurrencyAndGoldMenu(ctx);
    } catch (error) {
      ctx.reply(
        "امتحان کنید بعداً لطفاً، آمد پیش دلار قیمت دریافت در مشکلی ❎",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  "طلا و ارز بازار منوی به بازگشت",
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
      return ctx.reply("ثبت نکرده‌اید هنوز هشداری شما ❎");
    }

    let message = ":شما هشدارهای لیست **📜\n\n";
    userAlerts.forEach((alert, index) => {
      message += `*${alert.coin}* :ارز .${index + 1}\n`;
      message += `${alert.targetPrice} دلار :هدف قیمت 💰\n`;
      message += `${
        alert.type === "above" ? "از بالاتر" : "از پایین‌تر"
      } :نوع 🔔\n`;
      message += "\n" + "─".repeat(20);
    });
    ctx.reply(message, { parse_mode: "Markdown" });
  });

  bot.hears("🔔 ثبت هشدار جدید", async (ctx) => {
    ctx.reply(
      "کنید وارد را هشدار اطلاعات لطفاً:\n" +
        "`below 0.003 notcoin` یا `above 70000 bitcoin` :مثال\n" +
        "فرمت: `نوع قیمت ارز`",
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
      ctx.reply(`شد! پاک موفقیت با شما هشدار ${removedCount} 🗑️`);
    } else {
      ctx.reply("ندارید! پاک کردن برای هشداری شما ❎");
    }
    sendAlertMenu(ctx);
  });

  bot.hears("➕ اضافه کردن ارز جدید", (ctx) =>
    ctx.reply(
      "کنید وارد انگلیسی به ارز نام یا نماد لطفاً\n" +
        "(notcoin یا bitcoin مثلاً):",
      {
        reply_markup: { force_reply: true },
      }
    )
  );

  bot.hears("➖ حذف ارز از واچ‌لیست", (ctx) =>
    ctx.reply(
      "کنید وارد کنید حذف می‌خواهید که ارزی نام یا نماد لطفاً\n" +
        "(notcoin یا bitcoin مثلاً):",
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
      "کنید وارد انگلیسی به ارز نام یا نماد لطفاً\n(notcoin یا bitcoin مثلاً):"
    ) {
      const newCoin = text.toLowerCase().trim();
      try {
        const coinCheck = await getWatchlistData([newCoin]);
        if (coinCheck.length > 0) {
          if (!global.userWatchlists[userId])
            global.userWatchlists[userId] = [...BASE_COINS];
          if (!global.userWatchlists[userId].includes(newCoin)) {
            global.userWatchlists[userId].push(newCoin);
            ctx.reply(`شد اضافه شما واچ‌لیست به ${coinCheck[0].name} ارز ✅`);

            const watchlistData = await getWatchlistData(
              global.userWatchlists[userId]
            );
            const now = moment().format("jYYYY/jMM/jDD - HH:mm - dddd");
            await ctx.reply(
              `${formatWatchlist(watchlistData)}\n\n${now} :ساعت و تاریخ **📅`,
              {
                parse_mode: "Markdown",
                reply_markup: {
                  inline_keyboard: [
                    [Markup.button.callback("بروزرسانی 🔄", "update_prices")],
                  ],
                },
              }
            );
          } else {
            ctx.reply(
              `دارد وجود شما واچ‌لیست در قبلاً ${coinCheck[0].name} ارز ❎`
            );
          }
          sendWatchlistMenu(ctx);
        } else {
          await ctx.reply("نشده پیدا نماد یا نام این با ارزی ❎", {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  Markup.button.callback(
                    "واچ‌لیست منوی به بازگشت",
                    "back_to_watchlist"
                  ),
                ],
              ],
            },
          });
        }
      } catch (error) {
        await ctx.reply(
          "کنید چک را ارز نام یا کنید تلاش دوباره لطفاً، داد رخ خطایی ❎",
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  Markup.button.callback(
                    "واچ‌لیست منوی به بازگشت",
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
      "کنید وارد کنید حذف می‌خواهید که ارزی نام یا نماد لطفاً\n(notcoin یا bitcoin مثلاً):"
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
          ctx.reply(`شد حذف شما واچ‌لیست از ${coinToRemove} ارز ✅`);

          const watchlistData = await getWatchlistData(
            global.userWatchlists[userId]
          );
          const now = moment().format("jYYYY/jMM/jDD - HH:mm - dddd");
          await ctx.reply(
            `${formatWatchlist(watchlistData)}\n\n${now} :ساعت و تاریخ **📅`,
            {
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [Markup.button.callback("بروزرسانی 🔄", "update_prices")],
                ],
              },
            }
          );
          sendWatchlistMenu(ctx);
        } else {
          await ctx.reply("نیست شما واچ‌لیست در ارز این ❎", {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  Markup.button.callback(
                    "واچ‌لیست منوی به بازگشت",
                    "back_to_watchlist"
                  ),
                ],
              ],
            },
          });
        }
      } catch (error) {
        await ctx.reply("کنید تلاش دوباره لطفاً، داد رخ خطایی ❎", {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  "واچ‌لیست منوی به بازگشت",
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
        "کنید وارد را هشدار اطلاعات لطفاً"
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
          "`below 0.003 notcoin` یا `above 70000 bitcoin` :مثال\n" +
            "اشتباه فرمت ❎",
          { parse_mode: "Markdown" }
        );
      }

      const targetPrice = parseFloat(targetPriceStr);
      if (isNaN(targetPrice)) {
        console.log("Invalid price detected");
        return ctx.reply("`above 70000 bitcoin` مثال :باشد عدد باید قیمت ❎");
      }

      try {
        console.log("Fetching coin data for:", coin);
        const coinCheck = await getWatchlistData([coin.toLowerCase()]);
        if (coinCheck.length === 0) {
          console.log("Coin not found:", coin);
          return ctx.reply("نشده یافت درخواستی ارز ❎");
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
          `${type === "above" ? "از بالاتر" : "از پایین‌تر"} :نوع 🔔\n` +
            `${targetPrice} دلار :هدف قیمت 💰\n` +
            `*${coinCheck[0].name}* :ارز\n" +
            "شد ثبت قیمتی هشدار ✅`,
          { parse_mode: "Markdown" }
        );
        sendAlertMenu(ctx);
      } catch (error) {
        await ctx.reply("کنید تلاش دوباره لطفاً، داد رخ خطایی ❎", {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback(
                  "واچ‌لیست منوی به بازگشت",
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
        "کنید وارد را ارز و واحد تعداد لطفاً"
      )
    ) {
      console.log("Processing conversion input:", text);
      const [amountStr, coin] = text.split(" ");
      console.log("Parsed input - amount:", amountStr, "coin:", coin);

      if (!amountStr || !coin) {
        console.log("Invalid format detected");
        return ctx.reply(
          "`5000 not` یا `2 bitcoin` :مثال\n" + "اشتباه فرمت ❎",
          { parse_mode: "Markdown" }
        );
      }

      const amount = parseFloat(amountStr);
      if (isNaN(amount)) {
        console.log("Invalid amount detected");
        return ctx.reply("`2 bitcoin` مثال :باشد عدد باید مقدار ❎");
      }

      try {
        console.log("Fetching coin data for:", coin);
        const coinCheck = await getWatchlistData([coin.toLowerCase()]);
        if (coinCheck.length === 0) {
          console.log("Coin not found:", coin);
          return ctx.reply("نشده یافت درخواستی ارز ❎");
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

        let message = ":پیشرفته تبدیل **🔢\n\n";
        message += `*${coinCheck[0].name}* :ارز\n`;
        message += `${amount.toLocaleString()} :مقدار 💰\n`;
        message += `${totalUsd.toLocaleString()} دلار :ارزش کل (دلار) 💵\n`;
        message += `${totalToman.toLocaleString()} تومان :ارزش کل (تومان) 💰\n`;
        message += `${now} :ساعت و تاریخ **📅`;

        ctx.reply(message, { parse_mode: "Markdown" });
        sendMainMenu(ctx);
      } catch (error) {
        await ctx.reply("کنید تلاش دوباره لطفاً، داد رخ خطایی ❎", {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback("اصلی منوی به بازگشت", "back_to_main")],
            ],
          },
        });
        console.error("Error in conversion:", error);
      }
    }
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
        ["📊 واچ‌لیست قیمتی"],
        ["🔔 هشدار قیمتی"],
        ["💰 بازار ارز و طلا"],
        ["🔢 تبدیل پیشرفته"], // دکمه جدید
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
      "عضو کانال شوید ابتدا، ربات این از استفاده برای ❎",
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "کانال در عضویت 📢",
            `https://t.me/${CHANNEL_USERNAME.replace("@", "")}`
          ),
        ],
        [Markup.button.callback("عضویت بررسی 🔄", "check_membership")],
      ])
    );
  }

  function formatWatchlist(coinsData) {
    let message = ":قیمتی واچ‌لیست **📊\n\n";
    coinsData.forEach((coin, index) => {
      const name = coin.name;
      const price = coin.current_price;
      const change24h = coin.price_change_percentage_24h.toFixed(2);
      const changeEmoji = change24h >= 0 ? "📈" : "📉";

      message += `*${name}* 💸\n`;
      message += `${price} دلار :قیمت 💰\n`;
      message += `${
        change24h >= 0 ? "+" : ""
      }${change24h}% 24h تغییرات ${changeEmoji}\n`;
      if (index < coinsData.length - 1) message += "\n" + "─".repeat(20);
    });
    message += "\nمی‌شوند!* به‌روزرسانی لحظه هر تغییرات و قیمت‌ها *🔄";
    return message;
  }
}

module.exports = { attachCommands };
