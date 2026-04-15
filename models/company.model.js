const mongoose = require('mongoose');

const annualRevenueHistorySchema = new Schema(
  {
    for_year: { type: Number, required: true },
    value: { type: Number, required: true },
    value_currency: { type: String, required: true },
  },
  { _id: false }
);

const quarterlyRevenueHistorySchema = new Schema(
  {
    for_quater: { type: String, required: true },
    for_year: { type: Number, required: true },
    value: { type: Number, required: true },
    value_currency: { type: String, required: true },
  },
  { _id: false }
);

const annualRevenueBreakdownSchema = new Schema(
  {
    for_year: { type: Number },
    title: { type: String },
    title_value: { type: Number },
    value_currency: { type: String },
  },
  { _id: false }
);

const quarterlyRevenueBreakdownSchema = new Schema(
  {
    for_quater: { type: String },
    for_year: { type: Number },
    title: { type: String },
    title_value: { type: Number },
    value_currency: { type: String },
  },
  { _id: false }
);

const annualNetIcomeHistorySchema = new Schema(
  {
    for_year: { type: Number, required: true },
    value: { type: Number, required: true },
    value_currency: { type: String, required: true },
  },
  { _id: false }
);

const quarterlyNetIcomeHistorySchema = new Schema(
  {
    for_quater: { type: String, required: true },
    for_year: { type: Number, required: true },
    value: { type: Number, required: true },
    value_currency: { type: String, required: true },
  },
  { _id: false }
);

const annualNetMarginHistorySchema = new Schema(
  {
    for_year: { type: Number, required: true },
    value: { type: Number, required: true },
  },
  { _id: false }
);

const quarterlyNetMarginHistorySchema = new Schema(
  {
    for_quater: { type: String, required: true },
    for_year: { type: Number, required: true },
    value: { type: Number, required: true },
  },
  { _id: false }
);

const keyStatsSchema = new Schema(
  {
    market_capitalization: { type: String },
    price_earning_ratio: { type: Number },
    volume: { type: Number },
    revenue: { type: String },
    revenue_currency: { type: String },
    netIncome: { type: String },
    netIncome_currency: { type: String },
    dividend_yield: { type: Number },
    dividend_per_share: { type: Number },
    earnings_per_share: { type: Number },
    shares_outstanding: { type: String },
    fifty_two_week_high: { type: Number },
    fifty_two_week_high_date: { type: String },
    fifty_two_week_low: { type: Number },
    fifty_two_week_low_date: { type: String },
    open_price: { type: String },
    previous_close_price: { type: String },
    percentage_change: { type: Number },
    currency: { type: String, required: true },
    current_price: { type: String, required: true },
    status: { type: String, enum: ['open', 'close'] },
  },
  { _id: false }
);

const eventsSchema = new Schema(
  {
    next_earnings_date: { type: Date },
    next_dividend_pay_date: { type: Date },
    last_dividend_pay_date: { type: Date },
    dividend_growth: { type: String },
  },
  { _id: false }
);

const aboutSchema = new Schema(
  {
    company_name: { type: String, required: true },
    slug: { type: String, required: true },
    year_founded: { type: String, required: true },
    industry: { type: String, required: true },
    isin_symbol: { type: String, required: true },
    website: { type: String, required: true },
    headquaters: { type: String, required: true },
    exchange_symbol: { type: String, required: true },
    ticker_symbol: { type: String, required: true },
    unique_symbol: { type: String, required: true },
    company_description: { type: String, required: true },
    number_of_employees: { type: String },
    country: { type: String, required: true },
    currency: { type: String, required: true },
    chief_executive_officer: { type: String, required: true },
  },
  { _id: false }
);

const returnsSchema = new Schema(
  {
    five_days_returns: { type: Number },
    one_month_returns: { type: Number },
    three_months_returns: { type: Number },
    one_year_returns: { type: Number },
  },
  { _id: false }
);

const annualRevenueToProfitConversionSchema = new Schema(
  {
    revenue: { type: Number },
    cogs: { type: Number },
    gross_profit: { type: Number },
    operating_expenses: { type: Number },
    operating_income: { type: Number },
    non_operating_income_expenses: { type: Number },
    taxes_and_other: { type: Number },
    net_income: { type: Number },
  },
  { _id: false }
);

const auarterlyRevenueToProfitConversionSchema = new Schema(
  {
    revenue: { type: Number },
    cogs: { type: Number },
    gross_profit: { type: Number },
    operating_expenses: { type: Number },
    operating_income: { type: Number },
    non_operating_income_expenses: { type: Number },
    taxes_and_other: { type: Number },
    net_income: { type: Number },
  },
  { _id: false }
);

const annuallyDebtLevelAndCoverageSchema = new Schema(
  {
    for_year: { type: Number },
    debt_value: { type: Number },
    free_cash_flow_value: { type: Number },
    cash_and_equivalents_value: { type: Number },
    value_currency: { type: String },
  },
  { _id: false }
);

const quarterlyDebtLevelAndCoverageSchema = new Schema(
  {
    for_quater: { type: String },
    for_year: { type: Number },
    debt_value: { type: Number },
    free_cash_flow_value: { type: Number },
    cash_and_equivalents_value: { type: Number },
    value_currency: { type: String },
  },
  { _id: false }
);

const listingAndSharesSchema = new Schema(
  {
    exchange_listed_name: { type: String, required: true },
    exchange_code: { type: String, required: true },
    exchange_slug: { type: String, required: true },
    date_listed: { type: String },
    authorized_shares: { type: String },
    issued_shares: { type: String },
  },
  { _id: false }
);

const CompanySchema = new mongoose.Schema(
  {
    company_id: String,
    about: aboutSchema,
    key_statistics: keyStatsSchema,
    events: eventsSchema,
    returns: returnsSchema,
    shares: listingAndSharesSchema,
    annual_revenue_histroy: [annualRevenueHistorySchema],
    quarterly_revenue_history: [quarterlyRevenueHistorySchema],
    annual_net_income_history: [annualNetIcomeHistorySchema],
    quarterly_net_income_history: [quarterlyNetIcomeHistorySchema],
    annual_net_margin_history: [annualNetMarginHistorySchema],
    quarterly_net_margin_history: [quarterlyNetMarginHistorySchema],
    annual_revenue_breakdown: [annualRevenueBreakdownSchema],
    quarterly_revenue_breakdown: [quarterlyRevenueBreakdownSchema],
    annual_revenue_to_profit_conversion: annualRevenueToProfitConversionSchema,
    quarterly_revenue_to_profit_conversion:
      auarterlyRevenueToProfitConversionSchema,
    annual_debt_level_and_coverage: [annuallyDebtLevelAndCoverageSchema],
    quarterly_debt_level_and_coverage: [quarterlyDebtLevelAndCoverageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', CompanySchema);
