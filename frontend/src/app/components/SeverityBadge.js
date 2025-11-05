"use client";

// Score-based color system (5 bins from 1-10)
function getScoreColor(score) {
  if (score >= 8.1) return "border-red-600 text-red-600";      // Critical: 8.1-10.0
  if (score >= 6.1) return "border-orange-400 text-orange-400"; // High: 6.1-8.0
  if (score >= 4.1) return "border-yellow-400 text-yellow-400"; // Medium: 4.1-6.0
  if (score >= 2.1) return "border-green-400 text-green-400";   // Low: 2.1-4.0
  return "border-green-400 text-green-400";                      // Very Low: 1.0-2.0
}

export default function SeverityBadge({ score, className = "" }) {
  // Handle undefined score gracefully
  if (score === undefined || score === null) {
    return (
      <span className={`font-mono text-xs px-1 sm:px-2 py-1 rounded border border-gray-400 text-gray-400 bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all ${className}`}>
        N/A
      </span>
    );
  }

  return (
    <span className={`font-mono text-xs px-1 sm:px-2 py-1 rounded border bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all ${getScoreColor(score)} ${className}`}>
      Score: {score.toFixed(1)}
    </span>
  );
}
