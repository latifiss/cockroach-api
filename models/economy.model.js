const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const rateHistorySchema = new Schema(
  {
    for_month: { type: Number, required: true },
    for_year: { type: Number, required: true },
    rate: { type: Number, required: true },
    percentage_change: { type: Number, required: true },
  },
  { _id: false }
);

const rHistorySchema = new Schema(
  {
    for_quater: { type: String, required: true },
    for_year: { type: Number, required: true },
    rate: { type: Number, required: true },
    percentage_change: { type: Number, required: true },
  },
  { _id: false }
);

const vHistorySchema = new Schema(
  {
    value: { type: Number, required: true },
    value_currency: { type: String, required: true, default: 'USD' },
    for_year: { type: Number, required: true },
  },
  { _id: false }
);

const rrHistorySchema = new Schema(
  {
    for_month: { type: Number, required: true },
    for_year: { type: Number, required: true },
    rate: { type: Number, required: true },
  },
  { _id: false }
);

const rqHistorySchema = new Schema(
  {
    for_quater: { type: String, required: true },
    for_year: { type: Number, required: true },
    value: { type: Number, required: true },
    value_currency: { type: String, required: true, default: 'USD' },
  },
  { _id: false }
);

const rbHistorySchema = new Schema(
  {
    value: { type: Number, required: true },
    value_currency: { type: String, required: true, default: 'GHS' },
    for_quater: { type: String, required: true },
    for_year: { type: Number, required: true },
  },
  { _id: false }
);

const reservesHistorySchema = new Schema(
  {
    value: { type: Number, required: true },
    value_currency: { type: String, required: true, default: 'Tonnes' },
    for_quater: { type: Number, required: true },
    for_year: { type: Number, required: true },
  },
  { _id: false }
);

const tHistorySchema = new Schema(
  {
    value: { type: Number, required: true },
    value_currency: { type: String, required: true, default: 'USD' },
    for_quater: { type: Number, required: true },
    for_year: { type: Number, required: true },
  },
  { _id: false }
);

//---------Prices-------------------

const ghInflationSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHCPI',
  },
  name: { type: String, required: true, default: 'Inflation Rate' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Inflation Rate YoY',
  },
  current_rate: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  for_month: { type: Number, required: true },
  for_year: { type: Number, required: true },
  rate_history: [rateHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

const ghFoodInflationSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHFI',
  },
  name: { type: String, required: true, default: 'Food Inflation Rate' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Food Inflation Rate YoY',
  },
  current_rate: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  for_month: { type: Number, required: true },
  for_year: { type: Number, required: true },
  rate_history: [rateHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

const ghProducerPriceIndexSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHPPI',
  },
  name: { type: String, required: true, default: 'Producer Price Index' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Producer Price Index YoY',
  },
  current_rate: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  for_month: { type: Number, required: true },
  for_year: { type: Number, required: true },
  rate_history: [rateHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

//---------GDP-------------------

const ghGDPGrowthRateSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHGDPGR',
  },
  name: { type: String, required: true, default: 'GDP Growth Rate' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana GDP Growth Rate YoY',
  },
  current_rate: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  for_quater: { type: String, required: true },
  for_year: { type: Number, required: true },
  rate_history: [rHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

const ghGDPSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHGDP',
  },
  name: { type: String, required: true, default: 'GDP' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana GDP',
  },
  current_value: { type: Number, required: true },
  value_currency: { type: String, required: true, default: 'USD' },
  for_year: { type: Number, required: true },
  value_history: [vHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

const ghGDPCapitaSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHGDPPC',
  },
  name: { type: String, required: true, default: 'GDP Per Capita' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana GDP Per Capita',
  },
  current_value: { type: Number, required: true },
  value_currency: { type: String, required: true, default: 'USD' },
  for_year: { type: Number, required: true },
  value_history: [vHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

const ghGDPCapitaPPPSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHGDPPCP',
  },
  name: { type: String, required: true, default: 'GDP Per Capita PPP' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana GDP Per Capita PPP',
  },
  current_value: { type: Number, required: true },
  value_currency: { type: String, required: true, default: 'USD' },
  for_year: { type: Number, required: true },
  value_history: [vHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

const ghUnemploymentSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHUE',
  },
  name: { type: String, required: true, default: 'Unemployment Rate' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Unemployment Rate YoY',
  },
  current_rate: { type: Number, required: true },
  for_month: { type: Number, required: true },
  for_year: { type: Number, required: true },
  rate_history: [rrHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

//---------Money-------------------

const ghInterestRateSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHIR',
  },
  name: { type: String, required: true, default: 'Interest Rate' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Interest Rate YoY',
  },
  current_rate: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  for_month: { type: Number, required: true },
  for_year: { type: Number, required: true },
  rate_history: [rateHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

const ghForeingExchangeReservesSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHFER',
  },
  name: { type: String, required: true, default: 'Foreign Exchange Reserves' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Foreign Exchange Reserves',
  },
  current_value: { type: Number, required: true },
  value_currency: { type: String, required: true, default: 'USD' },
  for_quater: { type: String, required: true },
  for_year: { type: Number, required: true },
  value_history: [rqHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

const ghBanksBalanceSheetSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHBBS',
  },
  name: { type: String, required: true, default: 'Banks Balance Sheet' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Banks Balance Sheet',
  },
  current_value: { type: Number, required: true },
  value_currency: { type: String, required: true, default: 'GHS' },
  for_quater: { type: String, required: true },
  for_year: { type: Number, required: true },
  value_history: [rbHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

//---------Government Credit Rating-------------------
const ghCreditRatingSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  full_name: {
    type: String,
    required: true,
  },
  rating: { type: String, required: true },
  for_quater: { type: String, required: true },
  for_year: { type: Number, required: true },
  last_updated: { type: Date, default: Date.now },
});

