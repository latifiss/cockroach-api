const router = require('express').Router();
const {
  getSourceHealth,
  getCollectionRuns,
  getCollectionRun,
} = require('../controllers/operations.controller');

router.get('/sources', getSourceHealth);
router.get('/collections', getCollectionRuns);
router.get('/collections/:id', getCollectionRun);

module.exports = router;
