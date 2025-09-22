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

// Function to generate YAML link
function getYamlLink(signatureName) {
  // Convert signature name to potential YAML filename
  const filename = signatureName.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
  return `https://github.com/powershell-exposed/signatures/blob/main/${filename}.yml`;
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
  tactic,
  technique,
  reference,
  matchesInfo,
  link,
  children, 
  variant = "default",
  className = "" 
}) {
  // Debug: log the link prop
  console.log(`AnalysisCard for "${title}": link =`, link);
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
        className={`border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all ${className}`} 
        style={variantStyles[variant]}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-mono font-bold text-base sm:text-lg mb-2 sm:mb-0" style={{color: variantTitleColors[variant]}}>
              {title}
            </h4>
            {link && (
              <div className="mb-2">
                <a 
                  href={link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs font-mono hover:underline"
                  style={{color: 'var(--primary-blue)'}}
                >
                  📄 View YAML Source
                </a>
              </div>
            )}
          </div>
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
              
              {matchesInfo.matchesDetails && matchesInfo.matchesDetails.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="text-xs font-bold mb-2" style={{color: 'var(--accent)'}}>
                    String Matches:
                  </div>
                  <div className="space-y-2">
                    {matchesInfo.matchesDetails.map((match, idx) => (
                      <div key={idx} className="text-xs p-2 rounded" style={{backgroundColor: 'var(--background)', border: '1px solid var(--border-color)'}}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold">Match {match.match_number || idx + 1}:</span>
                          <span className="text-green-400">Pos {match.position?.start || 'N/A'}-{match.position?.end || 'N/A'}</span>
                        </div>
                        <div className="font-mono break-all" style={{color: 'var(--foreground)'}}>
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
            <div className="text-sm font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
              Match Location
            </div>
            {(() => {
              const uniquePatterns = new Map();
              matchesInfo.matchesDetails.forEach((match, idx) => {
                const pattern = match.pattern || 'Unknown pattern';
                if (!uniquePatterns.has(pattern)) {
                  uniquePatterns.set(pattern, []);
                }
                uniquePatterns.get(pattern).push({...match, originalIndex: idx});
              });

              // Função para compactar o padrão entre os matches
              const compactPatternWithMatches = (pattern, matches) => {
                if (matches.length === 0) return pattern;
                
                // Ordenar matches por posição no padrão
                const sortedMatches = matches
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
                    
                    // Para o primeiro match, mostrar mais contexto (até 50 caracteres)
                    if (idx === 0) {
                      if (beforeText.length > 50) {
                        result += '(...)' + beforeText.substring(beforeText.length - 50);
                      } else {
                        result += beforeText;
                      }
                    } else {
                      // Para matches subsequentes, compactar mais (20 caracteres)
                      if (beforeText.length > 20) {
                        result += '(...)';
                      } else {
                        result += beforeText;
                      }
                    }
                  }
                  
                  // Adicionar o match destacado
                  result += `<mark>${match.matched_text}</mark>`;
                  
                  lastEnd = matchEnd;
                });
                
                // Adicionar texto após o último match - mostrar mais contexto (até 50 caracteres)
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

              return Array.from(uniquePatterns.entries()).map(([pattern, matches], patternIdx) => (
                <div key={patternIdx} className="text-sm font-mono p-3 mb-3 rounded border" 
                  style={{backgroundColor: 'var(--muted)', color: 'var(--foreground)', borderColor: 'var(--border-color)'}}>
                  
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-gray-400">
                      Pattern {patternIdx + 1} ({matches.length} match{matches.length !== 1 ? 'es' : ''})
                    </div>
                    {link && (
                      <a 
                        href={link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs hover:underline cursor-pointer"
                        style={{color: 'var(--primary-blue)'}}
                        title="Click on the YAML to see the full regex"
                      >
                        📄 YAML (click to see full regex)
                      </a>
                    )}
                  </div>
                  
                  <div className="font-bold break-all mb-2 p-2 rounded" style={{backgroundColor: 'var(--background)', fontSize: '11px'}}>
                    {(() => {
                      const compactPattern = compactPatternWithMatches(pattern, matches);
                      
                      const parts = compactPattern.split(/(<mark>.*?<\/mark>)/g);
                      return parts.map((part, index) => {
                        if (part.startsWith('<mark>') && part.endsWith('</mark>')) {
                          const content = part.slice(6, -7); // Remove <mark> e </mark>
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
                    {matches.map((match, matchIdx) => (
                      <div key={matchIdx} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs max-w-full"
                        style={{backgroundColor: 'var(--accent)', color: 'var(--background)'}}>
                        <span className="font-bold break-all" title={match.matched_text}>
                          {truncateText(match.matched_text, 50)}
                        </span>
                        {match.position && (
                          <span className="opacity-75 flex-shrink-0">
                            [{match.position.start}-{match.position.end}]
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
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
                      style={{backgroundColor: 'var(--accent)', color: 'white'}}>
                      {t}
                    </span>
                  )) : (
                    <span className="text-xs px-2 py-1 rounded font-mono"
                      style={{backgroundColor: 'var(--accent)', color: 'white'}}>
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
                    className="font-mono hover:underline break-all" 
                    style={{color: 'var(--primary-blue)'}}>
                    {ref}
                  </a>
                </div>
              )) : (
                <a href={reference} target="_blank" rel="noopener noreferrer" 
                  className="font-mono hover:underline break-all" 
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
      className={`border rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all ${className}`} 
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
