"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useRateLimit } from "../../../hooks/useRateLimit";
import { getAnalysisById } from "../../../../lib/supabase";
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

  // Debug: monitorar mudanças no rate limit (apenas em desenvolvimento)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Rate limit:', { active: isTimerActive, timeLeft, count: rateLimitInfo?.current_count });
    }
  }, [rateLimitInfo, isTimerActive, timeLeft]);

  // Função para carregar análise por ID
  const loadAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log('🔍 Carregando análise por ID:', params.id);
      const analysisData = await getAnalysisById(params.id);
      console.log('📥 Dados da análise carregados:', analysisData);
      
      // Processar dados da análise
      const analysisResult = analysisData.analysis_result || analysisData;
      
      setCmd(analysisData.command || analysisResult.command);
      
      const processedResult = {
        score: analysisData.risk_score || analysisResult.risk_score || 0,
        severity: (analysisData.risk_score || analysisResult.risk_score || 0) > 5 ? "malicious" : "safe",
        signatures: (analysisData.signatures_detected || analysisResult.signatures_detected || []).sort((a, b) => (b.total_score || 0) - (a.total_score || 0)),
        decoded: analysisData.decoded_command || analysisResult.decoded_command,
        indicators: analysisResult.analysis_details?.indicators || [],
        details: analysisResult.analysis_details?.recommendations?.join(", ") || "",
        tactics: analysisData.tactics || analysisResult.tactics || [],
        techniques: analysisData.techniques || analysisResult.techniques || [],
        analysisId: params.id // ID da análise para links compartilháveis
      };
      
      setResult(processedResult);
      
    } catch (err) {
      console.error('❌ Erro ao carregar análise:', err);
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
    console.log('🚀 Iniciando análise para comando:', command);
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

      console.log('📤 Enviando dados para API:', requestData);

      // Chamar a API Python diretamente
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const analysisPromise = fetch(`${apiUrl}/analyze-pcre2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      }).then(async response => {
        const data = await response.json();
        console.log('📥 Resposta da API:', { status: response.status, data });
        
        // Verificar se precisa de rate limiting
        const needsHandling = handleRateLimitResponse(response, data);
        
        if (needsHandling) {
          console.log('🚫 Rate limit detectado, parando análise');
          throw new Error('Rate limit excedido');
        }
        
        if (!response.ok) {
          console.error('❌ Erro HTTP da API:', response.status, data);
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        return data;
      }).catch(error => {
        console.error('❌ Erro na chamada da API:', error);
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
          console.log('🔑 Salvando session_id do backend:', response.session_id);
          saveSessionFromBackend(response.session_id);
        }
        
        // Se temos um analysis_id, redirecionar para a página específica da análise
        if (response.analysis_id) {
          console.log('🔗 Redirecionando para análise específica:', response.analysis_id);
          router.push(`/analysis/${response.analysis_id}`);
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
        
        // Salvar análise anônima em cookies se não estiver logado
        if (!user?.id) {
          try {
            console.log('💾 Salvando análise anônima da API:', command);
            saveAnonymousAnalysis({
              command: command,
              score: analysisData.risk_score,
              severity: analysisData.is_malicious ? "malicious" : "safe",
              signatures: analysisData.signatures_detected || [],
              cmdlets_detected: analysisData.cmdlets_detected || [],
              analysis_id: response.analysis_id
            });
          } catch (error) {
            console.error('Erro ao salvar análise anônima:', error);
          }
        }
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      
      if (err.message === 'Rate limit excedido') {
        setLoading(false);
        return;
      }
      
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate total risk score from result
  const totalScore = result ? result.score : 0;
  
  // Handle new command analysis
  const handleNewAnalysis = async () => {
    if (newCommand.trim()) {
      console.log('🔄 Nova análise solicitada:', newCommand.trim());
      
      // Verificar se já atingiu rate limit antes de prosseguir
      if (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit) {
        console.log('🚫 Rate limit atingido, não permitindo nova análise');
        setError("Rate limit atingido. Aguarde o timer ou resolva o captcha.");
        return;
      }
      
      analysisExecutedRef.current = false;
      
      // Limpar estado atual
      setResult(null);
      setError("");
      setCmd(newCommand.trim());
      
      // Executar nova análise diretamente
      await performAnalysis(newCommand.trim(), null, {});
      
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

      {/* Quick Search Input */}
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="flex-1 w-full">
            <CommandInput
              value={newCommand}
              onChange={(e) => setNewCommand(e.target.value)}
              onSubmit={handleNewAnalysis}
              placeholder="Enter a new PowerShell command to analyze..."
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
        <div className="text-xs text-center mt-2" style={{color: 'var(--muted-foreground)'}}>
          Press Enter or click Evaluate to analyze a new command • Shift+Enter for new lines
        </div>
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
            className="p-6 sm:p-8 rounded-lg border-2 border-green-400 text-center relative"
            style={{backgroundColor: '#000000'}}
          >
            {/* Severity Legend no canto superior direito */}
            <div className="absolute top-4 right-4">
              <SeverityLegend />
            </div>
            
            <div className="text-xl sm:text-2xl font-mono font-bold mb-4 text-green-400">
              Cumulative Base Score
            </div>
            <div className="text-5xl sm:text-6xl font-mono font-bold mb-4 text-white">
              {totalScore.toFixed(1)}
            </div>
                         <div className="text-sm sm:text-base font-mono text-green-400 mb-2">
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
                                 {/* Detected Patterns importantes */}
                {realSignatures.length > 0 && (
                  <div className="mb-6">
                                         <h2 className="text-lg sm:text-xl font-mono font-bold mb-4" style={{color: 'var(--foreground)'}}>
                       Detected Patterns
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
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 text-center">
            <h2 className="text-lg sm:text-xl font-mono font-bold mb-2 text-green-400">
              No Malicious Patterns Detected
            </h2>
            <p className="text-sm sm:text-base font-mono" style={{color: 'var(--muted-foreground)'}}>
              This command appears to be safe based on our signature database.
            </p>
          </div>
        </div>
      )}

      {/* Further Notes */}
      {result && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="border rounded-lg p-4" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--primary-purple)'}}>
                         <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--primary-purple)'}}>
               Evaluation Notes
             </h2>
                         <div className="font-mono text-sm space-y-3" style={{color: 'var(--muted-foreground)'}}>
               {result.details && (
                 <div className="p-3 rounded bg-gray-800">
                   <strong>Analysis Summary:</strong> {result.details}
                 </div>
               )}
               
                               {/* Risk Assessment */}
                {totalScore > 0 && (
                  <div className="flex items-start gap-2">
                    <span style={{color: 'var(--accent)'}}>•</span>
                    <span><strong>Risk Level:</strong> {totalScore >= 10 ? 'CRITICAL' : totalScore >= 8 ? 'HIGH' : totalScore >= 5 ? 'MEDIUM' : totalScore >= 2 ? 'LOW' : 'INFORMATIONAL'} ({totalScore.toFixed(1)}/10)</span>
                  </div>
                )}
               
                               {/* Detection Patterns */}
                {result.signatures && result.signatures.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span style={{color: 'var(--accent)'}}>•</span>
                    <span><strong>Detected Patterns:</strong> {result.signatures.length} signature{result.signatures.length !== 1 ? 's' : ''} identified using MITRE ATT&CK framework</span>
                  </div>
                )}
               
               {/* Suspicious Activity Warning */}
               {result.signatures && result.signatures.length > 0 && (
                 <div className="flex items-start gap-2">
                   <span style={{color: 'var(--accent)'}}>•</span>
                   <span><strong>Activity Assessment:</strong> This command shows potentially suspicious behavior patterns that require careful review and context analysis</span>
                 </div>
               )}
               
               {/* MITRE ATT&CK Coverage */}
               {result.tactics && result.tactics.length > 0 && (
                 <div className="flex items-start gap-2">
                   <span style={{color: 'var(--accent)'}}>•</span>
                   <span><strong>MITRE ATT&CK Coverage:</strong> {result.tactics.length} tactic{result.tactics.length !== 1 ? 's' : ''} and {result.techniques ? result.techniques.length : 0} technique{result.techniques && result.techniques.length !== 1 ? 's' : ''} identified</span>
                 </div>
               )}
               
               {/* PowerShell Specific Analysis */}
               {result.signatures && result.signatures.some(sig => sig.name.includes('(')) && (
                 <div className="flex items-start gap-2">
                   <span style={{color: 'var(--accent)'}}>•</span>
                   <span><strong>PowerShell Analysis:</strong> Command contains PowerShell cmdlets that were evaluated for security implications and execution context</span>
                 </div>
               )}
               
               {/* Decoded Content Note */}
               {result.decoded && result.decoded !== result.cmd && (
                 <div className="flex items-start gap-2">
                   <span style={{color: 'var(--accent)'}}>•</span>
                   <span><strong>Content Decoding:</strong> Command was successfully decoded, revealing underlying execution patterns and obfuscation techniques</span>
                 </div>
               )}
               
               {/* No Threats Detected */}
               {result.signatures && result.signatures.length === 0 && totalScore === 0 && (
                 <div className="flex items-start gap-2">
                   <span style={{color: 'var(--accent)'}}>•</span>
                   <span><strong>Security Status:</strong> No malicious patterns detected. Command appears safe based on current threat intelligence</span>
                 </div>
               )}
               
                               {/* Evaluation Methodology */}
                <div className="flex items-start gap-2">
                  <span style={{color: 'var(--accent)'}}>•</span>
                  <span><strong>Evaluation Method:</strong> Multi-layered pattern recognition combining signature-based detection, behavioral analysis, and threat intelligence correlation</span>
                </div>
               
               {/* Confidence Level */}
               <div className="flex items-start gap-2">
                 <span style={{color: 'var(--accent)'}}>•</span>
                 <span><strong>Confidence Level:</strong> {result.signatures && result.signatures.length > 0 ? 'High - Multiple detection patterns confirmed' : 'High - Comprehensive analysis completed'}</span>
               </div>
               
               {/* Recommendations */}
               {totalScore > 0 && (
                 <div className="flex items-start gap-2">
                   <span style={{color: 'var(--accent)'}}>•</span>
                   <span><strong>Recommendations:</strong> Review command execution context, monitor system behavior, and consider additional security controls if score exceeds 6.0</span>
                 </div>
               )}
               
                               {/* Footer */}
                <div className="text-xs pt-3 border-t border-gray-600">
                  Evaluation performed using advanced PowerShell command pattern recognition, behavioral analysis, and real-time threat intelligence correlation
                </div>
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