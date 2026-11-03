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

    const id = fetcher.sourceId || fetcher.name || `source-${index + 1}`;
    const existing = seenIds.get(id);
    if (existing && existing !== fetcher) {
      throw new Error(`Duplicate source identifier: ${id}`);
    }

    const name = resolveSourceName(id, fetcher.sourceName, humanizeSourceName(fetcher.name || id));
    seenIds.set(id, fetcher);
    seenFunctions.add(fetcher);
    registry.push(Object.freeze({ id, name, fetch: fetcher }));
  });

  return Object.freeze(registry);
}

module.exports = { createSourceRegistry, humanizeSourceName, resolveSourceName };
