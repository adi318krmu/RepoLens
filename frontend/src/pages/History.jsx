import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { analysisAPI } from "../services/api";
import { TableSkeleton } from "../components/LoadingSkeleton";
import Button from "../components/Button";
import { Search, SlidersHorizontal, Calendar, ArrowUpRight, FolderGit2 } from "lucide-react";

const History = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await analysisAPI.getHistory();
        if (data.success && data.history) {
          setHistory(data.history);
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const getStatusBadge = (status = "") => {
    const s = status.toLowerCase();
    if (s.includes("excellent")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (s.includes("good")) return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    if (s.includes("average") || s.includes("fair")) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-red-500/10 text-red-400 border-red-500/20";
  };

  const filteredHistory = history.filter((item) => {
    const repoMatch = item.repoUrl.toLowerCase().includes(search.toLowerCase());
    const statusMatch =
      statusFilter === "All" ||
      item.status.toLowerCase().includes(statusFilter.toLowerCase());
    return repoMatch && statusMatch;
  });

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col text-slate-100 font-sans">
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white font-display">Scan History</h1>
            <p className="text-slate-400 text-xs mt-1">Review the AI grades and recommendations of previously analyzed projects.</p>
          </div>

          {/* Search and Filter Panel */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center glow-card">
            <div className="relative w-full sm:max-w-xs flex items-center">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search repository..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-300 placeholder-slate-600 rounded-lg text-sm focus:outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-sm py-2 px-3 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="All">All Verdicts</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Average">Average</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
          </div>

          {loading ? (
            <TableSkeleton />
          ) : filteredHistory.length === 0 ? (
            <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center glow-card">
              <FolderGit2 className="w-12 h-12 text-slate-600 mb-4" />
              <h3 className="text-base font-bold text-white font-display">No logs found</h3>
              <p className="text-slate-400 text-sm max-w-xs mt-1 font-sans">
                {history.length === 0
                  ? "You haven't run any repository scans yet."
                  : "No logs match the current search filters."}
              </p>
            </div>
          ) : (
            <div className="bg-[#1E293B] border border-slate-800 rounded-2xl overflow-hidden shadow-xl glow-card">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400 text-xs font-semibold uppercase tracking-wider select-none border-b border-slate-800/80">
                    <tr>
                      <th className="px-6 py-4">Repository Name</th>
                      <th className="px-6 py-4">Overall Score</th>
                      <th className="px-6 py-4">Verdict Status</th>
                      <th className="px-6 py-4">Date Scanned</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 font-sans">
                    {filteredHistory.map((item) => {
                      const cleaned = item.repoUrl.replace("https://github.com/", "");
                      const [owner, name] = cleaned.split("/");
                      const dispName = name ? `${owner}/${name}` : cleaned;

                      return (
                        <tr key={item._id} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="px-6 py-4 font-semibold text-slate-200">
                            <span className="group-hover:text-indigo-400 transition-colors truncate block max-w-xs md:max-w-md">
                              {dispName}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-extrabold text-white text-base">{item.score.toFixed(1)}</span>
                            <span className="text-xs text-slate-500 font-semibold"> / 10.0</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link to={`/analysis/${item._id}`}>
                              <Button size="sm" variant="ghost" className="opacity-80 group-hover:opacity-100 flex items-center gap-1 cursor-pointer">
                                View Details <ArrowUpRight className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default History;
