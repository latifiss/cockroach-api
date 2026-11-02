const mongoose = require('mongoose');

const schedulerLeaseSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  owner: { type: String, required: true },
  lease_until: { type: Date, required: true },
  acquired_at: { type: Date, required: true },
}, { versionKey: false });

module.exports = mongoose.models.SchedulerLease || mongoose.model('SchedulerLease', schedulerLeaseSchema);
