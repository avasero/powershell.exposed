"use client";
import { useState } from 'react';

const SCORE_RANGES = {
  informational: {
    label: "1.0",
    description: "Informational: Extremely common, benign behavior",
  },
  low: {
    label: "2.0 - 4.0", 
    description: "Low: Relevant activity",
  },
  medium: {
    label: "5.0 - 7.0",
    description: "Medium: Fairly notable activity",
  },
  high: {
    label: "8.0 - 9.0",
    description: "High: Highly notable activity",
  },
  critical: {
    label: "10.0",
    description: "Critical: Extremely notable, likely suspicious activity",
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
          className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs font-normal hover:bg-current hover:text-black transition-colors"
          style={{color: 'var(--accent)', textTransform: 'none'}}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          title="Score ranges information"
        >
          i
        </button>
      </div>

      {/* Tooltip Content */}
      {showTooltip && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 w-80 rounded-lg shadow-xl p-4" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', border: '1px solid var(--border-color)'}}>
          <div className="text-center mb-3">
            <h3 className="text-sm font-mono font-bold" style={{color: 'var(--accent)'}}>
              Scoring Information
            </h3>
          </div>
          
          {/* Tier Information */}
          <div className="mb-4 p-3 rounded" style={{backgroundColor: 'var(--muted)', borderColor: 'var(--border-color)', border: '1px solid var(--border-color)'}}>
            <div className="text-xs font-mono mb-2" style={{color: 'var(--foreground)'}}>
              The "Basic" Tier matches against a limited set of indicators, mostly pattern/regex based and only enables simple, aggregated score.
            </div>
            <div className="text-xs font-mono" style={{color: 'var(--foreground)'}}>
              In the "Premium" tier, besides testing payloads against a wider range of indicators (regex plus behavioral/anomaly), the scoring is based on a weighted model which also outputs a severity label.
            </div>
          </div>
          
          {/* Scoring Notes */}
          <div className="mb-4">
            <div className="text-xs font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
              A few notes on the simple, aggregated scoring:
            </div>
            <div className="space-y-1 text-xs font-mono" style={{color: 'var(--foreground)', opacity: 0.9}}>
              <div>• Each regex/pattern indicator has a base score.</div>
              <div>• A few indicators are subject to multi-matching (refer to "maxmatch" parameter in the YAML).</div>
              <div>• Individual indicator scores are summed up to form the aggregated, total score.</div>
              <div>• Higher scores are NOT necessarily tied to a suspicious payload but larger indicator footprint.</div>
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
                  <div className="font-mono font-bold text-xs mb-1" style={{color: 'var(--foreground)'}}>
                    {val.label} {key.charAt(0).toUpperCase() + key.slice(1)}: {val.description.split(': ')[1]}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Tooltip Arrow */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent" style={{borderBottomColor: 'var(--border-color)'}}></div>
        </div>
      )}
    </div>
  );
}
