const axios = require('axios');

async function getMarketCapData() {
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1'
    );

    console.log('Top 100 Cryptocurrencies by Market Cap:');
    console.log('='.repeat(80));

    response.data.forEach((crypto, index) => {
      console.log(
        `${index + 1}. ${crypto.name.padEnd(
          15
        )} (${crypto.symbol.toUpperCase()}) | ` +
          `Price: $${crypto.current_price.toLocaleString().padEnd(12)} | ` +
          `Market Cap: $${(crypto.market_cap / 1000000000).toFixed(2)}B | ` +
          `24h Change: ${crypto.price_change_percentage_24h.toFixed(2)}%`
      );
    });

    console.log('='.repeat(80));
    console.log(
      `Data updated at: ${new Date(
        response.data[0].last_updated
      ).toLocaleString()}`
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching market cap data:', error.message);
    throw error;
  }
}

getMarketCapData();
