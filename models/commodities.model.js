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

const commoditySchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  unit: { type: String, required: true },
  category: {
    type: String,
    enum: ['precious-metal', 'mineral', 'agricultural', 'energy'],
    required: true,
  },
  currentPrice: { type: Number, required: true },
  percentage_change: { type: Number, required: true },
  price_history: [priceHistorySchema],
  last_updated: { type: Date, default: Date.now },
});

const Commodity = mongoose.model('Commodity', commoditySchema);

module.exports = Commodity;
