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
    return response.data;
  } catch (error) {
    console.error("خطا در دریافت داده‌های واچ‌لیست:", error.message);
    throw error;
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

async function getFearGreedIndex() {
  try {
    const response = await axios.get("https://api.alternative.me/fng/?limit=1");
    return response.data.data[0];
  } catch (error) {
    console.error("خطا در دریافت شاخص ترس و طمع:", error.message);
    return null;
  }
}

async function getTopGainersAndLosers() {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h"
    );
    const coins = response.data;
    coins.sort(
      (a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h
    );
    return {
      topGainers: coins.slice(0, 5),
      topLosers: coins.slice(-5).reverse(),
    };
  } catch (error) {
    console.error("خطا در دریافت برترین رشد و ریزش:", error.message);
    return null;
  }
}

async function getGoldAndCoinPrices() {
  try {
    const response = await axios.get("https://api.navasan.tech/latest", {
      params: { api_key: "freemHJDIZZKzELPq5dncIfCXeXjtjv6" }, // کلید API خودت رو بذار
    });
    const data = response.data;
    console.log("Gold and Coin API Response:", data);
    return {
      goldGram: parseInt(data["geram18"]?.["value"]) || 0,
      fullCoin: parseInt(data["sekee"]?.["value"]) || 0,
      halfCoin: parseInt(data["nim"]?.["value"]) || 0,
      quarterCoin: parseInt(data["rob"]?.["value"]) || 0,
    };
  } catch (error) {
    console.error("خطا در دریافت قیمت سکه و طلا:", error.message);
    return { goldGram: 0, fullCoin: 0, halfCoin: 0, quarterCoin: 0 };
  }
}

async function getDollarPrice() {
  try {
    const response = await axios.get("https://api.navasan.tech/latest", {
      params: { api_key: "freemHJDIZZKzELPq5dncIfCXeXjtjv6" }, // کلید API خودت رو بذار
    });
    const data = response.data;
    console.log("Dollar API Response:", data);
    return parseInt(data["usd"]?.["value"]) || 0;
  } catch (error) {
    console.error("خطا در دریافت قیمت دلار:", error.message);
    return 0;
  }
}

module.exports = {
  isUserMember,
  getWatchlistData,
  getMarketOverview,
  getTetherPrice,
  getFearGreedIndex,
  getTopGainersAndLosers,
  getGoldAndCoinPrices,
  getDollarPrice,
};
