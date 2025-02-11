const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI");
const footballAPIKey = "d9cf7b88a1c1b4940d97b52a28688702"; // API Key خودتون رو اینجا بذارید

bot.start((ctx) => {
  ctx.reply(
    "سلام! لطفاً یکی از گزینه‌های زیر رو انتخاب کن:",
    Markup.keyboard([
      ["💰 قیمت بیت کوین", "💰 قیمت ناتکوین"],
      ["⚽ بازی‌های روزانه"], // دکمه جدید برای بازی‌ها
    ]).resize()
  );
});

// نمایش بازی‌های روزانه لالیگا و چمپیونشیپ
bot.hears("⚽ بازی‌های روزانه", async (ctx) => {
  try {
    const today = new Date().toISOString().split("T")[0]; // تاریخ امروز به فرمت YYYY-MM-DD

    // درخواست برای بازی‌های لالیگا
    const laLigaResponse = await axios.get(
      "https://api.football-api.com/2.0/matches",
      {
        headers: {
          Authorization: `Bearer ${footballAPIKey}`,
        },
        params: {
          date: today,
          league_id: "PD", // لالیگا
          timezone: "Europe/Madrid",
        },
      }
    );

    // درخواست برای بازی‌های چمپیونشیپ
    const championshipResponse = await axios.get(
      "https://api.football-api.com/2.0/matches",
      {
        headers: {
          Authorization: `Bearer ${footballAPIKey}`,
        },
        params: {
          date: today,
          league_id: "FL1", // چمپیونشیپ
          timezone: "Europe/London",
        },
      }
    );

    // بازی‌های لالیگا
    const laLigaMatches = laLigaResponse.data.matches;

    // بازی‌های چمپیونشیپ
    const championshipMatches = championshipResponse.data.matches;

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
    console.log(
      "خطا در دریافت داده‌ها: ",
      error.response ? error.response.data : error.message
    );
    ctx.reply("❌ مشکلی در دریافت بازی‌ها پیش آمد، لطفاً بعداً امتحان کنید.");
  }
});

bot.launch();
