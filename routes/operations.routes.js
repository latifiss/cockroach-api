const router = require('express').Router();
const {
  authorizeOperations,
  getSourceHealth,
  getCollectionRuns,
  getCollectionRun,
} = require('../controllers/operations.controller');

router.use(authorizeOperations);
router.get('/sources', getSourceHealth);
router.get('/collections', getCollectionRuns);
router.get('/collections/:id', getCollectionRun);

module.exports = router;
