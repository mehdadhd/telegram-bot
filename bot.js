const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI"); // جایگزین کنید با توکن ربات خود
const channelUsername = "@ahngmhdd"; // جایگزین کنید با نام کانال موردنظر

// لیست ارزهای اضافه شده توسط کاربران
let userAddedCoins = [];

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
    Markup.keyboard([
      ["🌍 نمای کلی بازار"], // دکمه جدید بالای همه
      ["📊 قیمت لحظه‌ای کریپتو"],
      ["🔔 هشدار قیمتی"],
    ]).resize()
  );
});

// دکمه "🌍 نمای کلی بازار"
bot.hears("🌍 نمای کلی بازار", async (ctx) => {
  const userId = ctx.from.id;

  if (!(await isUserMember(userId, ctx))) {
    return ctx.reply(
      "❌ برای استفاده از این قابلیت، ابتدا عضو کانال شوید.",
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

  try {
    const response = await axios.get("https://api.coingecko.com/api/v3/global");
    const data = response.data.data;

    const totalMarketCap = data.total_market_cap.usd.toLocaleString();
    const totalVolume = data.total_volume.usd.toLocaleString();
    const btcDominance = data.market_cap_percentage.btc.toFixed(1);
    const marketCapChange =
      data.market_cap_change_percentage_24h_usd.toFixed(2);

    let marketOverview = "🌍 **نمای کلی بازار کریپتو**:\n\n";
    marketOverview += `💰 ارزش کل بازار: ${totalMarketCap} دلار\n`;
    marketOverview += `📉 حجم معاملات 24 ساعته: ${totalVolume} دلار\n`;
    marketOverview += `🏆 دامیننس بیت‌کوین: ${btcDominance}%\n`;
    marketOverview += `📈 تغییرات 24 ساعته: ${
      marketCapChange >= 0 ? "+" : ""
    }${marketCapChange}%\n`;

    await ctx.reply(marketOverview, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("خطا در دریافت داده‌های بازار:", error);
    ctx.reply(
      "❌ مشکلی در دریافت اطلاعات بازار پیش آمد، لطفاً بعداً امتحان کنید."
    );
  }
});

// دکمه "📊 قیمت لحظه‌ای کریپتو"
bot.hears("📊 قیمت لحظه‌ای کریپتو", async (ctx) => {
  const userId = ctx.from.id;

  if (!(await isUserMember(userId, ctx))) {
    return ctx.reply(
      "❌ برای استفاده از این قابلیت، ابتدا عضو کانال شوید.",
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
      reply_markup: {
        inline_keyboard: [
          [Markup.button.callback("🔄 بروزرسانی", "update_prices")],
        ],
      },
    });

    ctx.reply(
      "لطفا یک گزینه را انتخاب کنید:",
      Markup.keyboard([
        ["💵 قیمت تتر"],
        ["➕ اضافه کردن ارز جدید"],
        ["↩️ بازگشت به منو اصلی"],
      ]).resize()
    );
  } catch (error) {
    console.error("خطا در دریافت قیمت ارزها:", error);
    ctx.reply("❌ مشکلی در دریافت قیمت‌ها پیش آمد، لطفاً بعداً امتحان کنید.");
  }
});

// دکمه "🔔 هشدار قیمتی"
bot.hears("🔔 هشدار قیمتی", async (ctx) => {
  const userId = ctx.from.id;

  if (!(await isUserMember(userId, ctx))) {
    return ctx.reply(
      "❌ برای استفاده از این قابلیت، ابتدا عضو کانال شوید.",
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
    "این قابلیت به زودی اضافه خواهد شد. لطفاً منتظر بمانید!",
    Markup.inlineKeyboard([
      [Markup.button.callback("↩️ بازگشت به منو اصلی", "back_to_menu")],
    ])
  );
});

// دکمه "💵 قیمت تتر"
bot.hears("💵 قیمت تتر", async (ctx) => {
  try {
    const response = await axios.get("https://api.arzdigital.com/market.json");
    const tetherData = response.data.find(
      (currency) => currency.id === "tether"
    );

    if (tetherData) {
      const irrPrice = tetherData.price;
      const tomanPrice = irrPrice / 10;
      ctx.reply(`💵 قیمت تتر (USDT): ${tomanPrice.toLocaleString()} تومان`);
    } else {
      throw new Error("اطلاعات تتر در دسترس نیست");
    }
  } catch (error) {
    console.error("خطا در دریافت قیمت تتر:", error);
    ctx.reply("❌ مشکلی در دریافت قیمت تتر پیش آمد، لطفاً بعداً امتحان کنید.");
  }
});

// دکمه "↩️ بازگشت به منو اصلی"
bot.hears("↩️ بازگشت به منو اصلی", async (ctx) => {
  ctx.reply(
    "✅ خوش آمدید! لطفاً از منوی زیر استفاده کنید:",
    Markup.keyboard([
      ["🌍 نمای کلی بازار"], // دکمه جدید بالای همه
      ["📊 قیمت لحظه‌ای کریپتو"],
      ["🔔 هشدار قیمتی"],
    ]).resize()
  );
});

// دکمه "➕ اضافه کردن ارز جدید"
bot.hears("➕ اضافه کردن ارز جدید", (ctx) => {
  ctx.reply("لطفاً نماد یا نام ارز را به انگلیسی وارد کنید:", {
    reply_markup: {
      force_reply: true,
    },
  });
});

// پردازش نام یا نماد جدید ارز از کاربر
bot.on("message", async (ctx) => {
  if (
    ctx.message.reply_to_message &&
    ctx.message.reply_to_message.text.includes("لطفاً نماد یا نام ارز")
  ) {
    const newCoin = ctx.message.text.toLowerCase();

    try {
      const coinCheck = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${newCoin}&vs_currencies=usd`
      );

      if (coinCheck.data[newCoin]) {
        if (!userAddedCoins.includes(newCoin)) {
          userAddedCoins.push(newCoin);
          ctx.reply(`✅ ارز ${newCoin} به لیست اضافه شد.`);
          await showUpdatedPrices(ctx);
          ctx.reply(
            "لطفا یک گزینه را انتخاب کنید:",
            Markup.keyboard([
              ["💵 قیمت تتر"],
              ["➕ اضافه کردن ارز جدید"],
              ["↩️ بازگشت به منو اصلی"],
            ]).resize()
          );
        } else {
          ctx.reply(`❌ ارز ${newCoin} قبلاً در لیست وجود دارد.`);
          ctx.reply(
            "لطفا یک گزینه را انتخاب کنید:",
            Markup.keyboard([
              ["💵 قیمت تتر"],
              ["➕ اضافه کردن ارز جدید"],
              ["↩️ بازگشت به منو اصلی"],
            ]).resize()
          );
        }
      } else {
        ctx.reply(
          "❌ ارز درخواستی یافت نشد. لطفاً نماد یا نام ارز را بررسی کنید."
        );
        ctx.reply(
          "لطفا یک گزینه را انتخاب کنید:",
          Markup.keyboard([
            ["💵 قیمت تتر"],
            ["➕ اضافه کردن ارز جدید"],
            ["↩️ بازگشت به منو اصلی"],
          ]).resize()
        );
      }
    } catch (error) {
      console.error("خطا در بررسی ارز جدید:", error);
      ctx.reply("❌ خطایی رخ داد. لطفاً دوباره تلاش کنید.");
      ctx.reply(
        "لطفا یک گزینه را انتخاب کنید:",
        Markup.keyboard([
          ["💵 قیمت تتر"],
          ["➕ اضافه کردن ارز جدید"],
          ["↩️ بازگشت به منو اصلی"],
        ]).resize()
      );
    }
  }
});

// تابع برای نمایش قیمت‌های به‌روز شده
async function showUpdatedPrices(ctx) {
  try {
    const baseCoins = [
      "bitcoin",
      "notcoin",
      "ethereum",
      "the-open-network",
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
      reply_markup: {
        inline_keyboard: [
          [Markup.button.callback("🔄 بروزرسانی", "update_prices")],
        ],
      },
    });
  } catch (error) {
    console.error("خطا در دریافت قیمت ارزها:", error);
    ctx.reply("❌ مشکلی در دریافت قیمت‌ها پیش آمد، لطفاً بعداً امتحان کنید.");
  }
}

// بررسی عضویت مجدد
bot.action("check_membership", async (ctx) => {
  const userId = ctx.from.id;

  if (await isUserMember(userId, ctx)) {
    ctx.reply(
      "✅ عضویت شما تایید شد! حالا می‌توانید از امکانات ربات استفاده کنید.",
      Markup.keyboard([
        ["🌍 نمای کلی بازار"], // دکمه جدید بالای همه
        ["📊 قیمت لحظه‌ای کریپتو"],
        ["🔔 هشدار قیمتی"],
      ]).resize()
    );
  } else {
    ctx.answerCbQuery("❌ هنوز عضو کانال نشده‌اید!", { show_alert: true });
  }
});

// اکشن دکمه "بروزرسانی"
bot.action("update_prices", async (ctx) => {
  const userId = ctx.from.id;

  if (!(await isUserMember(userId, ctx))) {
    await ctx.answerCbQuery("❌ لطفاً ابتدا عضو کانال شوید!", {
      show_alert: true,
    });
    return;
  }

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
      reply_markup: {
        inline_keyboard: [
          [Markup.button.callback("🔄 بروزرسانی", "update_prices")],
        ],
      },
    });

    await ctx.answerCbQuery("✅ قیمت‌ها بروز شد!");
  } catch (error) {
    console.error("خطا در بروزرسانی قیمت‌ها:", error);
    await ctx.answerCbQuery("❌ خطایی در بروزرسانی رخ داد!", {
      show_alert: true,
    });
  }
});

// راه‌اندازی ربات
bot.launch();
