const express = require("express");
const router = express.Router();
const { analyzeRepo, getAnalysisById, getHistory } = require("../controller/analysisController");
const auth = require("../middleware/auth");


router.post('/', auth, analyzeRepo);
router.get('/history', auth, getHistory);
router.get('/:id', auth, getAnalysisById);
module.exports = router;
