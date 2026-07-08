import React from "react";
import { motion } from "framer-motion";

const CircularProgress = ({ value = 0, maxValue = 10, size = 120, strokeWidth = 10, label }) => {
  const percentage = Math.min(Math.max((value / maxValue) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (val) => {
    const norm = val / maxValue;
    if (norm >= 0.8) return "#22C55E"; // Success (Green)
    if (norm >= 0.7) return "#6366F1";  // Primary (Indigo)
    if (norm >= 0.5) return "#F59E0B";  // Warning (Amber)
    return "#EF4444";                  // Error (Red)
  };

  const activeColor = getColor(value);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#334155"
            strokeWidth={strokeWidth}
          />
          {/* Foreground circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={activeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        {/* Score text in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-white font-display">
            {value.toFixed(1)}
          </span>
          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
            / {maxValue}
          </span>
        </div>
      </div>
      {label && (
        <span className="mt-3 text-sm font-semibold text-slate-300 font-display">
          {label}
        </span>
      )}
    </div>
  );
};

export default CircularProgress;
