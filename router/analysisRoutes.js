const express = require("express");
const router = express.Router();
const { analyzeRepo } = require("../controller/analysisController");

router.post('/', analyzeRepo);

module.exports = router;