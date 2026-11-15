const router = require('express').Router();
const {
  authorizeOperations,
  getHealthSummary,
  getPipelineHealth,
  getSourceHealth,
  getCollectionRuns,
  getCollectionRun,
} = require('../controllers/operations.controller');

router.use(authorizeOperations);
router.get('/health/summary', getHealthSummary);
router.get('/health/pipeline', getPipelineHealth);
router.get('/sources', getSourceHealth);
router.get('/collections', getCollectionRuns);
router.get('/collections/:id', getCollectionRun);

module.exports = router;
