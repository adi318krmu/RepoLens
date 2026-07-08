const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  analyzeResume,
  getResumeHistory,
  getResumeAnalysisById
} = require("../controller/resumeController");
const auth = require("../middleware/auth");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB max
});

router.post("/analyze", auth, upload.single("file"), analyzeResume);
router.get("/history", auth, getResumeHistory);
router.get("/:id", auth, getResumeAnalysisById);

module.exports = router;