//---------Trade-------------------
const ghExternalDebtSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHED',
  },
  name: { type: String, required: true, default: 'External Debt' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana External Debt',
  },
  current_value: { type: Number, required: true },
  value_currency: { type: String, required: true, default: 'USD' },
  for_quater: { type: Number, required: true },
  for_year: { type: Number, required: true },
  value_history: [tHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

const ghExportsSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHEX',
  },
  name: { type: String, required: true, default: 'Exports' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Exports',
  },
  current_value: { type: Number, required: true },
  value_currency: { type: String, required: true, default: 'USD' },
  for_quater: { type: Number, required: true },
  for_year: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  value_history: [tHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

const ghImportsSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHIM',
  },
  name: { type: String, required: true, default: 'Imports' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Imports',
  },
  current_value: { type: Number, required: true },
  value_currency: { type: String, required: true, default: 'USD' },
  for_quater: { type: Number, required: true },
  for_year: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  value_history: [tHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

const ghBalanceOfTradeSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHBOT',
  },
  name: { type: String, required: true, default: 'Balance of Trade' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Balance of Trade',
  },
  current_value: { type: Number, required: true },
  value_currency: { type: String, required: true, default: 'USD' },
  for_quater: { type: Number, required: true },
  for_year: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  value_history: [tHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

const ghGoldReservesSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHGR',
  },
  name: { type: String, required: true, default: 'Gold Reserves' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Gold Reserves',
  },
  current_value: { type: Number, required: true },
  value_currency: { type: String, required: true, default: 'Tonnes' },
  for_quater: { type: Number, required: true },
  for_year: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  value_history: [reservesHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

//---------Government-------------------

const ghGovernmentBudgetValueSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHGBV',
  },
  name: { type: String, required: true, default: 'Government Budget Value' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Government Budget Value',
  },
  current_value: { type: Number, required: true },
  value_currency: { type: String, required: true, default: 'GHS' },
  for_year: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  last_updated: { type: Date, default: Date.now },
});

const ghFiscalExpenditureSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHGFE',
  },
  name: { type: String, required: true, default: 'Fiscal Expenditure' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Fiscal Expenditure',
  },
  current_value: { type: Number, required: true },
  value_currency: { type: String, required: true, default: 'GHS' },
  for_year: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  last_updated: { type: Date, default: Date.now },
});

const ghGovernmentSpendingSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHGS',
  },
  name: { type: String, required: true, default: 'Government Spending' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Government Spending',
  },
  current_value: { type: Number, required: true },
  value_currency: { type: String, required: true, default: 'GHS' },
  for_year: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  last_updated: { type: Date, default: Date.now },
});

const ghGovernmentRevenuesSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: 'GHGR',
  },
  name: { type: String, required: true, default: 'Government Revenues' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Government Revenues',
  },
  current_value: { type: Number, required: true },
  value_currency: { type: String, required: true, default: 'GHS' },
  for_year: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  last_updated: { type: Date, default: Date.now },
});

const ghGovernmentDebtToGDPSchema = new Schema({
  code: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    default: 'GHGDTG',
  },
  name: { type: String, required: true, default: 'Government Debt To GDP' },
  full_name: {
    type: String,
    required: true,
    default: 'Ghana Government Debt To GDP',
  },
  percentage: { type: Number, required: true },
  for_year: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  last_updated: { type: Date, default: Date.now },
});

const GhInflation = mongoose.model('GhInflation', ghInflationSchema);
const GhFoodInflation = mongoose.model(
  'GhFoodInflation',
  ghFoodInflationSchema
);
const GhProducerPriceIndex = mongoose.model(
  'GhProducerPriceIndex',
  ghProducerPriceIndexSchema
);

const GHGDPGrowthRate = mongoose.model(
  'GHGDPGrowthRate',
  ghGDPGrowthRateSchema
);
const GHGDP = mongoose.model('GHGDP', ghGDPSchema);
const GHGDPPerCapita = mongoose.model('GHGDPPerCapita', ghGDPCapitaSchema);
const GHGDPPerCapitaPPP = mongoose.model(
  'GHGDPPerCapitaPPP',
  ghGDPCapitaPPPSchema
);
const GHUnemployment = mongoose.model('GHUnemployment', ghUnemploymentSchema);
const GHInterestRate = mongoose.model('GHInterestRate', ghInterestRateSchema);
const GHForeignExchangeReserves = mongoose.model(
  'GHForeignExchangeReserves',
  ghForeingExchangeReservesSchema
);
const GHBanksBalanceSheet = mongoose.model(
  'GHBanksBalanceSheet',
  ghBanksBalanceSheetSchema
);

const GHCreditRating = mongoose.model('GHCreditRating', ghCreditRatingSchema);

const GHExternalDebt = mongoose.model('GHExternalDebt', ghExternalDebtSchema);
const GHExports = mongoose.model('GHExports', ghExportsSchema);
const GHImports = mongoose.model('GHImports', ghImportsSchema);
const GHBalanceOfTrade = mongoose.model(
  'GHBalanceOfTrade',
  ghBalanceOfTradeSchema
);
const GHGoldReserves = mongoose.model('GHGoldReserves', ghGoldReservesSchema);

const GHGovernmentBudgetValue = mongoose.model(
  'GHGovernmentBudgetValue',
  ghGovernmentBudgetValueSchema
);
const GHFiscalExpenditure = mongoose.model(
  'GHFiscalExpenditure',
  ghFiscalExpenditureSchema
);
const GHGovernmentSpending = mongoose.model(
  'GHGovernmentSpending',
  ghGovernmentSpendingSchema
);
const GHGovernmentRevenues = mongoose.model(
  'GHGovernmentRevenues',
  ghGovernmentRevenuesSchema
);
const GHGovernmentDebttoGDP = mongoose.model(
  'GHGovernmentDebttoGDP',
  ghGovernmentDebtToGDPSchema
);

module.exports = GhInflation;
module.exports = GhFoodInflation;
module.exports = GhProducerPriceIndex;

module.exports = GHGDPGrowthRate;
module.exports = GHGDP;
module.exports = GHGDPPerCapita;
module.exports = GHGDPPerCapitaPPP;
module.exports = GHUnemployment;

module.exports = GHInterestRate;
module.exports = GHForeignExchangeReserves;
module.exports = GHBanksBalanceSheet;

module.exports = GHCreditRating;

module.exports = GHExternalDebt;
module.exports = GHExports;
module.exports = GHImports;
module.exports = GHBalanceOfTrade;
module.exports = GHGoldReserves;

module.exports = GHGovernmentBudgetValue;
module.exports = GHFiscalExpenditure;
module.exports = GHGovernmentSpending;
module.exports = GHGovernmentRevenues;
module.exports = GHGovernmentDebttoGDP;
