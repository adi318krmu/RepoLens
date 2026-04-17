const express = require("express");
const router = express.Router();
const { analyzeRepo ,getHistory } = require("../controller/analysisController");


router.post('/', analyzeRepo);
router.get('/history',getHistory)
module.exports = router;