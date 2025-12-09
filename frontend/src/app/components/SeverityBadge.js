"use client";

// Severity-based color system matching IndicatorsSummaryTable
// Score Ranges:
// 1.0 - 1.99: Informational (Blue) - Extremely common, benign behavior
// 2.0 - 4.99: Low (Green) - Relevant activity
// 5.0 - 7.99: Medium (Yellow) - Fairly notable activity
// 8.0 - 9.99: High (Orange) - Highly notable activity
// 10.0+: Critical (Red) - Extremely notable, likely suspicious activity
function getSeverityColor(severity) {
  const colors = {
    'critical': 'bg-red-500/20 text-red-400 border-red-500/50',
    'high': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    'medium': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    'low': 'bg-green-500/20 text-green-400 border-green-500/50',
    'informational': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
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
  // 1.0-1.99: Informational (Blue), 2.0-4.99: Low (Green), 5.0-7.99: Medium (Yellow), 8.0-9.99: High (Orange), 10.0+: Critical (Red)
  let derivedSeverity = 'informational';
  if (score >= 10) derivedSeverity = 'critical';
  else if (score >= 8) derivedSeverity = 'high';
  else if (score >= 5) derivedSeverity = 'medium';
  else if (score >= 2) derivedSeverity = 'low';
  else derivedSeverity = 'informational';

  const colorClass = getSeverityColor(severity || derivedSeverity);

  return (
    <span className={`font-mono text-xs px-2 py-1 rounded border ${colorClass} ${className}`}>
      SCORE: {score.toFixed(1)}
    </span>
  );
}
