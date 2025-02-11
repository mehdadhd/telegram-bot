const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI");
const coinMarketCapAPIKey = "6417c9d2-9dff-4637-8487-08ef598f23c6";
const footballAPIKey = "d9cf7b88a1c1b4940d97b52a28688702"; // API Key از API Football

bot.start((ctx) => {
  ctx.reply(
    "سلام! لطفاً یکی از گزینه‌های زیر رو انتخاب کن:",
    Markup.keyboard([
      ["💰 قیمت بیت کوین", "💰 قیمت ناتکوین"],
      ["⚽ بازی‌های روزانه"], // دکمه جدید برای بازی‌ها
    ]).resize()
  );
});

// دریافت قیمت بیت کوین از API CoinGecko
bot.hears("💰 قیمت بیت کوین", async (ctx) => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    );
    const price = response.data.bitcoin.usd;
    ctx.reply(`💸 قیمت بیت کوین امروز: $${price} دلار`);
  } catch (error) {
    ctx.reply(
      "❌ مشکلی در دریافت قیمت بیت کوین پیش آمد، لطفاً بعداً امتحان کنید."
    );
  }
});

// دریافت قیمت ناتکوین از CoinMarketCap
bot.hears("💰 قیمت ناتکوین", async (ctx) => {
  try {
    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest",
      {
        headers: {
          "X-CMC_PRO_API_KEY": coinMarketCapAPIKey,
        },
        params: {
          start: 1,
          limit: 10,
          convert: "USD",
        },
      }
    );

    const natcoin = response.data.data.find(
      (coin) => coin.name.toLowerCase() === "natcoin"
    );
    if (natcoin) {
      const price = natcoin.quote.USD.price;
      ctx.reply(`💸 قیمت ناتکوین امروز: $${price} دلار`);
    } else {
      ctx.reply("❌ قیمت ناتکوین پیدا نشد.");
    }
  } catch (error) {
    ctx.reply(
      "❌ مشکلی در دریافت قیمت ناتکوین پیش آمد، لطفاً بعداً امتحان کنید."
    );
  }
});

// نمایش بازی‌های روزانه لالیگا و چمپیونشیپ
bot.hears("⚽ بازی‌های روزانه", async (ctx) => {
  try {
    // دریافت بازی‌های روزانه از API فوتبال
    const today = new Date().toISOString().split("T")[0]; // تاریخ امروز به فرمت YYYY-MM-DD
    const response = await axios.get(
      "https://api.football-api.com/2.0/matches",
      {
        headers: {
          Authorization: `Bearer ${footballAPIKey}`,
        },
        params: {
          date: today,
          league_id: "PD", // لالیگا (ID مربوط به لالیگا)
          timezone: "Europe/Madrid",
        },
      }
    );

    const laLigaMatches = response.data.filter(
      (match) => match.league.name === "La Liga"
    );

    const championshipMatchesResponse = await axios.get(
      "https://api.football-api.com/2.0/matches",
      {
        headers: {
          Authorization: `Bearer ${footballAPIKey}`,
        },
        params: {
          date: today,
          league_id: "FL1", // چمپیونشیپ (ID مربوط به چمپیونشیپ)
          timezone: "Europe/London",
        },
      }
    );

    const championshipMatches = championshipMatchesResponse.data.filter(
      (match) => match.league.name === "Championship"
    );

    let message = "بازی‌های امروز:\n\n";

    if (laLigaMatches.length > 0) {
      message += "⚽ **بازی‌های لالیگا**:\n";
      laLigaMatches.forEach((match) => {
        message += `${match.home_team.name} VS ${match.away_team.name}\n`;
      });
    }

    if (championshipMatches.length > 0) {
      message += "\n⚽ **بازی‌های چمپیونشیپ**:\n";
      championshipMatches.forEach((match) => {
        message += `${match.home_team.name} VS ${match.away_team.name}\n`;
      });
    }

    if (!laLigaMatches.length && !championshipMatches.length) {
      message = "❌ هیچ بازی برای امروز پیدا نشد.";
    }

    ctx.reply(message);
  } catch (error) {
    ctx.reply("❌ مشکلی در دریافت بازی‌ها پیش آمد، لطفاً بعداً امتحان کنید.");
  }
});

bot.launch();
