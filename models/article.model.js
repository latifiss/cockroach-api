const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const articleSchema = new Schema(
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
      default: true,
    },
    isLive: {
      type: Boolean,
      required: true,
      enum: [true, false],
      default: false,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    categories: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    isBreaking: {
      type: Boolean,
      required: true,
      enum: [true, false],
      default: true,
    },
    label: {
      type: String,
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
      required: true,
      trim: true,
    },
    source_tags: {
      type: [String],
      default: [],
    },
    creator: {
      type: String,
      default: 'Admin',
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

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
