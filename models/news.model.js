const mongoose = require('mongoose');
const { SOURCE_CATEGORIES } = require('../utils/sourceConfig');
const Schema = mongoose.Schema;

const articleSchema = new Schema(
  {
    article_id: { type: String, required: true },
    stamp: { type: String },
    title: { type: String, required: true, trim: true },
    isFirstParty: { type: Boolean, required: true, enum: [true, false], default: false },
    description: { type: String, required: false },
    content: { type: String, required: false },
    categories: [{ type: String, trim: true }],
    isBreaking: { type: Boolean, required: true, enum: [true, false], default: false },
    label: { type: String, required: false, trim: true },
    has_image: { type: Boolean, required: true, enum: [true, false], default: true },
    source_name: { type: String, required: true, trim: true, default: 'Ghanaian web' },
    meta: { type: String, required: true, trim: true },
    source_tags: [{ type: String, required: true, trim: true }],
    creator: { type: String, default: '' },
    slug: { type: String, required: true, trim: true, unique: true },
    image_url: { type: String, required: false },
    link: { type: String, default: '' },
    published_at: { type: Date, required: true },
    source_origin: { type: String, default: 'Ghana' },
    source_id: { type: String, required: true, default: 'Ghweb1234567899' },
    publisher_id: { type: String, default: '' },
    collector_id: { type: String, default: '' },
    domain_url: { type: String, default: '' },
    source_category: { type: String, enum: [...SOURCE_CATEGORIES], default: 'News' },
    source_credibility: { type: Number, default: null },
    source_link: { type: String, required: true },
    article_type: { type: String, enum: ['main', 'sub'], required: true, default: 'sub' },
  },
  { timestamps: true }
);

const NewsSchema = new mongoose.Schema(
  {
    cluster_id: { type: String, required: true, unique: true },
    size: { type: Number, default: 0 },
    representative_title: { type: String },
    average_relevance: { type: Number, default: 0 },
    articles: { type: [articleSchema], default: [] },
  },
  { timestamps: true }
);

NewsSchema.index({ average_relevance: -1, updatedAt: -1 });

module.exports = mongoose.models.News || mongoose.model('News', NewsSchema);
