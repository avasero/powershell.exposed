"use client";

// Severity-based color system matching IndicatorsSummaryTable
function getSeverityColor(severity) {
  const colors = {
    'critical': 'bg-red-500/20 text-red-400 border-red-500/50',
    'high': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    'medium': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    'low': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  };
  return colors[severity?.toLowerCase()] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
}

export default function SeverityBadge({ score, severity, className = "" }) {
  // Handle undefined score/severity gracefully
  if ((score === undefined || score === null) && !severity) {
    return (
      <span className={`font-mono text-xs px-2 py-1 rounded border bg-gray-500/20 text-gray-400 border-gray-500/50 ${className}`}>
        N/A
      </span>
    );
  }

  // Derive severity from score for coloring
  let derivedSeverity = 'low';
  if (score >= 8.1) derivedSeverity = 'critical';
  else if (score >= 6.1) derivedSeverity = 'high';
  else if (score >= 4.1) derivedSeverity = 'medium';
  else if (score >= 2.1) derivedSeverity = 'low';

  const colorClass = getSeverityColor(severity || derivedSeverity);

  return (
    <span className={`font-mono text-xs px-2 py-1 rounded border ${colorClass} ${className}`}>
      SCORE: {score.toFixed(1)}
    </span>
  );
}
