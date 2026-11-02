function createSourceRegistry(fetchers) {
  if (!Array.isArray(fetchers)) throw new TypeError('fetchers must be an array');

  const seen = new Set();
  return Object.freeze(fetchers.map((fetcher, index) => {
    if (typeof fetcher !== 'function') throw new TypeError(`Source at index ${index} must be a function`);
    const id = fetcher.sourceId || fetcher.name || `source-${index + 1}`;
    if (seen.has(id)) throw new Error(`Duplicate source identifier: ${id}`);
    seen.add(id);
    return Object.freeze({ id, fetch: fetcher });
  }));
}

module.exports = { createSourceRegistry };
