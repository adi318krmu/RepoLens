import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Button from "../components/Button";
import CircularProgress from "../components/CircularProgress";
import { resumeAPI } from "../services/api";
import { 
  FileText, Upload, Briefcase, Building, Clipboard, 
  CheckCircle, AlertOctagon, HelpCircle, Sparkles, 
  Loader2, Cpu, ArrowLeft, History, Calendar, Trash 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ResumeAnalyze = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // App States
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");
  
  // Form States
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [inputMode, setInputMode] = useState("upload"); // 'upload' | 'text'
  const [resumeText, setResumeText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const loadingSteps = [
    "Uploading resume profile...",
    "Extracting contents from PDF...",
    "Parsing candidate credentials...",
    "Comparing against target role...",
    "Evaluating job description keywords...",
    "Generating ATS compatibility score...",
    "Finalizing selection report...",
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 2000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await resumeAPI.getHistory();
      if (data.success && data.history) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error("Failed to load resume history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 20 * 1024 * 1024) {
        setError("File size exceeds the 20MB limit.");
        setSelectedFile(null);
      } else {
        setError("");
        setSelectedFile(file);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 20 * 1024 * 1024) {
        setError("File size exceeds the 20MB limit.");
        setSelectedFile(null);
      } else {
        setError("");
        setSelectedFile(file);
      }
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!targetRole) return setError("Target role is required");
    
    if (inputMode === "upload" && !selectedFile) {
      return setError("Please select or drop a PDF resume file");
    }
    if (inputMode === "text" && !resumeText.trim()) {
      return setError("Please paste your resume text");
    }

    setError("");
    setLoading(true);

    try {
      let response;
      if (inputMode === "upload") {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("targetRole", targetRole);
        formData.append("targetCompany", targetCompany);
        formData.append("jobDescription", jobDescription);
        response = await resumeAPI.analyze(formData);
      } else {
        response = await resumeAPI.analyze({
          resumeText,
          targetRole,
          targetCompany,
          jobDescription
        });
      }

      if (response.success && response.analysis) {
        setSelectedReport(response.analysis);
        await fetchHistory(); // refresh history list
      } else {
        setError(response.message || "Failed to analyze resume. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "An error occurred during resume analysis.");
    } finally {
      setLoading(false);
    }
  };

  const getVerdictStyle = (verdict = "") => {
    const v = verdict.toLowerCase();
    if (v.includes("selected")) return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
    if (v.includes("shortlisted")) return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/25";
    return "bg-red-500/10 text-red-400 border border-red-500/25";
  };

  const getEligibilityStyle = (el = "") => {
    const e = el.toLowerCase();
    if (e.includes("highly")) return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
    if (e.includes("moderate") || e.includes("medium")) return "bg-amber-500/10 text-amber-400 border border-amber-500/25";
    return "bg-red-500/10 text-red-400 border border-red-500/25";
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col text-slate-100 font-sans">
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {loading ? (
              // Loader Screen
              <motion.div
                key="scanning"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl mx-auto bg-[#1E293B] border border-slate-800 rounded-2xl p-12 shadow-2xl text-center flex flex-col items-center justify-center relative overflow-hidden glow-card my-12"
              >
                <div className="relative w-36 h-36 mb-8 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-indigo-500/10 animate-ping"></div>
                  <div className="absolute inset-2 rounded-full border border-purple-500/20 animate-pulse"></div>
                  <div className="absolute inset-4 rounded-full border border-t-2 border-indigo-500 animate-spin" style={{ animationDuration: "3s" }}></div>
                  <div className="absolute inset-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                    <Cpu className="w-8 h-8 animate-pulse text-indigo-400" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white font-display">Analyzing Resume Profile</h3>
                <p className="text-slate-500 text-xs mt-1 font-mono uppercase tracking-widest">Evaluating ATS metrics</p>

                <div className="mt-8 h-6 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  <motion.p
                    key={loadingStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm font-semibold text-slate-300 font-mono"
                  >
                    {loadingSteps[loadingStep]}
                  </motion.p>
                </div>

                <div className="w-64 h-1.5 bg-slate-900 rounded-full mt-4 overflow-hidden border border-slate-800">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </motion.div>
            ) : selectedReport ? (
              // Results Dashboard
              <motion.div
                key="report"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Back button */}
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedReport(null)}
                    className="p-2 bg-slate-900 border border-slate-800 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold tracking-wider uppercase">
                      <span>Resume Selection Report</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(selectedReport.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold text-white font-display mt-0.5">
                      ATS Grading Report: <span className="text-indigo-400">{selectedReport.targetRole}</span>
                    </h1>
                  </div>
                </div>

                {/* Report Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: ATS Score Gauge */}
                  <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-xl glow-card relative">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">Compatibility Metrics</h3>
                    
                    <div className="flex flex-col items-center justify-center space-y-6 w-full">
                      <div>
                        <CircularProgress 
                          value={selectedReport.analysis?.overall_score ?? selectedReport.atsScore} 
                          maxValue={100} 
                          size={140} 
                          strokeWidth={10} 
                          label="Overall Score"
                        />
                      </div>
                      <div className="flex justify-around w-full gap-4 border-t border-slate-800/80 pt-6">
                        <CircularProgress 
                          value={selectedReport.analysis?.ats_score ?? selectedReport.atsScore} 
                          maxValue={100} 
                          size={90} 
                          strokeWidth={8} 
                          label="Resume Score"
                        />
                        <CircularProgress 
                          value={selectedReport.analysis?.github_score ?? 0} 
                          maxValue={100} 
                          size={90} 
                          strokeWidth={8} 
                          label="GitHub Score"
                        />
                      </div>
                    </div>

                    <div className="mt-6 w-full space-y-3 border-t border-slate-800/80 pt-6">
                      <div className="flex justify-between items-center px-4 py-2 bg-slate-900/50 rounded-xl">
                        <span className="text-xs text-slate-400 font-medium">ROLE FIT</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${getEligibilityStyle(selectedReport.analysis?.role_fit ?? selectedReport.eligibility)}`}>
                          {selectedReport.analysis?.role_fit ?? selectedReport.eligibility}
                        </span>
                      </div>

                      <div className="flex justify-between items-center px-4 py-2 bg-slate-900/50 rounded-xl">
                        <span className="text-xs text-slate-400 font-medium">VERDICT</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${getVerdictStyle(selectedReport.verdict)}`}>
                          {selectedReport.verdict}
                        </span>
                      </div>

                      {selectedReport.targetCompany && (
                        <div className="flex justify-between items-center px-4 py-2 bg-slate-900/50 rounded-xl">
                          <span className="text-xs text-slate-400 font-medium">COMPANY</span>
                          <span className="text-xs text-slate-200 font-semibold truncate max-w-[150px]">
                            {selectedReport.targetCompany}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Columns: AI Assessment details */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl glow-card">
                        <h3 className="text-base font-bold text-white mb-3 font-display flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-indigo-400" />
                          Resume Summary
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {selectedReport.analysis?.resume_summary || selectedReport.analysis?.summary || "Resume details are fully parsed."}
                        </p>
                      </div>

                      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl glow-card">
                        <h3 className="text-base font-bold text-white mb-3 font-display flex items-center gap-2">
                          <Cpu className="w-5 h-5 text-purple-400" />
                          GitHub Summary
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {selectedReport.analysis?.github_summary || "No GitHub portfolio data was parsed."}
                        </p>
                      </div>
                    </div>

                    {/* Findings Categories */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Strengths */}
                      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-slate-700/50 transition-colors">
                        <h4 className="text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          Key Strengths
                        </h4>
                        {selectedReport.analysis?.strengths?.length > 0 ? (
                          <ul className="space-y-2.5 text-xs text-slate-300">
                            {selectedReport.analysis.strengths.map((str, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="text-emerald-500">•</span>
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-500">No highlights recorded.</p>
                        )}
                      </div>

                      {/* Weaknesses */}
                      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-slate-700/50 transition-colors">
                        <h4 className="text-sm font-bold text-red-400 mb-4 flex items-center gap-2">
                          <AlertOctagon className="w-4 h-4 text-red-400" />
                          Key Weaknesses
                        </h4>
                        {selectedReport.analysis?.weaknesses?.length > 0 ? (
                          <ul className="space-y-2.5 text-xs text-slate-300">
                            {selectedReport.analysis.weaknesses.map((w, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="text-red-500">•</span>
                                <span>{w}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-500">No critical issues identified.</p>
                        )}
                      </div>

                      {/* Matched Skills */}
                      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-slate-700/50 transition-colors md:col-span-1">
                        <h4 className="text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          Matched Skills
                        </h4>
                        {selectedReport.analysis?.matched_skills?.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedReport.analysis.matched_skills.map((kw, idx) => (
                              <span key={idx} className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                                {kw}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">No matched skills recorded.</p>
                        )}
                      </div>

                      {/* Missing Skills */}
                      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-slate-700/50 transition-colors md:col-span-1">
                        <h4 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-amber-400" />
                          Missing Skills / Keywords
                        </h4>
                        {selectedReport.analysis?.missing_skills?.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedReport.analysis.missing_skills.map((kw, idx) => (
                              <span key={idx} className="px-2.5 py-1 text-xs rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                                {kw}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">All matching keywords are covered!</p>
                        )}
                      </div>

                      {/* Role Suggestions */}
                      {selectedReport.analysis?.roleSuggestions?.length > 0 && (
                        <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-slate-700/50 transition-colors md:col-span-2">
                          <h4 className="text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-emerald-400" />
                            Suggested Alternative Career Roles
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedReport.analysis.roleSuggestions.map((role, idx) => (
                              <span key={idx} className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggestions */}
                      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl hover:border-slate-700/50 transition-colors md:col-span-2">
                        <h4 className="text-sm font-bold text-indigo-400 mb-4 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          Actionable Recommendations
                        </h4>
                        {selectedReport.analysis?.suggestions?.length > 0 ? (
                          <ul className="space-y-2.5 text-xs text-slate-300">
                            {selectedReport.analysis.suggestions.map((sug, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="text-indigo-500">•</span>
                                <span>{sug}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-500">No optimization suggestions needed.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <Button variant="secondary" onClick={() => setSelectedReport(null)} className="cursor-pointer">
                    Grade Another Resume
                  </Button>
                </div>
              </motion.div>
            ) : (
              // Form Submit & History split
              <motion.div
                key="input-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Form section */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden glow-card">
                    <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-indigo-500/5 rounded-full pointer-events-none blur-2xl" />

                    <div className="flex flex-col items-center text-center mb-8">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-500/5">
                        <FileText className="w-8 h-8" />
                      </div>
                      <h2 className="text-2xl font-bold text-white font-display">Resume ATS Analyzer</h2>
                      <p className="text-slate-400 text-sm mt-2 max-w-md font-sans">
                        Scan your resume alignment against target job profiles to retrieve ATS compatibility scores, missing keywords, and recruiter optimization advice.
                      </p>
                    </div>

                    {error && (
                      <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <form onSubmit={handleAnalyze} className="space-y-6">
                      {/* Job Metadata inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-450 text-slate-400 mb-2 uppercase tracking-widest">
                            Target Job Role <span className="text-red-500">*</span>
                          </label>
                          <div className="relative flex items-center">
                            <Briefcase className="w-4.5 h-4.5 text-slate-505 text-slate-500 absolute left-3.5" />
                            <input
                              type="text"
                              required
                              value={targetRole}
                              onChange={(e) => setTargetRole(e.target.value)}
                              placeholder="e.g. Senior React Developer"
                              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 placeholder-slate-600 rounded-xl text-sm transition-all focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-450 text-slate-400 mb-2 uppercase tracking-widest">
                            Target Company (Optional)
                          </label>
                          <div className="relative flex items-center">
                            <Building className="w-4.5 h-4.5 text-slate-550 text-slate-500 absolute left-3.5" />
                            <input
                              type="text"
                              value={targetCompany}
                              onChange={(e) => setTargetCompany(e.target.value)}
                              placeholder="e.g. Google"
                              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 placeholder-slate-600 rounded-xl text-sm transition-all focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Job Description (JD) input */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-450 text-slate-400 mb-2 uppercase tracking-widest">
                          Job Description / Requirements (Optional)
                        </label>
                        <div className="relative">
                          <Clipboard className="w-4.5 h-4.5 text-slate-550 text-slate-500 absolute left-3.5 top-3" />
                          <textarea
                            rows={3}
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Paste the full job requirements or description details here to enable highly-tailored ATS keyword matching..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 placeholder-slate-600 rounded-xl text-sm transition-all focus:outline-none resize-none"
                          />
                        </div>
                      </div>

                      {/* Input Mode Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-450 text-slate-400 mb-3 uppercase tracking-widest">
                          Resume Profile Source
                        </label>
                        <div className="flex gap-4 mb-4">
                          <button
                            type="button"
                            onClick={() => setInputMode("upload")}
                            className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                              inputMode === "upload" 
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" 
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            Upload PDF File
                          </button>
                          <button
                            type="button"
                            onClick={() => setInputMode("text")}
                            className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                              inputMode === "text" 
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" 
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            Paste Resume Text
                          </button>
                        </div>

                        {/* File Upload Zone */}
                        {inputMode === "upload" ? (
                          <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                              dragActive 
                                ? "border-indigo-500 bg-indigo-500/5" 
                                : "border-slate-850 border-slate-800 bg-slate-900/50 hover:border-slate-700/60"
                            }`}
                          >
                            <input
                              type="file"
                              id="resume-file-input"
                              accept=".pdf,.txt"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <label htmlFor="resume-file-input" className="cursor-pointer block">
                              <Upload className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                              {selectedFile ? (
                                <div>
                                  <p className="text-sm font-semibold text-white truncate max-w-xs mx-auto">
                                    {selectedFile.name}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1 font-mono">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm font-semibold text-slate-350 text-slate-300">
                                    Drag and drop your PDF resume, or <span className="text-indigo-400">browse files</span>
                                  </p>
                                  <p className="text-xs text-slate-500 mt-1.5">
                                    Supports PDF and TXT formats up to 20MB
                                  </p>
                                </div>
                              )}
                            </label>
                          </div>
                        ) : (
                          // Paste Text Area
                          <textarea
                            rows={6}
                            required
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                            placeholder="Paste the full raw text content of your resume profile..."
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 placeholder-slate-600 rounded-xl text-sm transition-all focus:outline-none font-mono text-xs leading-relaxed"
                          />
                        )}
                      </div>

                      <Button type="submit" variant="primary" className="w-full py-3 text-base cursor-pointer">
                        Run ATS Grading sweep
                      </Button>
                    </form>
                  </div>
                </div>

                {/* History list section */}
                <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-2xl h-fit">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    Past Resume Gradings
                  </h3>

                  {loadingHistory ? (
                    <div className="flex justify-center p-6">
                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                      <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-400">No scan history found</p>
                      <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] mx-auto">
                        Your grading reports will list here once you run an analysis.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                      {history.map((item) => (
                        <div 
                          key={item._id}
                          onClick={() => setSelectedReport(item)}
                          className="p-3 bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-xl flex items-center justify-between cursor-pointer transition-all hover:bg-slate-900/80 group"
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-indigo-400 transition-colors">
                              {item.targetRole}
                            </h4>
                            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                              <span>{item.targetCompany || "General Alignment"}</span>
                              <span>•</span>
                              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                            <span className="text-xs font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                              {item.atsScore}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default ResumeAnalyze;
