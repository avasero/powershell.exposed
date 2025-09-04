"use client";
import { useState } from 'react';

const SCORE_RANGES = {
  informational: {
    label: "1.0",
    description: "Informational: Extremely common, benign behavior",
  },
  low: {
    label: "2.0 - 4.0", 
    description: "Low: Notable activity",
  },
  medium: {
    label: "5.0 - 7.0",
    description: "Medium: Fairly suspicious activity",
  },
  high: {
    label: "8.0 - 9.0",
    description: "High: Highly suspicious activity",
  },
  critical: {
    label: "10.0",
    description: "Critical: Extremely suspicious activity",
  },
};

const SCORE_COLORS = {
  informational: "border-blue-400 text-blue-400",
  low: "border-green-400 text-green-400",
  medium: "border-yellow-400 text-yellow-400", 
  high: "border-orange-400 text-orange-400",
  critical: "border-red-600 text-red-600",
};

export default function SeverityLegend({ className = "" }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Tooltip Trigger */}
      <div className="flex items-center justify-center gap-2">
        <button
          className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs font-bold hover:bg-current hover:text-black transition-colors"
          style={{color: 'var(--accent)'}}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          title="Score ranges information"
        >
          i
        </button>
      </div>

      {/* Tooltip Content */}
      {showTooltip && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 w-80 bg-gray-900 border border-gray-600 rounded-lg shadow-xl p-4">
          <div className="text-center mb-3">
            <h3 className="text-sm font-mono font-bold" style={{color: 'var(--accent)'}}>
              Score Information
            </h3>
          </div>
          
          {/* Score Calculation Section */}
          <div className="mb-4 p-3 rounded border border-gray-700" style={{backgroundColor: 'var(--card-bg)'}}>
            <div className="text-xs font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
              How Scores Are Calculated:
            </div>
            <div className="space-y-1 text-xs font-mono" style={{color: 'var(--foreground)', opacity: 0.9}}>
              <div>• Each pattern has a base score</div>
              <div>• Multiple matches multiply the score</div>
              <div>• All pattern scores are summed</div>
              <div>• Higher scores indicate more suspicious activity</div>
            </div>
          </div>
          
          {/* Score Ranges Section */}
          <div className="mb-2">
            <div className="text-xs font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
              Score Ranges:
            </div>
            <div className="space-y-2">
              {Object.entries(SCORE_RANGES).map(([key, val]) => (
                <div key={key} className={`border-l-4 pl-3 py-2 ${SCORE_COLORS[key]}`}>
                  <div className="font-mono font-bold text-xs mb-1 capitalize" style={{color: 'var(--foreground)'}}>
                    {val.label}
                  </div>
                  <div className="font-mono text-xs" style={{color: 'var(--foreground)', opacity: 0.8}}>
                    {val.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Tooltip Arrow */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-600"></div>
        </div>
      )}
    </div>
  );
}
