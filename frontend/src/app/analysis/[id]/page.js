"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useAnalysisEvent } from "../../contexts/AnalysisEventContext";
import { useRateLimit } from "../../../hooks/useRateLimit";
import SeverityLegend from "../../components/SeverityLegend";
import AnalysisCard from "../../components/AnalysisCard";
import SeverityBadge from "../../components/SeverityBadge";
import IndicatorTable from "../../components/IndicatorTable";
import ThemedButton from "../../components/ThemedButton";
import LoadingSpinner from "../../components/LoadingSpinner";
import AnalysisSkeleton from "../../components/AnalysisSkeleton";
import CommandInput from "../../components/CommandInput";
import { ErrorMessage, InfoMessage } from "../../components/Messages";

import { saveAnonymousAnalysis } from "../../../utils/cookies";
import { getOrCreateSession, saveSessionFromBackend } from "../../../utils/session";

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

export default function AnalysisDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { notifyNewAnalysis } = useAnalysisEvent();
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



  // Função para carregar análise por ID
  const loadAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      // Log removido para melhorar performance

      // Usar a API do backend em vez da API do frontend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/analysis/${params.id}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const analysisData = await res.json();

      // Log removido para melhorar performance
      
      // Processar dados da análise (API do backend retorna {success: true, analysis: {...}})
      const analysis = analysisData.analysis || analysisData;
      const analysisResult = analysis.analysis_result || analysis;
      
      setCmd(analysis.command || analysisResult.command);
      
      const processedResult = {
        score: analysis.risk_score || analysisResult.risk_score || 0,
        severity: (analysis.risk_score || analysisResult.risk_score || 0) > 5 ? "malicious" : "safe",
        signatures: (analysis.signatures_detected || analysisResult.signatures_detected || []).sort((a, b) => (b.total_score || 0) - (a.total_score || 0)),
        decoded: analysis.decoded_command || analysisResult.decoded_command,
        indicators: analysisResult.analysis_details?.indicators || [],
        details: analysisResult.analysis_details?.recommendations?.join(", ") || "",
        tactics: analysis.tactics || analysisResult.tactics || [],
        techniques: analysis.techniques || analysisResult.techniques || [],
        analysisId: params.id // ID da análise para links compartilháveis
      };
      
      setResult(processedResult);
      
    } catch (err) {
      setError(err.message || "Failed to load analysis");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  // Carregar análise quando componente monta
  useEffect(() => {
    if (params.id) {
      loadAnalysis();
    }
  }, [params.id, loadAnalysis]);

  // Função para análise de novo comando (reutilizada da página original)
  const performAnalysis = async (command, ipAddress, ipLocation) => {
    
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
        user_id: user?.id || null,
        ip_address: ipAddress,
        country: ipLocation?.country,
        city: ipLocation?.city,
        region: ipLocation?.region,
        timezone: ipLocation?.timezone,
        user_agent: navigator.userAgent,
        search_type: "WEB",
        session_id: sessionId
      };
      
      // Chamar a API Python diretamente
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const analysisPromise = fetch(`${apiUrl}/analyze-pcre2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      }).then(async response => {
        const data = await response.json();
        console.log('📥 [ANALYSIS PAGE] Resposta da API:', data);
        
        // Verificar se precisa de rate limiting
        const needsHandling = handleRateLimitResponse(response, data);
        
        if (needsHandling) {
          console.log('⚠️ [ANALYSIS PAGE] Rate limit necessário');
          throw new Error('Rate limit excedido');
        }
        
        if (!response.ok) {
          console.log('❌ [ANALYSIS PAGE] Erro HTTP:', response.status, data);
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        return data;
      }).catch(error => {
        console.log('❌ [ANALYSIS PAGE] Erro na chamada da API:', error);
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
      
      console.log('✅ [ANALYSIS PAGE] Análise concluída com sucesso:', response);
      
      if (response.success) {
        const analysisData = response.analysis;
        console.log('📊 [ANALYSIS PAGE] Dados da análise:', analysisData);
        
        // Salvar session_id retornado pelo backend
        if (response.session_id && !user?.id) {
          console.log('💾 [ANALYSIS PAGE] Salvando session_id do backend:', response.session_id);
          saveSessionFromBackend(response.session_id);
        }
        
        // Salvar análise anônima em cookies se não estiver logado (ANTES do redirecionamento)
        if (!user?.id) {
          try {
            console.log('🍪 [ANALYSIS PAGE] Salvando análise anônima em cookies...');
            saveAnonymousAnalysis({
              command: command,
              score: analysisData.risk_score,
              severity: analysisData.is_malicious ? "malicious" : "safe",
              signatures: analysisData.signatures_detected || [],
              cmdlets_detected: analysisData.cmdlets_detected || [],
              analysis_id: response.analysis_id
            });
            console.log('✅ [ANALYSIS PAGE] Análise anônima salva em cookies');
          } catch (error) {
            console.log('❌ [ANALYSIS PAGE] Erro ao salvar análise anônima:', error);
          }
        }
        
        // Se temos um analysis_id, redirecionar para a página específica da análise
        if (response.analysis_id) {
          console.log('🔄 [ANALYSIS PAGE] Redirecionando para análise:', response.analysis_id);
          console.log('🔔 [ANALYSIS PAGE] Chamando notifyNewAnalysis...');
          
          // Notificar que uma nova análise foi feita ANTES do redirecionamento
          notifyNewAnalysis();
          
          console.log('⏳ [ANALYSIS PAGE] Aguardando 100ms antes do redirecionamento...');
          // Pequeno delay para garantir que o evento seja processado
          setTimeout(() => {
            console.log('🚀 [ANALYSIS PAGE] Executando redirecionamento...');
            router.push(`/analysis/${response.analysis_id}`);
          }, 100);
          return;
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
          analysisId: response.analysis_id
        };
        
        setResult(analysisResult);
        setCmd(command);
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (err) {
      console.log('❌ [ANALYSIS PAGE] Erro geral:', err);
      
      if (err.message === 'Rate limit excedido') {
        setLoading(false);
        return;
      }
      
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
      console.log('🏁 [ANALYSIS PAGE] performAnalysis finalizado');
    }
  };
  
  // Calculate total risk score from result
  const totalScore = result ? result.score : 0;
  
  // Handle new command analysis
  const handleNewAnalysis = async () => {
    console.log('🚀 [ANALYSIS PAGE] handleNewAnalysis chamado com comando:', newCommand.trim());
    
    if (newCommand.trim()) {
      // Verificar se já atingiu rate limit antes de prosseguir
      if (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit) {
        console.log('⚠️ [ANALYSIS PAGE] Rate limit atingido');
        setError("Rate limit atingido. Aguarde o timer ou resolva o captcha.");
        return;
      }
      
      console.log('✅ [ANALYSIS PAGE] Rate limit OK, prosseguindo com análise');
      analysisExecutedRef.current = false;
      
      // Limpar apenas o erro, mas manter o resultado atual para evitar flick
      setError("");
      
      console.log('🔄 [ANALYSIS PAGE] Chamando performAnalysis...');
      // Executar nova análise diretamente
      await performAnalysis(newCommand.trim(), null, {});
      
      // Limpar o campo de input apenas se a análise foi bem-sucedida
      setNewCommand("");
      console.log('✅ [ANALYSIS PAGE] handleNewAnalysis finalizado');
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

      {/* Quick Search Input */}
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="flex-1 w-full">
            <CommandInput
              value={newCommand}
              onChange={(e) => setNewCommand(e.target.value)}
              onSubmit={handleNewAnalysis}
              placeholder="Enter a new PowerShell command.."
              disabled={loading || (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit)}
            />
          </div>
          <button
            onClick={handleNewAnalysis}
            disabled={!newCommand.trim() || loading || (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit)}
            className="px-6 py-3 rounded-lg font-mono font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--background)'
            }}
          >
            {loading ? 'Analyzing...' : 'Evaluate'}
          </button>
        </div>
        <InfoMessage 
          message={!error && newCommand.trim() === "" ? "Examples: Get-Process | Where-Object CPU -gt 100 | Select Name, CPU" : ""}
        />
          </div>
          
      {/* Rate Limit Info - Design Melhorado (igual à página principal) */}
      {rateLimitInfo && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mt-4 mb-6 rounded-lg border-2" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
          <div className="p-4">
            {/* Header com informações do rate limit */}
            <div className="text-center mb-4">
              <div className="font-mono text-sm mb-2" style={{color: 'var(--muted-foreground)'}}>
                <strong>Notice:</strong> You have made <span style={{color: 'var(--accent)'}}>{rateLimitInfo.current_count}</span> of <span style={{color: 'var(--accent)'}}>{rateLimitInfo.limit}</span> allowed searches in {rateLimitInfo.window_seconds} seconds.
              </div>
        </div>

            {rateLimitInfo.current_count >= rateLimitInfo.limit && (
              <div>
                {/* Status de Rate Limit */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border-2 border-red-500" style={{backgroundColor: 'var(--background)'}}>
                    <span className="text-2xl">🚫</span>
                    <span className="font-mono font-bold text-red-500">Rate limit reached</span>
          </div>
        </div>

                {/* Timer Elegante */}
                {isTimerActive && timeLeft > 0 && (
                  <div className="text-center">
                    <div className="inline-block p-6 rounded-xl border-2" style={{backgroundColor: 'var(--background)', borderColor: 'var(--accent)'}}>
                      {/* Ícone do Timer */}
                      <div className="text-4xl mb-3">⏰</div>
                      
                      {/* Título */}
                      <div className="font-mono font-bold text-xl mb-3" style={{color: 'var(--accent)'}}>
                        Wait for reset
                </div>
                
                      {/* Contador Grande */}
                      <div className="font-mono text-3xl font-bold mb-4 px-4 py-2 rounded-lg border" style={{
                        color: 'var(--accent)', 
                        backgroundColor: 'var(--card-bg)',
                        borderColor: 'var(--border-color)'
                      }}>
                        {formatTime}
                      </div>
                      
                      {/* Descrição */}
                      <div className="font-mono text-sm max-w-xs mx-auto" style={{color: 'var(--muted-foreground)'}}>
                        You can make new searches when the timer reaches zero
                      </div>
                      
                      {/* Barra de progresso visual */}
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

             {/* Command Display */}
       <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8 p-3 sm:p-4" style={{backgroundColor: 'var(--muted)'}}>
         <div className="font-mono text-xs sm:text-sm mb-2" style={{color: 'var(--muted-foreground)'}}>Command evaluated:</div>
         <div className="flex items-start">
           <span className="font-mono text-sm sm:text-base break-all" style={{color: 'var(--foreground)'}}>
             {cmd}
                </span>
              </div>
            </div>

     
       {/* Cumulative Base Score Display */}
      {result && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div 
            className="p-4 sm:p-6 rounded-lg border-2 border-green-400 text-center relative"
            style={{backgroundColor: 'var(--muted)'}}
          >
            {/* Severity Legend no canto superior direito */}
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
                         {/* Mostrar breakdown do score se houver patterns */}
            {result.signatures && result.signatures.length > 0 && (
              <div className="text-xs font-mono text-gray-400 border-t border-gray-600 pt-3 mt-3">
                {(() => {
                  // Para o breakdown, mostrar TODOS os cmdlets (incluindo duplicados)
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
                                             {securityScore > 0 && <div>Security Patterns: {securityScore.toFixed(1)}</div>}
                      {allCmdletScore > 0 && <div>PowerShell Cmdlets: {allCmdletScore.toFixed(1)}</div>}
                    </>
                  );
                })()}
              </div>
            )}
            </div>
          </div>
        )}
             {/* Individual Patterns Details */}
       {result && result.signatures && result.signatures.length > 0 && (
         <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
           {/* Filtrar signatures reais (não cmdlets básicos) */}
          {(() => {
            const realSignatures = result.signatures.filter(sig => 
              !sig.name.includes('(') || // Não contém parênteses (não é cmdlet)
              sig.score >= 4.0 || // Score alto o suficiente
              !sig.techniques?.includes('T1059.001') || // Não é apenas execução básica
              sig.tactics?.length > 1 // Tem múltiplas táticas
            );
            
            // Extrair nomes de cmdlets que já aparecem nas signatures importantes
            const importantCmdletNames = realSignatures
              .filter(sig => sig.name.includes('('))
              .map(sig => {
                const match = sig.name.match(/\((.*?)\)$/);
                return match ? match[1] : null;
              })
              .filter(Boolean);
            
            // Para exibição, mostrar TODOS os cmdlets básicos (não filtrar duplicados)
            const basicCmdlets = result.signatures.filter(sig => 
              sig.name.includes('(') && // Contém parênteses (é cmdlet)
              sig.score < 4.0 && // Score baixo
              sig.techniques?.includes('T1059.001') && // Apenas execução básica
              sig.tactics?.length <= 1 // Só uma tática
              // Removido o filtro de duplicados - mostrar todos
            );

            return (
              <>
                                 {/* Indicator Regex importantes */}
                {realSignatures.length > 0 && (
          <div className="mb-6">
                                         <h2 className="text-lg sm:text-xl font-mono font-bold mb-4" style={{color: 'var(--foreground)'}}>
                       Indicator Regex
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

                                  {/* PowerShell Cmdlets básicos - cards compactos */}
                  {basicCmdlets.length > 0 && (
          <div className="mb-6">
                      <h3 className="text-base font-mono font-bold mb-3" style={{color: 'var(--muted-foreground)'}}>
                        PowerShell Cmdlets ({basicCmdlets.length})
                      </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {basicCmdlets.map((cmdlet, index) => (
                        <div 
                          key={`cmdlet-${index}`}
                          className="border rounded p-3 text-center"
                          style={{backgroundColor: 'var(--muted)', borderColor: 'var(--border-color)'}}
                        >
                          <div className="font-mono text-sm font-bold mb-1" style={{color: 'var(--foreground)'}}>
                            {cmdlet.name}
                          </div>
                          <div className="text-xs font-mono" style={{color: 'var(--muted-foreground)'}}>
                            Score: {cmdlet.total_score || cmdlet.score} • Basic PowerShell
                          </div>
                          {/* Mostrar informações de matches se houver múltiplos */}
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

      {/* No Indicators Message */}
      {result && (!result.signatures || result.signatures.length === 0) && totalScore === 0 && (
                 <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
           <div className="border rounded-lg p-6 text-center" style={{backgroundColor: 'var(--muted)', borderColor: 'var(--border-color)'}}>
             <h2 className="text-lg sm:text-xl font-mono font-bold mb-2" style={{color: 'var(--foreground)'}}>
               Zero indicators found
               </h2>
             <p className="text-sm sm:text-base font-mono" style={{color: 'var(--muted-foreground)'}}>
               This command does not seem to match any indicator.
             </p>
               </div>
             </div>
          )}

      {/* Disclaimer */}
      {result && result.signatures && result.signatures.length > 0 && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="border rounded-lg p-4" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--primary-purple)'}}>
            <div className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
              Matched indicators are not inherently suspicious but highlight traces that may require closer examination. For interpretation details, check the link below:
              <br /><br />
              <span style={{color: 'var(--primary-purple)'}}>&lt;wiki link to be provided later&gt;</span>
            </div>
          </div>
        </div>
      )}

      {/* Decoded Content */}
      {result && result.decoded && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8 border rounded-lg p-4" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
          <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
            Decoded Content
          </h2>
          <div className="font-mono text-sm break-all p-3 rounded" style={{backgroundColor: 'var(--muted)', color: 'var(--foreground)'}}>
            {result.decoded}
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8 border rounded-lg p-4 border-red-500" style={{backgroundColor: 'var(--card-bg)'}}>
          <h2 className="text-lg font-mono font-bold mb-3 text-red-500">
            Error
          </h2>
          <div className="font-mono text-sm text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Action Buttons */}
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
