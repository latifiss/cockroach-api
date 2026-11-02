const mongoose = require('mongoose');

const sourceOutcomeSchema = new mongoose.Schema({
  source_id: { type: String, required: true },
  status: { type: String, enum: ['succeeded', 'failed'], required: true },
  attempts: { type: Number, required: true, min: 1 },
  started_at: { type: Date, required: true },
  completed_at: { type: Date, required: true },
  duration_ms: { type: Number, required: true, min: 0 },
  article_count: { type: Number, default: 0, min: 0 },
  error_code: { type: String, default: null },
  error_message: { type: String, default: null },
}, { _id: false });

const collectionRunSchema = new mongoose.Schema({
  status: { type: String, enum: ['running', 'completed', 'completed_with_errors', 'failed'], required: true },
  started_at: { type: Date, required: true },
  completed_at: { type: Date, default: null },
  duration_ms: { type: Number, default: null },
  source_count: { type: Number, default: 0 },
  succeeded_count: { type: Number, default: 0 },
  failed_count: { type: Number, default: 0 },
  article_count: { type: Number, default: 0 },
  source_outcomes: { type: [sourceOutcomeSchema], default: [] },
}, { timestamps: true, versionKey: false });

collectionRunSchema.index({ started_at: -1 });
collectionRunSchema.index({ status: 1, started_at: -1 });

module.exports = mongoose.models.CollectionRun || mongoose.model('CollectionRun', collectionRunSchema);
