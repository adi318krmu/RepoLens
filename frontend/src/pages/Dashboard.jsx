import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { analysisAPI, resumeAPI } from "../services/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { ScoreTrendsChart, RepoPerformanceChart } from "../components/AnalyticsCharts";
import { CardSkeleton, ChartSkeleton } from "../components/LoadingSkeleton";
import { BarChart, Database, Award, ArrowUpRight, SearchCode } from "lucide-react";
import Button from "../components/Button";

const Dashboard = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const repoData = await analysisAPI.getHistory();
        const resumeData = await resumeAPI.getHistory();
        
        let combinedHistory = [];
        if (repoData.success && repoData.history) {
          combinedHistory = [...repoData.history];
        }
        if (resumeData.success && resumeData.history) {
          const normalizedResume = resumeData.history.map(item => ({
            ...item,
            isResume: true,
            score: (item.atsScore || item.analysis?.overall_score || 0) / 10,
            repoUrl: `Resume: ${item.targetRole}` + (item.targetCompany ? ` at ${item.targetCompany}` : "")
          }));
          combinedHistory = [...combinedHistory, ...normalizedResume];
        }
        
        combinedHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setHistory(combinedHistory);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const totalScans = history.length;
  const avgScore = totalScans
    ? history.reduce((sum, item) => sum + (item.score || 0), 0) / totalScans
    : 0;
  const bestScore = totalScans
    ? Math.max(...history.map((item) => item.score || 0))
    : 0;

  const trendData = [...history]
    .reverse()
    .map((item) => ({
      date: item.createdAt,
      score: item.score,
    }));

  const performanceData = [...history]
    .slice(0, 5)
    .map((item) => {
      const cleaned = item.repoUrl.replace("https://github.com/", "");
      const parts = cleaned.split("/");
      const name = parts[1] || parts[0] || item.repoUrl;
      return {
        name: name.substring(0, 15),
        score: item.score,
      };
    });

  const filteredHistory = history.filter((item) =>
    item.repoUrl.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col text-slate-100">
      <Navbar onSearch={setSearchQuery} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
          {/* Welcome Card */}
          <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden glow-card">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-indigo-500/5 rounded-full pointer-events-none blur-3xl" />
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white font-display">
                Welcome back, {user?.name || "Developer"}!
              </h1>
              <p className="text-slate-400 text-sm mt-2 max-w-xl">
                Ready to review another project? Run an AI-powered grading sweep to pinpoint weaknesses and score your interview readiness.
              </p>
            </div>
            <Link to="/analyze">
              <Button variant="primary" icon={<SearchCode className="w-4 h-4" />} className="cursor-pointer">
                Analyze New Repo
              </Button>
            </Link>
          </div>

          {loading ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartSkeleton />
                <ChartSkeleton />
              </div>
            </>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 flex items-center gap-4 glow-card hover:border-slate-700/80 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Scans</p>
                    <p className="text-2xl font-bold text-white mt-0.5">{totalScans}</p>
                  </div>
                </div>

                <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 flex items-center gap-4 glow-card hover:border-slate-700/80 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <BarChart className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Score</p>
                    <p className="text-2xl font-bold text-white mt-0.5">
                      {avgScore ? avgScore.toFixed(1) : "N/A"}
                      {avgScore > 0 && <span className="text-xs text-slate-500 font-medium"> / 10</span>}
                    </p>
                  </div>
                </div>

                <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-5 flex items-center gap-4 glow-card hover:border-slate-700/80 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Best Score</p>
                    <p className="text-2xl font-bold text-white mt-0.5">
                      {bestScore ? bestScore.toFixed(1) : "N/A"}
                      {bestScore > 0 && <span className="text-xs text-slate-500 font-medium"> / 10</span>}
                    </p>
                  </div>
                </div>
              </div>

              {totalScans === 0 ? (
                <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center glow-card">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
                    <SearchCode className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white font-display">No scanning history found</h3>
                  <p className="text-slate-400 text-sm max-w-sm mt-2 mb-6 font-sans">
                    Connect your GitHub public repository link and get score breakdowns, suggestions, and insights immediately.
                  </p>
                  <Link to="/analyze">
                    <Button variant="primary" className="cursor-pointer">Analyze Your First Repository</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ScoreTrendsChart data={trendData} />
                    <RepoPerformanceChart data={performanceData} />
                  </div>

                  {searchQuery && (
                    <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 glow-card">
                      <h3 className="text-base font-bold text-white mb-4">Search Results for "{searchQuery}"</h3>
                      {filteredHistory.length === 0 ? (
                        <p className="text-sm text-slate-400">No scanned repositories match your search.</p>
                      ) : (
                        <div className="space-y-3">
                          {filteredHistory.map((item) => (
                            <div key={item._id} className="flex justify-between items-center p-3 bg-slate-900 border border-slate-800/80 rounded-xl">
                              <span className="text-sm text-slate-300 font-medium truncate max-w-md">{item.repoUrl}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-bold text-indigo-400">{item.score.toFixed(1)}</span>
                                <Link to={item.isResume ? `/resume-analyze?id=${item._id}` : `/analysis/${item._id}`}>
                                  <Button size="sm" variant="ghost" className="flex items-center gap-1 cursor-pointer">
                                    View <ArrowUpRight className="w-3.5 h-3.5" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
