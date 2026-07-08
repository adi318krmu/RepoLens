import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import CircularProgress from "../components/CircularProgress";
import { analysisAPI } from "../services/api";
import { ArrowLeft, Github, Calendar, CheckCircle, AlertOctagon, HelpCircle, Sparkles } from "lucide-react";
import Button from "../components/Button";

const AnalysisResult = () => {
  const { id } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const data = await analysisAPI.getById(id);
        if (data.success) {
          setResult(data);
        } else {
          setError(data.message || "Failed to load analysis details.");
        }
      } catch (err) {
        console.error(err);
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [id]);

  const getStatusStyle = (status = "") => {
    const s = status.toLowerCase();
    if (s.includes("excellent")) return { text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
    if (s.includes("good")) return { text: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" };
    if (s.includes("average") || s.includes("fair")) return { text: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
    return { text: "text-red-400", bg: "bg-red-500/10 border-red-500/20" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col text-slate-100">
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 flex items-center justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col text-slate-100">
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 p-6 flex flex-col items-center justify-center">
            <div className="text-red-400 font-semibold mb-4 text-center">{error || "Analysis not found"}</div>
            <Link to="/history">
              <Button variant="secondary" className="cursor-pointer">Go back to history</Button>
            </Link>
          </main>
        </div>
      </div>
    );
  }

  const {
    repo,
    repository,
    score,
    status,
    scores = {},
    strengths = [],
    issues = [],
    suggestions = [],
    summary = "",
    createdAt,
  } = result;

  const [owner, name] = repo ? repo.replace("https://github.com/", "").split("/") : ["GitHub", "Repository"];
  const statusColor = getStatusStyle(status);

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col text-slate-100 font-sans">
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
          {/* Header row */}
          <div className="flex items-center gap-4">
            <Link to="/history">
              <button className="p-2 bg-slate-900 border border-slate-800 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold tracking-wider uppercase">
                <span>Repository Grading Results</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(createdAt).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white font-display mt-0.5">
                {owner} / <span className="text-indigo-400">{name}</span>
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Metadata & AI Feedback */}
            <div className="lg:col-span-2 space-y-6">
              {/* Summary Card */}
              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 glow-card relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Sparkles className="w-24 h-24 text-white" />
                </div>
                <h3 className="text-base font-bold text-white mb-3 font-display flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  AI Executive Summary
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed font-sans">
                  {summary || "No textual summary provided by the grading engine."}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <a
                    href={repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-850 hover:bg-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <Github className="w-3.5 h-3.5" />
                    Open Repository URL
                  </a>
                </div>
              </div>

              {/* Feedback Sections */}
              <div className="space-y-6">
                {/* Strengths (Green) */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    Key Strengths
                  </h3>
                  {strengths.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No specific strengths reported.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {strengths.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex gap-3 text-slate-300 text-sm leading-relaxed"
                        >
                          <span className="text-emerald-400 font-bold font-mono">✓</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Weaknesses (Red) */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-red-400" />
                    Areas of Improvement (Weaknesses)
                  </h3>
                  {issues.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No specific weaknesses identified.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {issues.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl flex gap-3 text-slate-300 text-sm leading-relaxed"
                        >
                          <span className="text-red-400 font-bold font-mono">!</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Suggestions (Blue) */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-indigo-400" />
                    Actionable Suggestions
                  </h3>
                  {suggestions.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No specific recommendations provided.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {suggestions.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex gap-3 text-slate-300 text-sm leading-relaxed"
                        >
                          <span className="text-indigo-400 font-bold font-mono">→</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Score Metrics Dashboard */}
            <div className="space-y-6">
              {/* Overall score card */}
              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center glow-card text-center relative overflow-hidden">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Overall Score</h3>

                <CircularProgress value={score} maxValue={10} size={150} strokeWidth={12} />

                <div className="mt-6">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${statusColor.bg} ${statusColor.text}`}>
                    {status || "Graded"}
                  </span>
                </div>
              </div>

              {/* Score Breakdown Cards */}
              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 glow-card space-y-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Metrics Breakdown</h3>

                <div className="grid grid-cols-2 gap-6">
                  <CircularProgress
                    value={scores.codeQuality || 0}
                    maxValue={10}
                    size={90}
                    strokeWidth={8}
                    label="Code Quality"
                  />
                  <CircularProgress
                    value={scores.readability || 0}
                    maxValue={10}
                    size={90}
                    strokeWidth={8}
                    label="Readability"
                  />
                  <CircularProgress
                    value={scores.bestPractices || 0}
                    maxValue={10}
                    size={90}
                    strokeWidth={8}
                    label="Best Practices"
                  />
                  <CircularProgress
                    value={scores.documentation || 0}
                    maxValue={10}
                    size={90}
                    strokeWidth={8}
                    label="Documentation"
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AnalysisResult;
