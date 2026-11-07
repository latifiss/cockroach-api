const mongoose = require('mongoose');

const newsPersistenceGuardSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  revision: { type: Number, required: true, default: 0 },
}, { versionKey: false });

module.exports = mongoose.models.NewsPersistenceGuard
  || mongoose.model('NewsPersistenceGuard', newsPersistenceGuardSchema);
