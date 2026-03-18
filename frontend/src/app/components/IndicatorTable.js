"use client";
import { FaStar } from "react-icons/fa";
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
                      return !isCommunity ? (
                        <span
                          className="inline-flex rounded-lg w-fit ml-[44px]"
                          style={{
                            background: 'linear-gradient(135deg, #C084FC, #7B2FBF, #C084FC, #6B1FA0, #C084FC)',
                            padding: '1.3px',
                            boxShadow: '0 0 6px rgba(155, 89, 182, 0.6), 0 0 15px rgba(155, 89, 182, 0.4), 0 0 30px rgba(130, 60, 200, 0.25)',
                          }}
                        >
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[calc(0.5rem-1px)] text-[10px] leading-none font-bold text-white"
                            style={{
                              background: 'linear-gradient(135deg, #8B2FC9 0%, #6B1FA0 40%, #4A1578 100%)',
                              backgroundImage: `linear-gradient(110deg, transparent 6%, rgba(255,255,255,0.06) 8%, rgba(255,255,255,0.06) 15%, transparent 17%, transparent 31%, rgba(255,255,255,0.04) 33%, rgba(255,255,255,0.04) 39%, transparent 41%, transparent 55%, rgba(255,255,255,0.07) 58%, rgba(255,255,255,0.07) 62%, transparent 64%, transparent 80%, rgba(255,255,255,0.05) 83%, rgba(255,255,255,0.05) 91%, transparent 93%), linear-gradient(135deg, #8B2FC9 0%, #6B1FA0 40%, #4A1578 100%)`,
                              textShadow: '0 0 6px rgba(200, 150, 255, 0.5)',
                            }}
                          >
                            <FaStar size={8} style={{ marginBottom: '1px', filter: 'drop-shadow(0 0 3px rgba(200, 150, 255, 0.6))', color: '#D8B4FE' }} /><span>PREMIUM</span>
                          </span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-md text-[10px] leading-none font-bold text-blue-400 ml-[44px]"
                          style={{
                            background: 'rgba(59, 130, 246, 0.08)',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                          COMMUNITY
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
