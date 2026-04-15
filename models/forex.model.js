const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const priceHistorySchema = new Schema(
  {
    date: { type: Date, required: true },
    price: { type: Number, required: true },
    percentage_change: { type: Number, required: true },
  },
  { _id: false }
);

const forexSchema = new Schema({
  name: { type: String, required: true },
  from_currency: { type: String, required: true },
  from_code: { type: String, required: true, uppercase: true, length: 3 },
  to_currency: { type: String, required: true },
  to_code: { type: String, required: true, uppercase: true, length: 3 },
  currentPrice: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  monthly_change: { type: Number, required: true },
  yearly_change: { type: Number, required: true },
  price_history: [priceHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

const Forex = mongoose.model('Forex', forexSchema);

module.exports = Forex;
