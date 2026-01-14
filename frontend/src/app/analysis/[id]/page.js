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
import { EXAMPLE_ENCODED_COMMAND, EXAMPLE_COMMAND_DESCRIPTION } from "../../../constants/examples";

import { saveAnonymousAnalysis } from "../../../utils/cookies";
import { getOrCreateSession, saveSessionFromBackend } from "../../../utils/session";

// Score-based color system (5 bins from 1-10)
// 1.0-1.99: Informational (Blue), 2.0-4.99: Low (Green), 5.0-7.99: Medium (Yellow), 8.0-9.99: High (Orange), 10.0+: Critical (Red)
function getScoreColor(score) {
  if (score >= 10) return "border-red-600 text-red-600";           // Critical: 10.0+
  if (score >= 8) return "border-orange-400 text-orange-400";      // High: 8.0-9.99
  if (score >= 5) return "border-yellow-400 text-yellow-400";      // Medium: 5.0-7.99
  if (score >= 2) return "border-green-400 text-green-400";        // Low: 2.0-4.99
  return "border-blue-400 text-blue-400";                          // Informational: 1.0-1.99
}

function getScoreLabel(score) {
  if (score >= 10) return "CRITICAL";    // 10.0+
  if (score >= 8) return "HIGH";         // 8.0-9.99
  if (score >= 5) return "MEDIUM";       // 5.0-7.99
  if (score >= 2) return "LOW";          // 2.0-4.99
  return "INFORMATIONAL";                // 1.0-1.99
}

// ✅ Componente para conteúdo protegido - FIXED with return statement
const ProtectedCodeBlock = ({ code, borderColorClass = "border-gray-500/20", limitReached = false, decodeInfo = null }) => {
  // ✅ DEBUG: Log para verificar o que está chegando
  console.log("🔍 [ProtectedCodeBlock] Received:", {
    code: code?.substring(0, 50) + "...",
    codeLength: code?.length,
    isProtected: code === "[PREMIUM_PROTECTED_CONTENT]",
    limitReached,
    decodeInfo
  });

  const isProtected = code === "[PREMIUM_PROTECTED_CONTENT]";

  if (isProtected) {
    console.log("🚫 [ProtectedCodeBlock] Showing LOCK SCREEN");

    // ✅ Calculate minutes until reset
    const minutesUntilReset = decodeInfo?.seconds_until_reset
      ? Math.ceil(decodeInfo.seconds_until_reset / 60)
      : 0;

    return (
      <div className={`bg-black rounded-lg p-3 border ${borderColorClass} relative overflow-hidden min-h-[140px]`}>
        <div className="absolute inset-0 blur-md select-none opacity-40 pointer-events-none font-mono text-xs leading-relaxed z-0" aria-hidden="true">
          {`# Decode limit reached
$payload = [System.Convert]::FromBase64String("SGVsbG8gV29ybGQ=")
IEX([System.Text.Encoding]::Unicode.GetString($payload))
# Wait for reset to decode more commands
# ...`}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/60 backdrop-blur-xl backdrop-saturate-150 border border-green-500/20 rounded-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-lg"></div>

          <div className="relative rounded-xl p-6 flex flex-col items-center gap-3 shadow-2xl">

            <span className="font-mono font-bold text-green-400 text-lg tracking-wide drop-shadow-lg text-center" style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.6))' }}>
              Decode Limit Reached
            </span>
            <span className="text-sm text-gray-300 text-center leading-relaxed font-mono px-4">
              Your {decodeInfo?.limit || 5} decodes/minute limit was reached and it will reset in the next cycle.
            </span>
            <span className="text-xs text-gray-400 text-center font-mono mt-2">
              Upgrade to Premium for unlimited decodes
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ✅ CRITICAL: Show actual content when not protected
  console.log("✅ [ProtectedCodeBlock] Showing ACTUAL CONTENT");
  return (
    <div className={`bg-black rounded p-3 border ${borderColorClass} text-xs sm:text-sm font-mono overflow-x-auto max-h-40 whitespace-pre-wrap break-words`} style={{ color: 'var(--foreground)' }}>
      <code>{code}</code>
    </div>
  );
};

