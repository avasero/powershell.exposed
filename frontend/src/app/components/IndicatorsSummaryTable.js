"use client";

import { FaStar } from "react-icons/fa";

// Severity color mapping
// Score Ranges:
// 1.0 - 1.99: Informational (Blue) - Extremely common, benign behavior
// 2.0 - 4.99: Low (Green) - Relevant activity
// 5.0 - 7.99: Medium (Yellow) - Fairly notable activity
// 8.0 - 9.99: High (Orange) - Highly notable activity
// 10.0+: Critical (Red) - Extremely notable, likely suspicious activity
function getSeverityBadge(severity) {
  const colors = {
    'critical': 'bg-red-500/20 text-red-400 border-red-500/50',
    'high': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    'medium': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    'low': 'bg-green-500/20 text-green-400 border-green-500/50',
    'informational': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  };
  return colors[severity?.toLowerCase()] || 'bg-blue-500/20 text-blue-400 border-blue-500/50';
}

export default function IndicatorsSummaryTable({ signatures }) {
  if (!signatures || signatures.length === 0) return null;

  const handleJumpToIndicator = (index) => {
    const element = document.getElementById(`indicator-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash effect
      element.classList.add('ring-2', 'ring-accent', 'ring-offset-2', 'ring-offset-background');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-accent', 'ring-offset-2', 'ring-offset-background');
      }, 2000);
    }
  };

  return (
    <div className="w-full mb-6">
      <h2 className="text-lg sm:text-xl font-mono font-bold mb-4" style={{ color: 'var(--foreground)' }}>
        Indicators Summary ({signatures.length})
      </h2>

      <div className="border rounded-lg overflow-hidden bg-black/80 border-green-500/30">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead className="border-y border-green-500/10">
              <tr style={{ backgroundColor: 'var(--card-bg)' }}>
                <th className="text-left p-3 font-bold" style={{ color: 'var(--accent)' }}>#</th>
                <th className="text-left p-3 font-bold" style={{ color: 'var(--accent)' }}>Source</th>
                <th className="text-left p-3 font-bold" style={{ color: 'var(--accent)' }}>Indicator Name</th>
                <th className="text-left p-3 font-bold" style={{ color: 'var(--accent)' }}>Severity</th>
                <th className="text-left p-3 font-bold" style={{ color: 'var(--accent)' }}>Score</th>
                <th className="text-left p-3 font-bold" style={{ color: 'var(--accent)' }}>Tactics</th>
                <th className="text-left p-3 font-bold" style={{ color: 'var(--accent)' }}>Techniques</th>
              </tr>
            </thead>
            <tbody>
              {signatures.map((sig, index) => (
                <tr
                  key={index}
                  onClick={() => handleJumpToIndicator(index)}
                  className="border border-green-500/10 hover:bg-green-500/10 hover:border-green-500/30 cursor-pointer transition-colors"
                  title="Click to jump to details"
                >
                  <td className="p-3" style={{ color: 'var(--muted-foreground)' }}>
                    {index + 1}
                  </td>
                  <td className="p-3">
                    {(() => {
                      const type = sig.indicator_type?.toLowerCase();
                      // If san_score_applied, upgrade to premium regardless of original type
                      const isPremium = sig.san_score_applied || type === 'private' || type === 'premium';
                      if (type === 'community' || type === 'private' || type === 'premium') {
                        return isPremium ? (
                          <span
                            className="inline-flex rounded-lg"
                            style={{
                              background: 'linear-gradient(135deg, #C084FC, #7B2FBF, #C084FC, #6B1FA0, #C084FC)',
                              padding: '1.3px',
                              boxShadow: '0 0 6px rgba(155, 89, 182, 0.6), 0 0 15px rgba(155, 89, 182, 0.4), 0 0 30px rgba(130, 60, 200, 0.25)',
                            }}
                          >
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[calc(0.5rem-1.5px)] text-xs font-bold text-white"
                              style={{
                                background: 'linear-gradient(135deg, #8B2FC9 0%, #6B1FA0 40%, #4A1578 100%)',
                                backgroundImage: `linear-gradient(110deg, transparent 6%, rgba(255,255,255,0.06) 8%, rgba(255,255,255,0.06) 15%, transparent 17%, transparent 31%, rgba(255,255,255,0.04) 33%, rgba(255,255,255,0.04) 39%, transparent 41%, transparent 55%, rgba(255,255,255,0.07) 58%, rgba(255,255,255,0.07) 62%, transparent 64%, transparent 80%, rgba(255,255,255,0.05) 83%, rgba(255,255,255,0.05) 91%, transparent 93%), linear-gradient(135deg, #8B2FC9 0%, #6B1FA0 40%, #4A1578 100%)`,
                                textShadow: '0 0 6px rgba(200, 150, 255, 0.5)',
                              }}
                            >
                              <FaStar size={14} style={{ marginBottom: '2px', filter: 'drop-shadow(0 0 3px rgba(200, 150, 255, 0.6))', color: '#D8B4FE' }} /><span>PREMIUM</span>
                            </span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold text-blue-400"
                            style={{
                              background: 'rgba(59, 130, 246, 0.08)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            COMMUNITY
                          </span>
                        );
                      }
                      return (
                        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>—</span>
                      );
                    })()}
                  </td>
                  <td className="p-3 font-semibold" style={{ color: 'var(--foreground)' }}>
                    <div className="flex items-center gap-1.5 max-w-xs">
                      <span className="truncate" title={sig.name}>{sig.name}</span>
                      {sig.san_score_applied && (
                        <span title="Evasion technique detected">⚠️</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${getSeverityBadge(sig.severity)}`}>
                      {sig.severity?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="p-3">
                    {sig.san_score_applied ? (
                      <div className="flex items-center gap-1.5">
                        {(sig.base_score || 0) !== (sig.san_score || sig.total_score || 0) && (
                          <span className="text-gray-500 line-through text-xs">
                            {(sig.base_score || 0).toFixed(1)}
                          </span>
                        )}
                        <span className="font-bold text-red-400">
                          {(sig.san_score || sig.total_score || 0).toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold" style={{ color: 'var(--accent)' }}>
                        {(sig.base_score || sig.score || 0).toFixed(1)}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(sig.tactics || []).slice(0, 2).map((tactic, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: '#1E9CFD',
                            color: 'white'
                          }}
                          title={tactic}
                        >
                          {tactic.split(' ')[0]}
                        </span>
                      ))}
                      {(sig.tactics || []).length > 2 && (
                        <span
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          +{(sig.tactics || []).length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(sig.techniques || []).slice(0, 3).map((tech, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded text-xs font-mono"
                          style={{
                            backgroundColor: '#7140ed',
                            color: 'white'
                          }}
                        >
                          {tech}
                        </span>
                      ))}
                      {(sig.techniques || []).length > 3 && (
                        <span
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          +{(sig.techniques || []).length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}