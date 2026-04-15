function generateSlug(title) {
  if (!title) return '';
  return title
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

function generateMetaTitle(title) {
  if (!title) return '';
  // Make it SEO-friendly and concise
  const cleanedTitle = title.replace(/[^a-zA-Z0-9\s-]/g, '');
  if (cleanedTitle.length <= 60) return cleanedTitle;
  return cleanedTitle.substring(0, 57).trim() + '...';
}

function generateMetaDescription(article) {
  if (article.summary) {
    return article.summary.substring(0, 155).trim();
  }

  const title = article.title || 'news update';
  const source = article.source_name || 'a trusted source';

  return `${title}. Stay updated with the latest from ${source}.`.substring(
    0,
    155
  );
}

// Export all functions
module.exports = {
  generateSlug,
  generateMetaTitle,
  generateMetaDescription,
};