const DecodeUsageBadge = ({ decodeInfo }) => {
  console.log('🔍 [DecodeUsageBadge - ID] Received decodeInfo:', decodeInfo);

  if (!decodeInfo) {
    console.log('🔍 [DecodeUsageBadge - ID] No decodeInfo provided');
    return null;
  }

  console.log("🔍 [DecodeUsageBadge] decodeInfo:", decodeInfo);
  console.log("🔍 [DecodeUsageBadge] limit:", decodeInfo.limit, "Type:", typeof decodeInfo.limit);
  console.log("🔍 [DecodeUsageBadge] isUnlimited check:", decodeInfo.limit === null);

  // ✅ Check if this is an example command (is_example flag from backend)
  console.log('🔍 [DecodeUsageBadge - ID] is_example flag:', decodeInfo.is_example);

  if (decodeInfo.is_example) {
    console.log('✅ [DecodeUsageBadge - ID] SHOWING EXAMPLE BADGE');
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-blue-400 border-blue-500/30 bg-blue-500/10 mb-4">
        <span className="text-xs font-mono font-bold">
          Free decoded command included (Example payload)
        </span>
      </div>
    );
  }

  const isUnlimited = decodeInfo.limit === null || decodeInfo.limit === -1 || decodeInfo.limit === Infinity || decodeInfo.limit > 1000;
  const current = decodeInfo.current_usage || 0;
  const limit = decodeInfo.limit || 5;
  const remaining = Math.max(0, limit - current);

  if (isUnlimited) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 mb-4">
        <span className="text-xs font-mono font-bold text-purple-400">Premium: Unlimited Decodes</span>
      </div>
    );
  }

  // Calculate color based on usage
  let colorClass = "text-green-400 border-green-500/30 bg-green-500/10";
  if (remaining === 0) colorClass = "text-red-400 border-red-500/30 bg-red-500/10";
  else if (remaining <= 2) colorClass = "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${colorClass} mb-4`}>
      <span className="text-xs font-mono font-bold">
        Decode {Math.min(current, limit)} of {limit} ({remaining} remaining)
      </span>
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
  const [decodeInfo, setDecodeInfo] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
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

      // ✅ FIX: Get session_id to send in headers
      const sessionId = getOrCreateSession();

      const { makeAuthenticatedRequest } = await import('../../../lib/api');
      const res = await makeAuthenticatedRequest(`/analysis/${params.id}`, {
        headers: {
          ...(isCacheRedirect ? {
            'Cache-Control': 'max-age=300',
            'X-Cache-Redirect': 'true'
          } : {}),
          // ✅ FIX: Always send session_id for anonymous users
          'X-Session-ID': sessionId
        }
      });

      const analysisData = await res.json();

      // ✅ FIX: Handle 429 Rate Limit explicitly for loadAnalysis
      if (res.status === 429) {
        // ✅ Extract error message from object structure
        let errorMessage = "Rate limit exceeded. Please try again later.";
        if (analysisData.error) {
          if (typeof analysisData.error === 'string') {
            errorMessage = analysisData.error;
          } else if (analysisData.error.message) {
            errorMessage = analysisData.error.message;
          } else if (analysisData.error.details) {
            errorMessage = analysisData.error.details;
          }
        } else if (analysisData.message) {
          errorMessage = analysisData.message;
        }
        setError(errorMessage);
        setLoading(false);
        setContentReady(true);
        return;
      }

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

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

      // ✅ DEBUG: Log para ver o que foi processado
      console.log(" [ANALYSIS LOADED]", {
        hasDecoded: !!processedResult.decoded,
        hasDoubleDecoded: !!processedResult.doubleDecoded,
        hasDeobfuscated: !!processedResult.deobfuscated,
        decodeLimitReached: processedResult.decodeLimitReached,
        decodedPreview: processedResult.decoded?.substring(0, 50)
      });

      setResult(processedResult);
      setDecodeInfo(analysisData.decode_info);

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

      console.log('🔍 [RATE LIMIT DEBUG - ID] Making request to /evaluate...');
      const response = await makeAuthenticatedRequest('/evaluate', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      console.log('🔍 [RATE LIMIT DEBUG - ID] Response status:', response.status);
      const data = await response.json();
      console.log('🔍 [RATE LIMIT DEBUG - ID] Response data:', data);

      const responseTime = performance.now() - startTime;

      // ✅ FIX: Handle 429 Rate Limit explicitly
      if (response.status === 429) {
        console.log('🚫 [RATE LIMIT DEBUG - ID] 429 detected - setting error and stopping loading');
        // ✅ Extract error message from object structure
        let errorMessage = "Rate limit exceeded. Please try again later.";
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error.message) {
            errorMessage = data.error.message;
          } else if (data.error.details) {
            errorMessage = data.error.details;
          }
        } else if (data.message) {
          errorMessage = data.message;
        }
        setError(errorMessage);
        setNewAnalysisLoading(false);
        setContentReady(true);
        console.log('🚫 [RATE LIMIT DEBUG - ID] State updated - error:', errorMessage, 'loading:', false, 'contentReady:', true);
        return;
      }

      const isCacheHit = data.from_cache === true || data.analysis?.cache_info?.cache_hit === true;

      if (isCacheHit) {
        setCacheHit(true);
      }

      const needsHandling = handleRateLimitResponse(response, data);
      console.log('🔍 [RATE LIMIT DEBUG - ID] handleRateLimitResponse returned:', needsHandling);

      if (needsHandling) {
        console.log('🚫 [RATE LIMIT DEBUG - ID] Rate limit needs handling - setting error and stopping loading');
        // ✅ Don't redirect - just stop loading and show rate limit UI
        // ✅ Extract proper error message
        let errorMessage = "Rate limit reached. Please wait for the timer to reset.";
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error.message) {
            errorMessage = data.error.message;
          } else if (data.error.details) {
            errorMessage = data.error.details;
          }
        }
        setError(errorMessage);
        setNewAnalysisLoading(false);
        setContentReady(true);
        console.log('🚫 [RATE LIMIT DEBUG - ID] State updated after handleRateLimitResponse');
        return; // ✅ Exit early without redirecting
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
        setDecodeInfo(data.decode_info);
        setCmd(command);
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('[ANALYSIS ERROR]', err);
      console.log('❌ [RATE LIMIT DEBUG - ID] Error caught:', err.message);
      setError(err.message);
      setResult(null);
      setContentReady(true);
    } finally {
      console.log('🏁 [RATE LIMIT DEBUG - ID] Finally block - setting loading to false');
      setNewAnalysisLoading(false);
      console.log('🏁 [RATE LIMIT DEBUG - ID] Loading state set to false');
    }
  };

  const handleNewAnalysis = async () => {
    // ✅ FIX: Enviar comando raw sem validação de trim
    if (newCommand.length > 0) {
      // ✅ CRITICAL: Check rate limit BEFORE starting loading or making request
      if (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit) {
        console.log('🚫 [RATE LIMIT DEBUG - ID] Rate limit already reached - NOT starting loading');
        // ✅ Extract proper error message from rate_limit_info if available
        let errorMessage = "Rate limit reached. Please wait for the timer to reset.";
        if (rateLimitInfo.seconds_until_reset) {
          const minutes = Math.ceil(rateLimitInfo.seconds_until_reset / 60);
          errorMessage = `You have made ${rateLimitInfo.current_count} searches in this session. Please wait ${minutes} minutes before trying again.`;
        }
        setError(errorMessage);
        setContentReady(true); // ✅ Show content (rate limit UI)
        return; // ✅ EXIT - don't proceed with analysis
      }

      // ✅ Clear state immediately to prevent flicker
      analysisExecutedRef.current = false;
      setError("");
      setResult(null);  // ✅ Clear old results immediately
      setDecodeInfo(null);  // ✅ Clear decode info
      setContentReady(false);  // ✅ Hide content
      setLoading(true);  // ✅ Show loading state

      // ✅ FIX: Enviar comando raw sem trim ou validação
      await performAnalysis(newCommand);

      setNewCommand("");
    }
  };

  const totalScore = result ? result.score : 0;

  // ✅ Don't show full page loading spinner - content should always be visible
  // if (loading) {
  //   return <LoadingSpinner />;
  // }

  if (!contentReady && loading) {
    return <LoadingSpinner />; // Only show on initial page load
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
        <div className="flex flex-col sm:flex-row gap-3 items-center">
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



        <ErrorMessage message={error} />

        <InfoMessage
          className="max-w-[760px]"
          message={!error && newCommand.length === 0 ? EXAMPLE_COMMAND_DESCRIPTION : ""}
          clickable={!error && newCommand.length === 0}
          onClick={() => setNewCommand(EXAMPLE_ENCODED_COMMAND)}
        />
      </div>

      {rateLimitInfo && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mt-4 mb-6 rounded-lg border-2 bg-black/80 border-green-500/30">
          <div className="p-4">
            <div className="text-center mb-4">
              <div className="font-mono text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>
                <strong>Notice:</strong> You have made <span style={{ color: 'var(--accent)' }}>{rateLimitInfo.current_count}</span> of <span style={{ color: 'var(--accent)' }}>{rateLimitInfo.limit}</span> allowed searches in 1 hour.
              </div>
            </div>

            {rateLimitInfo.current_count >= rateLimitInfo.limit && (
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border-2 border-red-500 bg-black/80 border-green-500/30">
                    <span className="font-mono font-bold text-red-500">Rate limit reached</span>
                  </div>
                </div>

                {isTimerActive && timeLeft > 0 && (
                  <div className="text-center">
                    <div className="inline-block p-6 rounded-xl border-2 bg-black/80 border-green-500/30">

                      <div className="font-mono font-bold text-xl mb-3" style={{ color: 'var(--accent)' }}>
                        Wait for reset: {Math.ceil(timeLeft / 60)} minutes
                      </div>

                      <div className="font-mono text-sm max-w-xs mx-auto" style={{ color: 'var(--muted-foreground)' }}>
                        You can make new searches when the timer reaches zero
                      </div>

                      <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-1000"
                          style={{
                            backgroundColor: 'var(--accent)',
                            width: `${Math.max(0, (timeLeft / 3600) * 100)}%`
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
              {totalScore === 0 ? "No Malicious Indicators Detected" : "Based on all matching indicators"}
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



      {result && result.deobfuscated && hasObfuscationIndicator && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="border rounded-lg p-4 bg-black/80 border-purple-500/30">
            <div className="flex justify-between items-center mb-3">
              <div className="font-mono text-sm font-bold" style={{ color: 'var(--accent)' }}>
                Deobfuscated Command
              </div>
              <DecodeUsageBadge decodeInfo={decodeInfo} />
            </div>
            <ProtectedCodeBlock code={result.deobfuscated} borderColorClass="border-purple-500/20" limitReached={result.decodeLimitReached} decodeInfo={decodeInfo} />
            <div className="text-xs font-mono mt-2" style={{ color: 'var(--muted-foreground)' }}>
              Format string obfuscation was removed (e.g., &#123;&quot;&#123;1&#125;&#123;0&#125;&quot; -f &apos;EX&apos;,&apos;I&apos;&#125; → &apos;IEX&apos;)
            </div>
          </div>
        </div>
      )}


      {result && result.decoded && result.doubleDecoded && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="border rounded-lg p-4 bg-black/80 border-blue-500/30">
            <div className="flex justify-between items-center mb-3">
              <div className="font-mono text-sm font-bold" style={{ color: 'var(--accent)' }}>
                First Decoded Layer (Iteration 1)
              </div>
              <DecodeUsageBadge decodeInfo={decodeInfo} />
            </div>
            <ProtectedCodeBlock code={result.decoded} borderColorClass="border-blue-500/20" limitReached={result.decodeLimitReached} decodeInfo={decodeInfo} />
            <div className="text-xs font-mono mt-2" style={{ color: 'var(--muted-foreground)' }}>
              First layer of decoding - still contains -EncodedCommand
            </div>
          </div>
        </div>
      )}


      {result && result.decoded && !result.doubleDecoded && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="border rounded-lg p-4 bg-black/80 border-blue-500/30">
            <div className="flex justify-between items-center mb-3">
              <div className="font-mono text-sm font-bold text-blue-400">
                Decoded Command
              </div>
              <DecodeUsageBadge decodeInfo={decodeInfo} />
            </div>
            <ProtectedCodeBlock code={result.decoded} borderColorClass="border-blue-500/20" limitReached={result.decodeLimitReached} decodeInfo={decodeInfo} />
            <div className="text-xs font-mono mt-2" style={{ color: 'var(--muted-foreground)' }}>
              This is the decoded version from -EncodedCommand
            </div>
          </div>
        </div>
      )}


      {result && result.doubleDecoded && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="border rounded-lg p-4 bg-black/80 border-yellow-500/30">
            <div className="flex justify-between items-center mb-3">
              <div className="font-mono text-sm font-bold" style={{ color: 'var(--accent)' }}>
                Final Decoded Command (Iteration 2)
              </div>
              <DecodeUsageBadge decodeInfo={decodeInfo} />
            </div>
            <ProtectedCodeBlock code={result.doubleDecoded} borderColorClass="border-yellow-500/20" limitReached={result.decodeLimitReached} decodeInfo={decodeInfo} />
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
                          indicatorType={signature.indicator_type} // ✅ Passar indicatorType
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
          <div className="border rounded-lg p-4 bg-black/80 border-blue-500/30">
            <div className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Matched indicators do not automatically imply malicious activity; they surface behavioral patterns that warrant contextual analysis and further investigation.
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
          onClick={async () => {
            const baseUrl = window.location.origin;
            const shareUrl = result?.analysisId
              ? `${baseUrl}/analysis/${result.analysisId}`
              : window.location.href;
            try {
              await navigator.clipboard.writeText(shareUrl);
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 3000);
            } catch (err) {
              console.error('Failed to copy to clipboard:', err);
            }
          }}
          style={linkCopied ? {
            backgroundColor: 'var(--success)',
            color: 'var(--success-foreground)',
            borderColor: 'var(--success)'
          } : {}}
        >
          {linkCopied ? 'Copied!' : 'Copy Results Link'}
        </ThemedButton>
      </div>

      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-8">
        <div className="font-mono text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
          <p className="mb-4">
            The overall <a href="/scoring" className="underline hover:opacity-80" style={{ color: 'var(--accent)' }}>score</a> represents the aggregated base <a href="/scoring" className="underline hover:opacity-80" style={{ color: 'var(--accent)' }}>scores</a> of all uniquely matched indicators. Upcoming premium features will introduce advanced analytics and enhanced <a href="/scoring" className="underline hover:opacity-80" style={{ color: 'var(--accent)' }}>scoring</a> capabilities.
          </p>
          <p>
            We also offer deployment and advisory services for Splunk customers seeking to implement a PowerShell detection model integrated with Splunk Enterprise Security. Please contact us for further information.
          </p>
        </div>
      </div>
    </div>
  );
}
