const { Telegraf, Markup } = require("telegraf");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI"); // توکن ربات خود را وارد کنید
const channelUsername = "@ztuwzu5eykfri5w4y"; // یوزرنیم کانال خود را اینجا قرار دهید

bot.start(async (ctx) => {
  const userId = ctx.from.id;

  try {
    // بررسی عضویت کاربر در کانال
    const response = await ctx.telegram.getChatMember(channelUsername, userId);

    // وضعیت‌های مختلف عضویت
    if (
      response.status === "member" ||
      response.status === "administrator" ||
      response.status === "creator"
    ) {
      // اگر عضو بود، اجازه استفاده از ربات را بده
      ctx.reply(
        "✅ شما عضو کانال هستید، از امکانات ربات استفاده کنید!",
        Markup.keyboard([
          ["💰 قیمت بیت کوین", "💰 قیمت ناتکوین"],
          ["⚽ بازی‌های روزانه"],
        ]).resize()
      );
    } else {
      // اگر عضو نبود، دکمه شیشه‌ای برای عضویت نمایش داده شود
      ctx.reply(
        "❌ برای استفاده از ربات، ابتدا باید عضو کانال شوید.",
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
  } catch (error) {
    console.log("خطا در بررسی عضویت: ", error.message);
    ctx.reply(
      "❌ برای استفاده از ربات، ابتدا باید عضو کانال شوید.",
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
});

// بررسی دوباره عضویت وقتی کاربر روی "🔄 بررسی عضویت" کلیک کند
bot.action("check_membership", async (ctx) => {
  const userId = ctx.from.id;

  try {
    const response = await ctx.telegram.getChatMember(channelUsername, userId);

    if (
      response.status === "member" ||
      response.status === "administrator" ||
      response.status === "creator"
    ) {
      ctx.reply(
        "✅ عضویت شما تایید شد! از امکانات ربات استفاده کنید.",
        Markup.keyboard([
          ["💰 قیمت بیت کوین", "💰 قیمت ناتکوین"],
          ["⚽ بازی‌های روزانه"],
        ]).resize()
      );
    } else {
      ctx.answerCbQuery("❌ هنوز عضو کانال نشده‌اید!", { show_alert: true });
    }
  } catch (error) {
    console.log("خطا در بررسی عضویت مجدد: ", error.message);
    ctx.answerCbQuery("❌ خطایی رخ داد، لطفاً دوباره امتحان کنید.", {
      show_alert: true,
    });
  }
});

bot.launch();
