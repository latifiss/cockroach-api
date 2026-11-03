const mongoose = require('mongoose');

const sourceHealthSchema = new mongoose.Schema({
  source_id: { type: String, required: true, unique: true },
  source_name: { type: String, required: true, trim: true },
  status: { type: String, enum: ['healthy', 'degraded', 'failing', 'unknown'], default: 'unknown', index: true },
  consecutive_failures: { type: Number, default: 0, min: 0 },
  total_runs: { type: Number, default: 0, min: 0 },
  successful_runs: { type: Number, default: 0, min: 0 },
  failed_runs: { type: Number, default: 0, min: 0 },
  last_attempt_at: { type: Date, default: null },
  last_success_at: { type: Date, default: null },
  last_failure_at: { type: Date, default: null },
  last_error_code: { type: String, default: null },
  last_error_message: { type: String, default: null },
  last_duration_ms: { type: Number, default: null },
  last_article_count: { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });

sourceHealthSchema.index({ status: 1, last_attempt_at: -1 });

module.exports = mongoose.models.SourceHealth || mongoose.model('SourceHealth', sourceHealthSchema);
