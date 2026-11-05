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

function getExportedFunctions(exports) {
  return (typeof exports === 'function' ? [exports] : Object.values(exports || {}))
    .filter((value) => typeof value === 'function');
}

function attachSourceConfigName(exports, sourceConfig) {
  const configs = Object.values(sourceConfig || {});
  if (configs.length === 0) throw new TypeError('sourceConfig must contain at least one source configuration');

  const names = [...new Set(configs
    .map((config) => (typeof config?.name === 'string' ? config.name.trim() : ''))
    .filter(Boolean))];
  const domains = [...new Set(configs
    .map((config) => (typeof config?.domain_url === 'string' ? config.domain_url.trim() : ''))
    .filter(Boolean))];
  const categories = [...new Set(configs
    .map((config) => config?.source_category)
    .filter(Boolean))];
  const ids = [...new Set(configs
    .map((config) => config?.id)
    .filter((id) => id !== undefined && id !== null && String(id).trim() !== '')
    .map(String))];
  const origins = [...new Set(configs
    .map((config) => (typeof config?.origin === 'string' ? config.origin.trim() : ''))
    .filter(Boolean))];
  const tags = [...new Set(configs.flatMap((config) => Array.isArray(config?.tags) ? config.tags : [])
    .filter((tag) => typeof tag === 'string' && tag.trim())
    .map((tag) => tag.trim()))];
  const credibilityValues = [...new Set(configs
    .map((config) => config?.credibility)
    .filter((value) => value !== undefined && value !== null))];

  if (names.length > 1) throw new Error('A source module must use one display name across its SOURCE_CONFIG entries');
  if (domains.length > 1) throw new Error('A source module must use one domain_url across its SOURCE_CONFIG entries');
  if (categories.length !== 1) throw new Error('A source module must use one source_category across its SOURCE_CONFIG entries');
  if (ids.length > 1) throw new Error('A source module must use one id across its SOURCE_CONFIG entries');
  if (origins.length > 1) throw new Error('A source module must use one origin across its SOURCE_CONFIG entries');
  if (credibilityValues.length > 1) throw new Error('A source module must use one credibility value across its SOURCE_CONFIG entries');

  assertSourceCategory(categories[0]);

  const exportedValues = getExportedFunctions(exports);
  if (exportedValues.length === 0) throw new TypeError('Source module must export at least one fetch function');

  for (const exported of exportedValues) {
    if (names[0]) exported.sourceName = names[0];
    if (ids[0]) exported.sourceId = ids[0];
    if (domains[0]) exported.domainUrl = domains[0];
    exported.sourceCategory = categories[0];
    if (origins[0]) exported.sourceOrigin = origins[0];
    exported.sourceTags = tags;
    if (credibilityValues.length) exported.sourceCredibility = credibilityValues[0];
  }

  return exports;
}

function attachSourceDomainUrl(exports, domainUrl, sourceCategory) {
  const value = typeof domainUrl === 'string' ? domainUrl.trim() : '';
  if (!value) throw new TypeError('domain_url must be a non-empty string');
  assertSourceCategory(sourceCategory);

  const exportedValues = getExportedFunctions(exports);
  if (exportedValues.length === 0) throw new TypeError('Source module must export at least one fetch function');

  for (const exported of exportedValues) {
    exported.domainUrl = value;
    exported.sourceCategory = sourceCategory;
  }

  return exports;
}

function attachSourceCategory(exports, sourceCategory) {
  assertSourceCategory(sourceCategory);

  const exportedValues = getExportedFunctions(exports);
  if (exportedValues.length === 0) throw new TypeError('Source module must export at least one fetch function');

  for (const exported of exportedValues) {
    exported.sourceCategory = sourceCategory;
  }

  return exports;
}

module.exports = {
  attachSourceConfigName,
  attachSourceDomainUrl,
  attachSourceCategory,
  SOURCE_CATEGORIES,
};