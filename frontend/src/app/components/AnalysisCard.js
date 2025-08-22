"use client";

import SeverityBadge from './SeverityBadge';

export default function AnalysisCard({ 
  title, 
  description,
  severity,
  score,
  pattern,
  matched_text,
  matched_command,
  keywords,
  tactic,
  technique,
  reference,
  matchesInfo,
  children, 
  variant = "default",
  className = "" 
}) {
  const variantStyles = {
    default: {
      backgroundColor: 'var(--card-bg)',
      borderColor: 'var(--border-color)'
    },
    info: {
      backgroundColor: 'var(--card-bg)',
      borderColor: 'var(--primary-blue)'
    },
    warning: {
      backgroundColor: 'var(--card-bg)',
      borderColor: 'var(--secondary)'
    }
  };

  const variantTitleColors = {
    default: 'var(--accent)',
    info: 'var(--primary-blue)',
    warning: 'var(--secondary)'
  };

  // Função para destacar o texto que fez match
  const highlightMatch = (command, matchedText) => {
    if (!command || !matchedText) return command || '';
    
    const regex = new RegExp(`(${matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = command.split(regex);
    
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

  // Se tem detalhes de signature, mostrar layout detalhado
  if (title && (description || severity || score)) {
    return (
      <div 
        className={`border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 ${className}`} 
        style={variantStyles[variant]}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
          <h4 className="font-mono font-bold text-base sm:text-lg mb-2 sm:mb-0" style={{color: variantTitleColors[variant]}}>
            {title}
          </h4>
          <div className="flex items-center gap-3">
            {severity && <SeverityBadge score={score} />}
            {score && (
              <div className="text-sm font-mono font-bold px-2 py-1 rounded" 
                style={{backgroundColor: 'var(--muted)', color: 'var(--accent)'}}>
                Score: {score}
              </div>
            )}
          </div>
        </div>

        {description && (
          <div className="mb-4">
            <div className="text-sm font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
              Description:
            </div>
            <div className="text-sm font-mono" style={{color: 'var(--foreground)'}}>
              {description}
            </div>
          </div>
        )}

        {/* Matches Information */}
        {matchesInfo && (
          <div className="mb-4">
            <div className="text-sm font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
              Matches Found:
            </div>
            <div className="text-sm font-mono p-3 rounded" style={{backgroundColor: 'var(--muted)', color: 'var(--foreground)'}}>
              <div className="mb-2">
                <span className="font-bold">Matches: </span>
                <span className="text-green-400">{matchesInfo.matchesFound || 'N/A'}</span>
                <span className="text-gray-400"> / {matchesInfo.maxMatchAllowed || 'N/A'}</span>
              </div>
              <div className="mb-2">
                <span className="font-bold">Score Base: </span>
                <span className="text-yellow-400">{matchesInfo.baseScore || 'N/A'}</span>
              </div>
              <div className="mb-2">
                <span className="font-bold">Score Total: </span>
                <span className="text-red-400 font-bold">{matchesInfo.totalScore || 'N/A'}</span>
                <span className="text-gray-400"> ({matchesInfo.baseScore || 'N/A'} × {matchesInfo.matchesFound || 'N/A'})</span>
              </div>
              
              {/* Detalhes dos matches individuais */}
              {matchesInfo.matchesDetails && matchesInfo.matchesDetails.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="text-xs font-bold mb-2" style={{color: 'var(--accent)'}}>
                    Match Details:
                  </div>
                  <div className="space-y-2">
                    {matchesInfo.matchesDetails.map((match, idx) => (
                      <div key={idx} className="text-xs p-2 rounded" style={{backgroundColor: 'var(--background)', border: '1px solid var(--border-color)'}}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold">Match {match.match_number || idx + 1}:</span>
                          <span className="text-green-400">Pos {match.position?.start || 'N/A'}-{match.position?.end || 'N/A'}</span>
                        </div>
                        <div className="font-mono break-all" style={{color: 'var(--foreground)'}}>
                          <span className="text-yellow-400">&ldquo;{match.matched_text || 'N/A'}&rdquo;</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Matched Patterns - mostrar patterns dos matches individuais */}
        {matchesInfo && matchesInfo.matchesDetails && matchesInfo.matchesDetails.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
              Matched Patterns:
            </div>
            <div className="space-y-2">
              {matchesInfo.matchesDetails.map((match, idx) => (
                <div key={idx} className="text-sm font-mono p-2 rounded break-all" 
                  style={{backgroundColor: 'var(--muted)', color: 'var(--foreground)'}}>
                  <div className="text-xs text-gray-400 mb-1">Pattern {idx + 1}:</div>
                  <div className="font-bold">{match.pattern || 'Unknown pattern'}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Matched: <span className="text-yellow-400">"{match.matched_text}"</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(tactic || technique) && (
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            {tactic && (
              <div>
                <div className="text-sm font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
                  MITRE Tactics:
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(tactic) ? tactic.map((t, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded font-mono"
                      style={{backgroundColor: 'var(--primary-blue)', color: 'white'}}>
                      {t}
                    </span>
                  )) : (
                    <span className="text-xs px-2 py-1 rounded font-mono"
                      style={{backgroundColor: 'var(--primary-blue)', color: 'white'}}>
                      {tactic}
                    </span>
                  )}
                </div>
              </div>
            )}

            {technique && (
              <div>
                <div className="text-sm font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
                  MITRE Techniques:
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(technique) ? technique.map((t, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded font-mono"
                      style={{backgroundColor: 'var(--secondary)', color: 'white'}}>
                      {t}
                    </span>
                  )) : (
                    <span className="text-xs px-2 py-1 rounded font-mono"
                      style={{backgroundColor: 'var(--secondary)', color: 'white'}}>
                      {technique}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {reference && (
          <div>
            <div className="text-sm font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
              References:
            </div>
            <div className="text-xs">
              {Array.isArray(reference) ? reference.map((ref, i) => (
                <div key={i} className="mb-1">
                  <a href={ref} target="_blank" rel="noopener noreferrer" 
                    className="font-mono hover:underline" 
                    style={{color: 'var(--primary-blue)'}}>
                    {ref}
                  </a>
                </div>
              )) : (
                <a href={reference} target="_blank" rel="noopener noreferrer" 
                  className="font-mono hover:underline" 
                  style={{color: 'var(--primary-blue)'}}>
                  {reference}
                </a>
              )}
            </div>
          </div>
        )}

        {children && (
          <div className="font-mono text-xs sm:text-sm" style={{color: 'var(--foreground)'}}>
            {children}
          </div>
        )}
      </div>
    );
  }

  // Layout simples para uso geral
  return (
    <div 
      className={`border rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 ${className}`} 
      style={variantStyles[variant]}
    >
      {title && (
        <h4 className="font-mono font-bold mb-2 text-sm sm:text-base" style={{color: variantTitleColors[variant]}}>
          {title}
        </h4>
      )}
      <div className="font-mono text-xs sm:text-sm" style={{color: 'var(--foreground)'}}>
        {children}
      </div>
    </div>
  );
}
