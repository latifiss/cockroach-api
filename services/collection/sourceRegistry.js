const { SOURCE_CATEGORIES } = require('../../utils/sourceConfig');

function humanizeSourceName(value) {
  const sourceName = String(value ?? '').trim();
  const name = sourceName
    .replace(/^fetch/, '')
    .replace(/(\w)([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\b(Articles|News)\b$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  return name || sourceName || 'Unknown source';
}

function resolveSourceName(sourceId, ...candidates) {
  const name = candidates
    .map((candidate) => String(candidate ?? '').trim())
    .find(Boolean);

  return name || humanizeSourceName(sourceId);
}

function createSourceRegistry(fetchers) {
  if (!Array.isArray(fetchers)) throw new TypeError('fetchers must be an array');

  const seenIds = new Map();
  const seenFunctions = new Set();
  const registry = [];

  fetchers.forEach((fetcher, index) => {
    if (typeof fetcher !== 'function') throw new TypeError(`Source at index ${index} must be a function`);
    if (seenFunctions.has(fetcher)) return;

    const id = String(fetcher.name || `source-${index + 1}`);
    const existing = seenIds.get(id);
    if (existing && existing !== fetcher) {
      throw new Error(`Duplicate collector identifier: ${id}`);
    }
    const publisherId = String(fetcher.sourceId ?? '').trim() || null;

    const name = resolveSourceName(id, fetcher.sourceName, humanizeSourceName(fetcher.name || id));
    const domainUrl = String(fetcher.domainUrl || '').trim();
    const sourceCategory = fetcher.sourceCategory || 'News';
    if (!SOURCE_CATEGORIES.has(sourceCategory)) {
      throw new Error(`Source ${id} has an invalid source_category: ${sourceCategory}`);
    }

    const sourceTags = Array.isArray(fetcher.sourceTags) ? [...fetcher.sourceTags] : [];
    const sourceOrigin = String(fetcher.sourceOrigin || '').trim();
    const sourceCredibility = fetcher.sourceCredibility ?? null;

    seenIds.set(id, fetcher);
    seenFunctions.add(fetcher);
    registry.push(Object.freeze({
      id,
      publisher_id: publisherId,
      name,
      domain_url: domainUrl,
      source_category: sourceCategory,
      source_tags: Object.freeze(sourceTags),
      source_origin: sourceOrigin,
      source_credibility: sourceCredibility,
      fetch: fetcher,
    }));
  });

  return Object.freeze(registry);
}

module.exports = { createSourceRegistry, humanizeSourceName, resolveSourceName };