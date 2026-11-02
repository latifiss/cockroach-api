const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const latestSchema = new Schema(
  {
    article_id: {
      type: String,
      required: true,
    },
    stamp: {
      type: String,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    isFirstParty: {
      type: Boolean,
      required: true,
      enum: [true, false],
      default: false,
    },
    description: {
      type: String,
      required: false,
    },
    content: {
      type: String,
      required: false,
    },
    categories: [
      {
        type: String,
        trim: true,
      },
    ],
    relevance_score: { type: Number, default: 1 },
    isBreaking: {
      type: Boolean,
      required: true,
      enum: [true, false],
      default: false,
    },
    label: {
      type: String,
      required: false,
      trim: true,
    },
    has_image: {
      type: Boolean,
      required: true,
      enum: [true, false],
      default: true,
    },
    source_name: {
      type: String,
      required: true,
      trim: true,
      default: 'Ghanaian web',
    },
    meta: {
      type: String,
      trim: true,
      default: '',
    },
    meta_title: {
      type: String,
      required: true,
      trim: true,
      default: '',
    },
    meta_description: {
      type: String,
      required: true,
      trim: true,
      default: '',
    },
    source_tags: {
      type: [String],
      default: [],
    },
    creator: {
      type: String,
      default: '',
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    image_url: {
      type: String,
      required: false,
    },
    link: { type: String, default: '' },
    canonical_url: { type: String, default: '' },
    first_seen_at: { type: Date, default: Date.now },
    published_at: {
      type: Date,
      required: true,
    },
    source_origin: {
      type: String,
      default: 'Ghana',
    },
    source_id: {
      type: String,
      required: true,
      default: 'Ghweb1234567899',
    },
    source_link: {
      type: String,
      default: '',
    },
    source_tags: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Latest = mongoose.model('Latest', latestSchema);

module.exports = Latest;
