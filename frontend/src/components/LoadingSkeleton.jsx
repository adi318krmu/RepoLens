import React from "react";

export const CardSkeleton = () => (
  <div className="bg-[#1E293B] border border-slate-800/80 rounded-xl p-5 animate-pulse glow-card">
    <div className="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
    <div className="h-8 bg-slate-700 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-slate-700 rounded w-2/3"></div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="bg-[#1E293B] border border-slate-800/80 rounded-xl p-5 h-80 animate-pulse flex flex-col justify-between glow-card">
    <div>
      <div className="h-5 bg-slate-700 rounded w-1/4 mb-6"></div>
    </div>
    <div className="w-full flex items-end gap-4 h-48 px-2">
      <div className="bg-slate-700 rounded h-[30%] flex-1"></div>
      <div className="bg-slate-700 rounded h-[60%] flex-1"></div>
      <div className="bg-slate-700 rounded h-[45%] flex-1"></div>
      <div className="bg-slate-700 rounded h-[85%] flex-1"></div>
      <div className="bg-slate-700 rounded h-[55%] flex-1"></div>
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="bg-[#1E293B] border border-slate-800/80 rounded-xl p-6 animate-pulse glow-card">
    <div className="h-5 bg-slate-700 rounded w-1/6 mb-6"></div>
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex justify-between items-center py-3 border-b border-slate-800 last:border-0">
          <div className="h-4 bg-slate-700 rounded w-1/4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/12"></div>
          <div className="h-4 bg-slate-700 rounded w-1/6"></div>
          <div className="h-4 bg-slate-700 rounded w-1/12"></div>
        </div>
      ))}
    </div>
  </div>
);

const LoadingSkeleton = () => <CardSkeleton />;
export default LoadingSkeleton;
