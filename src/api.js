const axios = require("axios");
const { CHANNEL_USERNAME } = require("../config");

async function isUserMember(userId, ctx) {
  try {
    const response = await ctx.telegram.getChatMember(CHANNEL_USERNAME, userId);
    return ["member", "administrator", "creator"].includes(response.status);
  } catch (error) {
    console.log("خطا در بررسی عضویت: ", error.message);
    return false;
  }
}

async function getWatchlistData(coins) {
  const coinList = coins.join(",");
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinList}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`
    );
    const data = response.data;
    // چک کردن اینکه آیا Notcoin توی داده‌ها هست یا نه
    const notcoinData = data.find(coin => coin.id === "notcoin");
    if (!notcoinData) {
      console.log("هشدار: Notcoin توی داده‌های API پیدا نشد!");
    }
    return data;
  } catch (error) {
    console.error("خطا در دریافت داده‌های واچ‌لیست:", error.message);
    throw error; // خطا رو به بالا پرت می‌کنه تا توی ربات مدیریت بشه
  }
}

async function getMarketOverview() {
  const response = await axios.get("https://api.coingecko.com/api/v3/global");
  return response.data.data;
}

async function getTetherPrice() {
  const response = await axios.get("https://api.arzdigital.com/market.json");
  const tetherData = response.data.find((currency) => currency.id === "tether");
  if (!tetherData) throw new Error("اطلاعات تتر در دسترس نیست");
  return tetherData.price / 10;
}

module.exports = { isUserMember, getWatchlistData, getMarketOverview, getTetherPrice };