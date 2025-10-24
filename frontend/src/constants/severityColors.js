/**
 * Severity color definitions used consistently across the application
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
  if (!severity) return SEVERITY_COLORS.VERY_LOW;
  
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
    case 'VERYLOW':
      return SEVERITY_COLORS.VERY_LOW;
    default:
      return SEVERITY_COLORS.VERY_LOW;
  }
};

export const getSeverityTextColor = (severity) => {
  return getSeverityColor(severity).text;
};
