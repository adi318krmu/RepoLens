import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { analysisAPI, resumeAPI, authAPI } from "../services/api";
import { CardSkeleton } from "../components/LoadingSkeleton";
import { User, Mail, Database, Award, BarChart2, Calendar, ArrowRight, Camera, Loader2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../components/Button";

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingPic, setUpdatingPic] = useState(false);

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
        console.error("Failed to load history on profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image size must be less than 2MB");
      return;
    }

    setUpdatingPic(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const base64data = reader.result;
        const res = await authAPI.updateProfilePicture(base64data);
        if (res.success && res.user) {
          updateUser(res.user);
        }
      } catch (err) {
        console.error("Failed to upload profile picture:", err);
        alert("Failed to update profile picture");
      } finally {
        setUpdatingPic(false);
      }
    };
  };

  const handleImageRemove = async () => {
    if (!window.confirm("Are you sure you want to remove your profile picture?")) return;
    
    setUpdatingPic(true);
    try {
      const res = await authAPI.removeProfilePicture();
      if (res.success && res.user) {
        updateUser(res.user);
      }
    } catch (err) {
      console.error("Failed to remove profile picture:", err);
      alert("Failed to remove profile picture");
    } finally {
      setUpdatingPic(false);
    }
  };

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
                  <div className="relative group/avatar mb-4">
                    {user?.profilePicture ? (
                      <img 
                        src={user.profilePicture} 
                        alt="Profile" 
                        className="w-20 h-20 rounded-full object-cover shadow-lg border border-slate-700"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold font-display shadow-lg shadow-indigo-500/10">
                        {user?.name ? user.name.substring(0, 2).toUpperCase() : "U"}
                      </div>
                    )}
                    
                    {updatingPic && (
                      <div className="absolute inset-0 rounded-full bg-slate-950/70 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mb-4">
                    <label className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-2 py-1 rounded cursor-pointer transition-colors border border-slate-700 flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      {user?.profilePicture ? "Update Pic" : "Upload Pic"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={updatingPic} />
                    </label>
                    {user?.profilePicture && (
                      <button 
                        onClick={handleImageRemove}
                        disabled={updatingPic}
                        className="text-[10px] bg-red-950/40 hover:bg-red-900/40 text-red-400 font-bold px-2 py-1 rounded cursor-pointer transition-colors border border-red-900/30 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    )}
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
                            <Link to={item.isResume ? `/resume-analyze?id=${item._id}` : `/analysis/${item._id}`}>
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
