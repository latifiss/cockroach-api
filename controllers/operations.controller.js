const CollectionRun = require('../models/collectionRun.model');
const SourceHealth = require('../models/sourceHealth.model');

async function getSourceHealth(req, res) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const sources = await SourceHealth.find(filter).sort({ status: 1, last_attempt_at: -1 }).lean();
    res.json({ total: sources.length, sources });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve source health' });
  }
}

async function getCollectionRuns(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const [runs, total] = await Promise.all([
      CollectionRun.find(filter).sort({ started_at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      CollectionRun.countDocuments(filter),
    ]);
    res.json({ total, page, per_page: limit, total_pages: Math.ceil(total / limit), runs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve collection runs' });
  }
}

async function getCollectionRun(req, res) {
  try {
    const run = await CollectionRun.findById(req.params.id).lean();
    if (!run) return res.status(404).json({ error: 'Collection run not found' });
    return res.json({ run });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid collection run identifier' });
  }
}

module.exports = { getSourceHealth, getCollectionRuns, getCollectionRun };
