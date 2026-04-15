// This module manages core and recent articles in memory
let coreArticles = [];
let lastUpdated = 0; // timestamp of last core update
const CORE_REFRESH_INTERVAL = 1000 * 60 * 60 * 6; // 6 hours

function getCoreNewsArticles() {
  return coreArticles;
}

function setCoreNewsArticles(newCore) {
  coreArticles = newCore;
  lastUpdated = Date.now();
}

function coreNeedsRefresh() {
  return Date.now() - lastUpdated > CORE_REFRESH_INTERVAL;
}

module.exports = {
  getCoreNewsArticles,
  setCoreNewsArticles,
  coreNeedsRefresh,
};
