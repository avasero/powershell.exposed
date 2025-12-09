/**
 * Severity color definitions used consistently across the application
 * Score Ranges:
 * 1.0 - 1.99: Informational (Blue) - Extremely common, benign behavior
 * 2.0 - 4.99: Low (Green) - Relevant activity
 * 5.0 - 7.99: Medium (Yellow) - Fairly notable activity
 * 8.0 - 9.99: High (Orange) - Highly notable activity
 * 10.0+: Critical (Red) - Extremely notable, likely suspicious activity
 */

export const SEVERITY_COLORS = {
  CRITICAL: {
    text: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    accent: '#ef4444'
  },
  HIGH: {
    text: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    accent: '#f97316'
  },
  MEDIUM: {
    text: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    accent: '#eab308'
  },
  LOW: {
    text: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/30',
    accent: '#4ade80'
  },
  INFORMATIONAL: {
    text: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30',
    accent: '#60a5fa'
  },
  VERY_LOW: {
    text: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    accent: '#3b82f6'
  }
};

export const getSeverityColor = (severity) => {
  if (!severity) return SEVERITY_COLORS.INFORMATIONAL;
  
  const normalizedSeverity = severity.toUpperCase().replace(/_/g, '');
  
  switch (normalizedSeverity) {
    case 'CRITICAL':
      return SEVERITY_COLORS.CRITICAL;
    case 'HIGH':
      return SEVERITY_COLORS.HIGH;
    case 'MEDIUM':
      return SEVERITY_COLORS.MEDIUM;
    case 'LOW':
      return SEVERITY_COLORS.LOW;
    case 'INFORMATIONAL':
      return SEVERITY_COLORS.INFORMATIONAL;
    case 'VERYLOW':
      return SEVERITY_COLORS.VERY_LOW;
    default:
      return SEVERITY_COLORS.INFORMATIONAL;
  }
};

export const getSeverityTextColor = (severity) => {
  return getSeverityColor(severity).text;
};
