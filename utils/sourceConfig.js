const SOURCE_CATEGORIES = new Set([
  'News',
  'Politics',
  'Local',
  'Business & Finance',
  'Sports',
  'World',
  'Africa',
  'Games',
  'Science & Health',
  'Entertainment',
  'Technology',
  'Lifestyle',
]);

function assertSourceCategory(category) {
  if (!SOURCE_CATEGORIES.has(category)) {
    throw new TypeError(`Invalid source_category: ${category}`);
  }
}

function attachSourceConfigName(exports, sourceConfig) {
  const configs = Object.values(sourceConfig || {});
  const names = [...new Set(configs
    .map((config) => (typeof config?.name === 'string' ? config.name.trim() : ''))
    .filter(Boolean))];
  const domains = [...new Set(configs
    .map((config) => (typeof config?.domain_url === 'string' ? config.domain_url.trim() : ''))
    .filter(Boolean))];
  const categories = [...new Set(configs
    .map((config) => config?.source_category)
    .filter(Boolean))];

  if (names.length > 1) {
    throw new Error('A source module must use one display name across its SOURCE_CONFIG entries');
  }
  if (domains.length > 1) {
    throw new Error('A source module must use one domain_url across its SOURCE_CONFIG entries');
  }
  if (categories.length !== 1) {
    throw new Error('A source module must use one source_category across its SOURCE_CONFIG entries');
  }
  assertSourceCategory(categories[0]);
  if (names.length === 0) return exports;

  const exportedValues = typeof exports === 'function' ? [exports] : Object.values(exports || {});
  for (const exported of exportedValues) {
    if (typeof exported !== 'function') continue;
    exported.sourceName = names[0];
    if (domains[0]) exported.domainUrl = domains[0];
    exported.sourceCategory = categories[0];
  }

  return exports;
}

function attachSourceDomainUrl(exports, domainUrl, sourceCategory) {
  const value = typeof domainUrl === 'string' ? domainUrl.trim() : '';
  if (!value) throw new TypeError('domain_url must be a non-empty string');
  assertSourceCategory(sourceCategory);

  const exportedValues = typeof exports === 'function' ? [exports] : Object.values(exports || {});
  let attached = false;
  for (const exported of exportedValues) {
    if (typeof exported !== 'function') continue;
    exported.domainUrl = value;
    exported.sourceCategory = sourceCategory;
    attached = true;
  }

  if (!attached) throw new TypeError('Source module must export at least one fetch function');
  return exports;
}

function attachSourceCategory(exports, sourceCategory) {
  assertSourceCategory(sourceCategory);

  const exportedValues = typeof exports === 'function' ? [exports] : Object.values(exports || {});
  let attached = false;
  for (const exported of exportedValues) {
    if (typeof exported !== 'function') continue;
    exported.sourceCategory = sourceCategory;
    attached = true;
  }

  if (!attached) throw new TypeError('Source module must export at least one fetch function');
  return exports;
}

module.exports = { attachSourceConfigName, attachSourceDomainUrl, attachSourceCategory, SOURCE_CATEGORIES };
