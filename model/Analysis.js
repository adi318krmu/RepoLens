const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  repoUrl: {
    type: String,
    required: true
  },
  score: Number,
  status: String,
  analysis: Object,
}, { timestamps: true });

module.exports = mongoose.model("Analysis", analysisSchema);