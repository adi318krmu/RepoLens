const express = require("express");
const router = express.Router();
const { analyzeRepo ,getHistory } = require("../controller/analysisController");
const { optionalAuth } = require("../middleware/auth");


router.post('/', optionalAuth, analyzeRepo);
router.get('/history', optionalAuth, getHistory)
module.exports = router;
