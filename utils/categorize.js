const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const classifier = new natural.BayesClassifier();

// Categories for classification
const categories = [
  'Politics',
  'Technology',
  'Environment',
  'Sports',
  'Health',
];

// Sample training data for the classifier
const trainingData = [
  {
    text: 'The government is introducing new climate policies to tackle global warming.',
    category: 'Politics',
  },
  {
    text: 'AI and machine learning are transforming industries worldwide.',
    category: 'Technology',
  },
  {
    text: 'Global temperatures are rising and sea levels are a major concern.',
    category: 'Environment',
  },
  {
    text: 'The national soccer team is preparing for the World Cup.',
    category: 'Sports',
  },
  {
    text: 'Doctors recommend new strategies to combat the flu virus this season.',
    category: 'Health',
  },
];

trainingData.forEach((data) =>
  classifier.addDocument(data.text, data.category)
);
classifier.train();

function categorizeArticle(article) {
  const tokens = tokenizer.tokenize(article.text.toLowerCase());
  const keywords = tokens.filter((token) => token.length > 3);
  const category = classifier.classify(article.text);

  return {
    category,
    keywords,
  };
}

function categorizeArticles(articles) {
  return articles.map((article) => ({
    ...article,
    categorization: categorizeArticle(article),
  }));
}

module.exports = {
  categorizeArticles,
};
