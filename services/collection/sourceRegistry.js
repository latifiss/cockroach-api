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

    seenIds.set(id, fetcher);
    seenFunctions.add(fetcher);
    registry.push(Object.freeze({ id, fetch: fetcher }));
  });

  return Object.freeze(registry);
}

module.exports = { createSourceRegistry };
