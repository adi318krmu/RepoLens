import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, SearchCode, History, User, X, FileText } from "lucide-react";

const Sidebar = ({ isOpen, onClose }) => {
  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Analyze Repository", path: "/analyze", icon: SearchCode },
    { name: "Resume Analyzer", path: "/resume-analyze", icon: FileText },
    { name: "History", path: "/history", icon: History },
    { name: "Profile", path: "/profile", icon: User },
  ];

  const sidebarContent = (
    <aside className="w-64 bg-[#0F172A] border-r border-slate-800/80 h-full flex flex-col pt-5 pb-4">
      {/* Mobile close button */}
      <div className="flex justify-end px-4 mb-2 md:hidden">
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => onClose && onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group cursor-pointer ${
                  isActive
                    ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500 pl-3"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 pl-4"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="px-6 py-4 border-t border-slate-800/80">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>Connected to Cloud AI</span>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar (visible on md+) */}
      <div className="hidden md:block w-64 h-[calc(100vh-4rem)] flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer (visible on <md) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0F172A] transform transition-transform duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
