"use client";
import SeverityBadge from './SeverityBadge';

export default function IndicatorTable({ signatures = [] }) {
  // Função para destacar o padrão com o texto que fez match
  const highlightPatternWithMatch = (pattern, matchedText) => {
    if (!pattern || !matchedText) return pattern || '';

    const regex = new RegExp(`(${matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = pattern.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === matchedText.toLowerCase()) {
        return (
          <span key={index} className="bg-yellow-400 text-black px-1 rounded font-bold">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-6">
      {signatures.length === 0 ? (
        <div className="border rounded-lg p-6 text-center bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all ">
          <h3 className="font-mono text-lg font-bold mb-2" style={{ color: 'var(--accent)' }}>
            No Indicators Detected
          </h3>
          <p className="font-mono text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
            This command appears to be safe.
          </p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all ">
            <div className="p-4 border-b border-green-500/30">
              <h3 className="font-mono text-lg font-bold" style={{ color: 'var(--accent)' }}>
                Detected Signatures ({signatures.length})
              </h3>
            </div>
          </div>

          {signatures.map((sig, idx) => (
            <div key={idx} className="border rounded-lg overflow-hidden bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all ">
              <div className="p-4 border-b flex items-center justify-between border-green-500/30" style={{ backgroundColor: 'rgba(156, 254, 65, 0.05)' }}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <SeverityBadge score={sig.score} />
                    <h4 className="font-mono text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                      {sig.name}
                    </h4>
                  </div>
                  {(() => {
                    const type = sig.indicator_type?.toLowerCase();
                    if (type === 'community' || type === 'private' || type === 'premium') {
                      const isCommunity = type === 'community';
                      return (
                        <span
                          className={`text-xs w-fit px-2 py-1 rounded border leading-none font-bold ml-[44px] ${isCommunity
                            ? 'border-blue-400 text-blue-300 bg-blue-950'
                            : 'border-purple-400 text-purple-300 bg-purple-950'
                            }`}
                        >
                          {isCommunity ? 'COMMUNITY' : 'PREMIUM'}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-opacity-75" style={{ color: 'var(--accent)' }}>Score</div>
                  <div className="font-mono text-xl font-bold" style={{ color: 'var(--accent)' }}>+{sig.score}</div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <h5 className="font-mono text-sm font-bold mb-2" style={{ color: 'var(--accent)' }}>Description:</h5>
                  <p className="font-mono text-sm" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
                    {sig.description}
                  </p>
                </div>

                {(sig.matched_text || sig.keyword) && (
                  <div>
                    <h5 className="font-mono text-sm font-bold mb-2" style={{ color: 'var(--accent)' }}>Matched Pattern:</h5>
                    <code className="font-mono text-xs p-2 rounded block" style={{ backgroundColor: 'rgba(156, 254, 65, 0.1)', color: 'var(--accent)' }}>
                      {highlightPatternWithMatch(sig.pattern || sig.keyword, sig.matched_text)}
                    </code>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {sig.tactic && sig.tactic.length > 0 && (
                    <div>
                      <h5 className="font-mono text-sm font-bold mb-2" style={{ color: 'var(--accent)' }}>MITRE Tactics:</h5>
                      <div className="flex flex-wrap gap-1">
                        {sig.tactic.map((tactic, tacticIdx) => (
                          <span key={tacticIdx} className="font-mono text-xs px-2 py-1 rounded"
                            style={{ backgroundColor: '#FFA500', color: 'white' }}>
                            {tactic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {sig.technique && sig.technique.length > 0 && (
                    <div>
                      <h5 className="font-mono text-sm font-bold mb-2" style={{ color: 'var(--accent)' }}>MITRE Techniques:</h5>
                      <div className="flex flex-wrap gap-1">
                        {sig.technique.map((technique, techIdx) => (
                          <span key={techIdx} className="font-mono text-xs px-2 py-1 rounded"
                            style={{ backgroundColor: '#1E9CFD', color: 'white' }}>
                            {technique}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {sig.reference && sig.reference.length > 0 && (
                  <div>
                    <h5 className="font-mono text-sm font-bold mb-2" style={{ color: 'var(--accent)' }}>References:</h5>
                    <ul className="space-y-1">
                      {sig.reference.map((ref, refIdx) => (
                        <li key={refIdx}>
                          <a href={ref} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-xs hover:underline break-all"
                            style={{ color: 'rgb(34, 197, 94)' }}>
                            {ref}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
