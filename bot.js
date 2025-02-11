const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI"); // توکن ربات خودت را وارد کن
const channelUsername = "@ztuwzu5eykfri5w4y"; // یوزرنیم کانال خودت را وارد کن

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
      // اگر عضو نبود، پیام اخطار و لینک عضویت ارسال کن
      ctx.reply(
        `❌ برای استفاده از ربات، باید ابتدا عضو کانال شوید:
🔗 [عضویت در کانال](${`https://t.me/${channelUsername.replace("@", "")}`})
✅ پس از عضویت، دستور /start را دوباره بزنید.`,
        { parse_mode: "Markdown" }
      );
    }
  } catch (error) {
    console.log("خطا در بررسی عضویت: ", error.message);
    ctx.reply(
      `❌ برای استفاده از ربات، باید ابتدا عضو کانال شوید:
🔗 [عضویت در کانال](${`https://t.me/${channelUsername.replace("@", "")}`})
✅ پس از عضویت، دستور /start را دوباره بزنید.`,
      { parse_mode: "Markdown" }
    );
  }
});

bot.launch();
