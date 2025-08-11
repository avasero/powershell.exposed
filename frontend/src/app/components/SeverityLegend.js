"use client";
import SeverityBadge from './SeverityBadge';

const SCORE_RANGES = {
  low: {
    label: "1.0 - 2.0",
    description: "Low Risk: Informational findings with minimal impact.",
  },
  mild: {
    label: "2.1 - 4.0", 
    description: "Mild Risk: Minor security findings that should be monitored.",
  },
  moderate: {
    label: "4.1 - 6.0",
    description: "Moderate Risk: Activities requiring attention and review.",
  },
  elevated: {
    label: "6.1 - 8.0",
    description: "Elevated Risk: High-risk activities requiring immediate attention.",
  },
  critical: {
    label: "8.15 - 10.0",
    description: "Critical Risk: Highly dangerous commands requiring immediate action!",
  },
};

const SCORE_COLORS = {
  low: "border-blue-400 text-blue-400",
  mild: "border-green-400 text-green-400",
  moderate: "border-yellow-400 text-yellow-400", 
  elevated: "border-orange-400 text-orange-400",
  critical: "border-red-600 text-red-600",
};

export default function SeverityLegend({ className = "" }) {
  return (
    <div className={`w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8 ${className}`}>
      <h2 className="text-base sm:text-lg font-mono font-bold mb-3 sm:mb-4 text-center" style={{color: 'var(--accent)'}}>
        Score Ranges
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {Object.entries(SCORE_RANGES).map(([key, val]) => (
          <div key={key} className={`border-l-4 pl-3 sm:pl-4 py-2 ${SCORE_COLORS[key]}`}>
            <div className="font-mono font-bold text-sm sm:text-base mb-1 capitalize" style={{color: 'var(--foreground)'}}>
              {val.label}
            </div>
            <div className="font-mono text-xs" style={{color: 'var(--foreground)', opacity: 0.8}}>
              {val.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
