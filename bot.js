const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf("7592719498:AAF1-bj_rlVQrhsTJkNnmAHUnerLDLohYkI"); // جایگزین با توکن ربات
const channelUsername = "@ztuwzu5eykfri5w4y"; // جایگزین با نام کانال شما

const cryptoList = [
  { id: "bitcoin", name: "بیت کوین" },
  { id: "notcoin", name: "نات کوین" },
  { id: "ethereum", name: "اتریوم" },
  { id: "toncoin", name: "تون کوین" },
  { id: "solana", name: "سولانا" },
  { id: "dogecoin", name: "دوج کوین" },
];

// بررسی عضویت کاربر در کانال
async function isUserMember(userId, ctx) {
  try {
    const response = await ctx.telegram.getChatMember(channelUsername, userId);
    return ["member", "administrator", "creator"].includes(response.status);
  } catch (error) {
    console.log("خطا در بررسی عضویت:", error.message);
    return false;
  }
}

// هنگام /start
bot.start(async (ctx) => {
  const userId = ctx.from.id;

  if (!(await isUserMember(userId, ctx))) {
    return ctx.reply(
      "❌ لطفاً برای استفاده از امکانات ربات به کانال زیر عضو شوید و سپس روی دکمه 'بررسی عضویت' کلیک کنید.",
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
    Markup.keyboard([["📊 قیمت لحظه‌ای کریپتو"]]).resize()
  );
});

// دریافت قیمت ارزها
bot.hears("📊 قیمت لحظه‌ای کریپتو", async (ctx) => {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoList
        .map((c) => c.id)
        .join(",")}&vs_currencies=usd`
    );

    if (!response.data || Object.keys(response.data).length === 0) {
      return ctx.reply(
        "❌ خطایی در دریافت قیمت ارزها رخ داده است، لطفاً بعداً امتحان کنید."
      );
    }

    let message = "📊 *قیمت لحظه‌ای ارزهای دیجیتال*:\n\n";
    cryptoList.forEach((crypto) => {
      if (
        response.data[crypto.id] &&
        response.data[crypto.id].usd !== undefined
      ) {
        message += `💰 *${crypto.name}*: ${
          response.data[crypto.id].usd
        } دلار\n`;
      }
    });
    message += "\n🔄 *قیمت‌ها هر لحظه ممکن است تغییر کنند!*";

    ctx.reply(message, { parse_mode: "MarkdownV2" });
  } catch (error) {
    console.error("خطا در دریافت قیمت ارزها:", error);
    ctx.reply("❌ مشکلی در دریافت قیمت‌ها پیش آمد، لطفاً بعداً امتحان کنید.");
  }
});

// بررسی مجدد عضویت
bot.action("check_membership", async (ctx) => {
  const userId = ctx.from.id;

  if (await isUserMember(userId, ctx)) {
    await ctx.editMessageText(
      "✅ عضویت شما تایید شد! حالا می‌توانید از امکانات ربات استفاده کنید."
    );
    return ctx.reply(
      "🔽 منو:",
      Markup.keyboard([["📊 قیمت لحظه‌ای کریپتو"]]).resize()
    );
  }

  await ctx.editMessageText(
    "❌ هنوز عضو کانال نشده‌اید! لطفاً پس از عضویت، دوباره دکمه بررسی را بزنید.",
    Markup.inlineKeyboard([
      [
        Markup.button.url(
          "📢 عضویت در کانال",
          `https://t.me/${channelUsername.replace("@", "")}`
        ),
      ],
      [Markup.button.callback("🔄 بررسی مجدد", "check_membership")],
    ])
  );
});

// راه‌اندازی ربات
bot.launch();

console.log("✅ ربات با موفقیت راه‌اندازی شد!");
