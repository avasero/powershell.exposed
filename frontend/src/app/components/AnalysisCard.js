"use client";

import SeverityBadge from './SeverityBadge';

// Function to truncate regex around the match
function truncateRegexAroundMatch(pattern, matchedText, maxLength = 120) {
  if (!pattern || pattern.length <= maxLength) return pattern;

  const matchIndex = pattern.toLowerCase().indexOf(matchedText.toLowerCase());
  if (matchIndex === -1) return pattern;

  const start = Math.max(0, matchIndex - Math.floor(maxLength / 2));
  const end = Math.min(pattern.length, start + maxLength);

  let truncated = pattern.substring(start, end);

  if (start > 0) truncated = '(...)' + truncated;
  if (end < pattern.length) truncated = truncated + '(...)';

  return truncated;
}

// Function to truncate long text with ellipsis
function truncateText(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export default function AnalysisCard({
  title,
  description,
  severity,
  score,
  pattern,
  matched_text,
  matched_command,
  keywords,
  tactic = [],
  technique = [],
  reference = "",
  link = null,
  matchesInfo,
  index = 0,
  variant = "default",  // ✅ Adicionar prop variant com valor padrão
  className = "",  // ✅ Adicionar prop className com valor padrão
  children,  // ✅ Adicionar prop children
  indicatorType // ✅ Adicionar prop indicatorType
}) {
  // Debug: log the link prop
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
        id={`indicator-${index}`}  // ✅ Adicionar ID único
        className={`border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all`}
        style={variantStyles[variant]}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-mono font-bold text-base sm:text-lg mb-2 sm:mb-0" style={{ color: variantTitleColors[variant] }}>
              {title}
            </h4>
            {link && indicatorType?.toLowerCase() === 'community' && (
              <div className="mb-2">
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono hover:underline"
                  style={{ color: 'var(--primary-blue)' }}
                >
                  📄 View YAML Source
                </a>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0 sm:ml-4">
            {/* Indicator Type Badge */}
            {(() => {
              const type = indicatorType?.toLowerCase();
              if (type === 'community' || type === 'private' || type === 'premium') {
                const isCommunity = type === 'community';
                return (
                  <span
                    className={`font-mono text-xs px-2 py-1 rounded border ${isCommunity
                      ? 'border-blue-500/50 text-blue-400 bg-blue-500/20'
                      : 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                      }`}
                    title={isCommunity ? 'Community indicator' : 'Private/Premium indicator'}
                  >
                    {isCommunity ? 'COMMUNITY' : 'PREMIUM'}
                  </span>
                );
              }
              return null;
            })()}

            <SeverityBadge severity={severity} score={score} />
          </div>
        </div>

        {description && (
          <div className="mb-4">
            <div className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--accent)' }}>
              Description:
            </div>
            <div className="text-sm font-mono" style={{ color: 'var(--foreground)' }}>
              {description}
            </div>
          </div>
        )}

        {matchesInfo && (
          <div className="mb-4">
            <div className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--accent)' }}>
              Matches Found:
            </div>
            <div className="text-sm font-mono p-3 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}>
              <div className="mb-2">
                <span className="font-bold">Matches: </span>
                <span className="text-green-400">{matchesInfo.matchesFound || 'N/A'}</span>
                <span className="text-gray-400"> / {matchesInfo.maxMatchAllowed || 'N/A'}</span>
              </div>
              <div className="mb-2">
                <span className="font-bold">Score: </span>
                <span className="text-green-400 font-bold">{matchesInfo.baseScore || 'N/A'}</span>
              </div>

              {matchesInfo.matchesDetails && matchesInfo.matchesDetails.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="text-xs font-bold mb-2" style={{ color: 'var(--accent)' }}>
                    String Matches:
                  </div>
                  <div className="space-y-2">
                    {matchesInfo.matchesDetails
                      .filter(match => match && match.matched_text) // ✅ Filtrar antes de renderizar
                      .map((match, idx) => (
                        <div key={idx} className="text-xs p-2 rounded" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border-color)' }}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold">Match {match.match_number || idx + 1}:</span>
                            <span className="text-green-400">Pos {match.position?.start ?? 0}-{match.position?.end ?? 0}</span>
                          </div>
                          <div className="font-mono break-all" style={{ color: 'var(--foreground)' }}>
                            <span className="text-yellow-400 break-all">&ldquo;{match.matched_text || 'N/A'}&rdquo;</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {matchesInfo && matchesInfo.matchesDetails && matchesInfo.matchesDetails.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--accent)' }}>
              Match Location
            </div>
            <div className="text-sm font-mono p-3 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}>
              {(() => {
                // ✅ FIX: Use o pattern que está no nível da signature (props)
                const signaturePattern = pattern || 'Unknown pattern';

                // Como agora há apenas UM pattern por signature, agrupar todos os matches
                const allMatches = matchesInfo.matchesDetails.map((match, idx) => ({
                  ...match,
                  originalIndex: idx
                }));

                // Função para compactar o padrão entre os matches
                const compactPatternWithMatches = (pattern, matches) => {
                  if (matches.length === 0) return pattern;

                  // ✅ Filtrar matches inválidos ANTES de usar
                  const validMatches = matches.filter(match =>
                    match &&
                    match.matched_text &&
                    typeof match.matched_text === 'string' &&
                    match.matched_text.length > 0
                  );

                  if (validMatches.length === 0) return pattern;

                  // Ordenar matches por posição no padrão
                  const sortedMatches = validMatches
                    .map(match => ({
                      ...match,
                      index: pattern.toLowerCase().indexOf(match.matched_text.toLowerCase())
                    }))
                    .filter(match => match.index !== -1)
                    .sort((a, b) => a.index - b.index);

                  if (sortedMatches.length === 0) return pattern;

                  let result = '';
                  let lastEnd = 0;

                  sortedMatches.forEach((match, idx) => {
                    const matchStart = match.index;
                    const matchEnd = matchStart + match.matched_text.length;

                    // Adicionar texto antes do match
                    if (matchStart > lastEnd) {
                      const beforeText = pattern.substring(lastEnd, matchStart);

                      if (idx === 0) {
                        if (beforeText.length > 50) {
                          result += '(...)' + beforeText.substring(beforeText.length - 50);
                        } else {
                          result += beforeText;
                        }
                      } else {
                        if (beforeText.length > 20) {
                          result += '(...)';
                        } else {
                          result += beforeText;
                        }
                      }
                    }

                    result += `<mark>${match.matched_text}</mark>`;
                    lastEnd = matchEnd;
                  });

                  // Adicionar texto após o último match
                  if (lastEnd < pattern.length) {
                    const afterText = pattern.substring(lastEnd);
                    if (afterText.length > 50) {
                      result += afterText.substring(0, 50) + '(...)';
                    } else {
                      result += afterText;
                    }
                  }

                  return result;
                };

                return (
                  <div className="mb-3 last:mb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs text-white">
                        Pattern ({allMatches.length} match{allMatches.length !== 1 ? 'es' : ''})
                      </div>
                      {link && indicatorType?.toLowerCase() === 'community' && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs hover:underline cursor-pointer"
                          style={{ color: 'var(--primary-blue)' }}
                          title="Click on the YAML to see the full regex"
                        >
                          📄 YAML (click to see full regex)
                        </a>
                      )}
                    </div>

                    <div className="font-bold break-all mb-2 p-2 rounded" style={{ backgroundColor: 'var(--background)', fontSize: '11px', border: '1px solid var(--border-color)' }}>
                      {(() => {
                        const compactPattern = compactPatternWithMatches(signaturePattern, allMatches);

                        const parts = compactPattern.split(/(<mark>.*?<\/mark>)/g);
                        return parts.map((part, index) => {
                          if (part.startsWith('<mark>') && part.endsWith('</mark>')) {
                            const content = part.slice(6, -7);
                            return (
                              <span key={index} className="bg-yellow-400 text-black px-1 rounded font-bold">
                                {content}
                              </span>
                            );
                          }
                          return part;
                        });
                      })()}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {allMatches
                        .filter(match => match && match.matched_text && match.matched_text.length > 0) // ✅ Filtrar matches inválidos
                        .map((match, matchIdx) => (
                          <div key={matchIdx} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs max-w-full"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--background)' }}>
                            <span className="font-bold break-all" title={match.matched_text}>
                              {truncateText(match.matched_text, 50)}
                            </span>
                            {match.position && (
                              <span className="opacity-75 flex-shrink-0">
                                [{match.position.start ?? 0}-{match.position.end ?? 0}]
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {(tactic || technique) && (
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            {tactic && (
              <div>
                <div className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--accent)' }}>
                  MITRE Tactics:
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(tactic) ? tactic.map((t, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded font-mono"
                      style={{ backgroundColor: '#1E9CFD', color: 'white' }}>
                      {t}
                    </span>
                  )) : (
                    <span className="text-xs px-2 py-1 rounded font-mono"
                      style={{ backgroundColor: '#1E9CFD', color: 'white' }}>
                      {tactic}
                    </span>
                  )}
                </div>
              </div>
            )}

            {technique && (
              <div>
                <div className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--accent)' }}>
                  MITRE Techniques:
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(technique) ? technique.map((t, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded font-mono"
                      style={{ backgroundColor: '#7140ed', color: 'white' }}>
                      {t}
                    </span>
                  )) : (
                    <span className="text-xs px-2 py-1 rounded font-mono"
                      style={{ backgroundColor: '#7140ed', color: 'white' }}>
                      {technique}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        

        {children && (
          <div className="font-mono text-xs sm:text-sm" style={{ color: 'var(--foreground)' }}>
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`border rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all ${className}`}
      style={variantStyles[variant]}
    >
      {title && (
        <h4 className="font-mono font-bold mb-2 text-sm sm:text-base" style={{ color: variantTitleColors[variant] }}>
          {title}
        </h4>
      )}
      <div className="font-mono text-xs sm:text-sm" style={{ color: 'var(--foreground)' }}>
        {children}
      </div>
    </div>
  );
}