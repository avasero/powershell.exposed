"use client";

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
      <h2 className="text-lg sm:text-xl font-mono font-bold mb-4" style={{color: 'var(--foreground)'}}>
        Indicators Summary ({signatures.length})
      </h2>
      
      <div className="border rounded-lg overflow-hidden bg-black/80 border-green-500/30">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead className="border-b border-green-500/30">
              <tr style={{backgroundColor: 'var(--card-bg)'}}>
                <th className="text-left p-3 font-bold" style={{color: 'var(--accent)'}}>#</th>
                <th className="text-left p-3 font-bold" style={{color: 'var(--accent)'}}>Indicator Name</th>
                <th className="text-left p-3 font-bold" style={{color: 'var(--accent)'}}>Severity</th>
                <th className="text-left p-3 font-bold" style={{color: 'var(--accent)'}}>Score</th>
                <th className="text-left p-3 font-bold" style={{color: 'var(--accent)'}}>Tactics</th>
                <th className="text-left p-3 font-bold" style={{color: 'var(--accent)'}}>Techniques</th>
              </tr>
            </thead>
            <tbody>
              {signatures.map((sig, index) => (
                <tr 
                  key={index}
                  onClick={() => handleJumpToIndicator(index)}
                  className="border-b border-green-500/10 hover:bg-green-500/10 cursor-pointer transition-colors"
                  title="Click to jump to details"
                >
                  <td className="p-3" style={{color: 'var(--muted-foreground)'}}>
                    {index + 1}
                  </td>
                  <td className="p-3 font-semibold" style={{color: 'var(--foreground)'}}>
                    <div className="max-w-xs truncate" title={sig.name}>
                      {sig.name}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${getSeverityBadge(sig.severity)}`}>
                      {sig.severity?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-bold" style={{color: 'var(--accent)'}}>
                      {(sig.total_score || sig.score || 0).toFixed(1)}
                    </span>
                    {sig.matches_found > 1 && (
                      <span className="text-xs ml-1" style={{color: 'var(--muted-foreground)'}}>
                        (×{sig.matches_found})
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
                          style={{color: 'var(--muted-foreground)'}}
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
                          style={{color: 'var(--muted-foreground)'}}
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