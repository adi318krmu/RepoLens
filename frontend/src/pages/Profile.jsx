import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { analysisAPI } from "../services/api";
import { CardSkeleton } from "../components/LoadingSkeleton";
import { User, Mail, Database, Award, BarChart2, Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../components/Button";

const Profile = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await analysisAPI.getHistory();
        if (data.success && data.history) {
          setHistory(data.history);
        }
      } catch (err) {
        console.error("Failed to load history on profile:", err);
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

  const recentScans = history.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col text-slate-100 font-sans">
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white font-display">User Profile</h1>
            <p className="text-slate-400 text-xs mt-1">Manage user information and inspect global scoring statistics.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Profile Card */}
            <div className="space-y-6">
              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden glow-card">
                <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-indigo-500/5 rounded-full pointer-events-none blur-xl" />
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold font-display shadow-lg shadow-indigo-500/10 mb-4 animate-pulse">
                    {user?.name ? user.name.substring(0, 2).toUpperCase() : "U"}
                  </div>
                  <h2 className="text-lg font-bold text-white font-display">{user?.name}</h2>
                  <p className="text-xs text-slate-500 mt-1">RepoLens Grader User</p>

                  <div className="w-full border-t border-slate-800 my-6" />

                  <div className="w-full space-y-4 text-left">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Account Username</p>
                        <p className="text-sm font-medium text-slate-300">{user?.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Email Address</p>
                        <p className="text-sm font-medium text-slate-300">{user?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Member Since</p>
                        <p className="text-sm font-medium text-slate-300">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }) : "June 2026"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Profile Stats and Activity */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats Widgets */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-5 glow-card">
                    <div className="flex items-center gap-3 text-indigo-400 mb-3">
                      <Database className="w-5 h-5" />
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Scans</span>
                    </div>
                    <p className="text-3xl font-extrabold text-white">{totalScans}</p>
                  </div>

                  <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-5 glow-card">
                    <div className="flex items-center gap-3 text-purple-400 mb-3">
                      <Award className="w-5 h-5" />
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Highest Score</span>
                    </div>
                    <p className="text-3xl font-extrabold text-white">
                      {bestScore ? bestScore.toFixed(1) : "0.0"}
                      {bestScore > 0 && <span className="text-xs text-slate-500 font-medium"> / 10</span>}
                    </p>
                  </div>

                  <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-5 glow-card">
                    <div className="flex items-center gap-3 text-emerald-400 mb-3">
                      <BarChart2 className="w-5 h-5" />
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Score</span>
                    </div>
                    <p className="text-3xl font-extrabold text-white">
                      {avgScore ? avgScore.toFixed(1) : "0.0"}
                      {avgScore > 0 && <span className="text-xs text-slate-500 font-medium"> / 10</span>}
                    </p>
                  </div>
                </div>
              )}

              {/* Recent Activity List */}
              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl glow-card">
                <h3 className="text-base font-bold text-white mb-4 font-display">Recent Grading Activity</h3>

                {loading ? (
                  <div className="space-y-4">
                    <div className="h-12 bg-slate-800 rounded-xl animate-pulse" />
                    <div className="h-12 bg-slate-800 rounded-xl animate-pulse" />
                  </div>
                ) : recentScans.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-slate-500 text-sm italic font-sans">No scans run yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentScans.map((item) => {
                      const cleaned = item.repoUrl.replace("https://github.com/", "");
                      const [owner, name] = cleaned.split("/");
                      const dispName = name ? `${owner}/${name}` : cleaned;
                      const scoreColor = item.score >= 8 ? "text-emerald-400" : item.score >= 6.5 ? "text-indigo-400" : "text-amber-400";

                      return (
                        <div
                          key={item._id}
                          className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-850 rounded-xl hover:border-slate-800 transition-all duration-200 group"
                        >
                          <div className="flex flex-col min-w-0 pr-4">
                            <span className="text-sm font-semibold text-slate-200 truncate font-display">
                              {dispName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                              SCANNED ON {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="text-right">
                              <span className={`text-base font-bold ${scoreColor}`}>
                                {item.score.toFixed(1)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium"> / 10.0</span>
                            </div>
                            <Link to={`/analysis/${item._id}`}>
                              <Button size="sm" variant="ghost" className="opacity-80 group-hover:opacity-100 flex items-center gap-1 cursor-pointer">
                                View <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
