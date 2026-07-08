const mongoose = require("mongoose");

const resumeAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  targetRole: {
    type: String,
    required: true
  },
  targetCompany: {
    type: String,
    default: ""
  },
  jobDescription: {
    type: String,
    default: ""
  },
  atsScore: Number,
  eligibility: String,
  verdict: String,
  analysis: Object,
}, { timestamps: true });

module.exports = mongoose.model("ResumeAnalysis", resumeAnalysisSchema);
