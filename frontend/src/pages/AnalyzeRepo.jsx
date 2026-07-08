import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Button from "../components/Button";
import { analysisAPI } from "../services/api";
import { Search, Github, AlertTriangle, Cpu, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AnalyzeRepo = () => {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingSteps = [
    "Contacting GitHub API...",
    "Cloning directory listing...",
    "Scanning README.md structure...",
    "Extracting file tree and metadata...",
    "Reviewing code patterns with AI...",
    "Executing custom weighted scoring algorithms...",
    "Saving results...",
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

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!repoUrl) return setError("Please enter a valid GitHub URL");
    if (!repoUrl.includes("github.com/")) {
      return setError("URL must be a valid GitHub repository link");
    }

    setError("");
    setLoading(true);

    try {
      const response = await analysisAPI.analyze(repoUrl);
      if (response.success) {
        const id = response.savedAnalysis?._id || response.savedAnalysis?.id;
        if (id) {
          navigate(`/analysis/${id}`);
        } else {
          navigate("/history");
        }
      } else {
        setError(response.message || "Failed to analyze repository. Check URL and try again.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "An error occurred during repository analysis.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col text-slate-100">
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-6 flex items-center justify-center max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {!loading ? (
              <motion.div
                key="input-form"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="w-full max-w-2xl bg-[#1E293B] border border-slate-800 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden glow-card"
              >
                <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-indigo-500/5 rounded-full pointer-events-none blur-2xl" />

                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-500/5">
                    <Github className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-white font-display">Analyze Repository</h2>
                  <p className="text-slate-400 text-sm mt-2 max-w-md font-sans">
                    Enter the URL of any public GitHub repository to run a comprehensive code structure, metrics, and documentation quality review.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleAnalyze} className="space-y-6">
                  <div className="relative flex items-center">
                    <Search className="w-5 h-5 text-slate-500 absolute left-4 pointer-events-none" />
                    <input
                      type="url"
                      required
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/owner/repository"
                      className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 placeholder-slate-650 placeholder-slate-650 placeholder-slate-600 rounded-xl text-sm transition-all focus:outline-none"
                    />
                  </div>

                  <Button type="submit" variant="primary" className="w-full py-3 text-base cursor-pointer">
                    Scan Repository
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="scanning"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl bg-[#1E293B] border border-slate-800 rounded-2xl p-12 shadow-2xl text-center flex flex-col items-center justify-center relative overflow-hidden glow-card"
              >
                <div className="relative w-36 h-36 mb-8 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-indigo-500/10 animate-ping"></div>
                  <div className="absolute inset-2 rounded-full border border-purple-500/20 animate-pulse"></div>
                  <div className="absolute inset-4 rounded-full border border-t-2 border-indigo-500 animate-spin" style={{ animationDuration: "3s" }}></div>
                  <div className="absolute inset-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                    <Cpu className="w-8 h-8 animate-pulse text-indigo-400" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white font-display">Analyzing Repository</h3>
                <p className="text-slate-500 text-xs mt-1 font-mono uppercase tracking-widest">Scanning in progress</p>

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
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default AnalyzeRepo;
