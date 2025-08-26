"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRateLimit } from "../../hooks/useRateLimit";
import SeverityLegend from "../components/SeverityLegend";
import AnalysisCard from "../components/AnalysisCard";
import SeverityBadge from "../components/SeverityBadge";
import IndicatorTable from "../components/IndicatorTable";
import ThemedButton from "../components/ThemedButton";
import LoadingSpinner from "../components/LoadingSpinner";
import AnalysisSkeleton from "../components/AnalysisSkeleton";
import InlineCaptcha from "../components/InlineCaptcha";
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
  const { 
    rateLimitInfo, 
    showCaptcha, 
    captchaSolution, 
    handleRateLimitResponse, 
    handleCaptchaSolved, 
    closeCaptcha,
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

  // Função de análise local como fallback
  const performLocalAnalysis = (command) => {
    
    // Análise básica local
    const localResult = {
      score: 0,
      severity: "safe",
      signatures: [],
      decoded: null,
      indicators: [],
      details: "Local analysis - API not accessible",
      tactics: [],
      techniques: []
    };
    
    // Detecções básicas locais
    if (command.toLowerCase().includes('webclient') || command.toLowerCase().includes('webrequest')) {
      localResult.signatures.push({
        name: "Web Client Detection",
        pattern: "webclient|webrequest",
        matched_text: "Web client pattern detected",
        severity: "high",
        score: 7.5,
        description: "Potential web client usage detected",
        tactics: ["Command and Control"],
        techniques: ["T1071.001"]
      });
      localResult.score += 7.5;
      localResult.severity = "high";
    }
    
    if (command.toLowerCase().includes('invoke-expression') || command.toLowerCase().includes('iex')) {
      localResult.signatures.push({
        name: "Dynamic Code Execution",
        pattern: "invoke-expression|iex",
        matched_text: "Dynamic execution pattern detected",
        severity: "medium",
        score: 5.0,
        description: "Dynamic code execution detected",
        tactics: ["Execution"],
        techniques: ["T1059.001"]
      });
      localResult.score += 5.0;
      localResult.severity = "medium";
    }
    
    if (command.toLowerCase().includes('base64') && command.length > 100) {
      localResult.signatures.push({
        name: "Long Base64 String",
        pattern: "base64.*long",
        matched_text: "Long encoded string detected",
        severity: "medium",
        score: 6.0,
        description: "Long base64 string detected",
        tactics: ["Defense Evasion"],
        techniques: ["T1027"]
      });
      localResult.score += 6.0;
      localResult.severity = "medium";
    }
    
    return localResult;
  };

  const performAnalysis = async (command, ipAddress, ipLocation) => {
    console.log('🚀 Iniciando análise para comando:', command);
    console.log('🚀 Timestamp da análise:', Date.now());
    console.log('🚀 Stack trace:', new Error().stack);
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
        ip_address: ipAddress,
        country: ipLocation?.country,
        city: ipLocation?.city,
        region: ipLocation?.region,
        timezone: ipLocation?.timezone,
        user_agent: navigator.userAgent,
        session_id: sessionId
      };

      // Incluir captcha se disponível
      if (captchaSolution) {
        requestData.captcha_token = captchaSolution.token;
        requestData.captcha_answer = captchaSolution.answer;
      }

      // Chamar a API Python via proxy local
      const analysisPromise = fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      }).then(response => {
        // Verificar se precisa de rate limiting ou captcha
        const needsHandling = handleRateLimitResponse(response, null);
        
        if (needsHandling && response.status === 400) {
          // Se precisa de captcha, retornar dados da resposta para processamento
          return response.json().then(data => {
            handleRateLimitResponse(response, data);
            throw new Error('Captcha obrigatório');
          });
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      }).catch(error => {
        if (error.message === 'Captcha obrigatório') {
          throw error; // Re-throw captcha error
        }
        console.error('API error:', error);
        // Fallback: análise local básica
        throw new Error('API não acessível. Use análise local temporariamente.');
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
        
        const analysisResult = {
          score: analysisData.risk_score,
          severity: analysisData.is_malicious ? "malicious" : "safe",
          signatures: (analysisData.signatures_detected || []).sort((a, b) => (b.total_score || 0) - (a.total_score || 0)),
          decoded: analysisData.decoded_command,
          indicators: analysisData.analysis_details?.indicators || [],
          details: analysisData.analysis_details?.recommendations?.join(", ") || "",
          tactics: analysisData.tactics || [],
          techniques: analysisData.techniques || []
        };
        
        setResult(analysisResult);
        
        // Salvar análise anônima em cookies se não estiver logado
        if (!user?.id) {
          try {
            console.log('💾 Salvando análise anônima da API:', command);
            saveAnonymousAnalysis({
              command: command,
              score: analysisData.risk_score,
              severity: analysisData.is_malicious ? "malicious" : "safe",
              signatures: analysisData.signatures_detected || [],
              cmdlets_detected: analysisData.cmdlets_detected || []
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
      
      // Se é erro de captcha obrigatório, não definir como erro - deixar o modal aparecer
      if (err.message === 'Captcha obrigatório') {
        setLoading(false);
        return; // Para por aqui e deixa o modal de captcha aparecer
      }
      
      setError(err.message);
      
              // Se a API falhou, usar análise local
        if (err.message.includes('API não acessível')) {
          console.log('🔄 Falling back to local analysis');
          const localResult = performLocalAnalysis(command);
          
          setError(""); // Limpar erro se análise local funcionar
          const localAnalysisResult = {
            score: localResult.score,
            severity: localResult.severity,
            signatures: localResult.signatures,
            decoded: localResult.decoded,
            indicators: localResult.indicators,
            details: localResult.details,
            tactics: localResult.tactics,
            techniques: localResult.techniques
          };
          
          setResult(localAnalysisResult);
          
          // Salvar análise local anônima em cookies se não estiver logado
          if (!user?.id) {
            try {
              console.log('💾 Salvando análise local anônima:', command);
              saveAnonymousAnalysis({
                command: command,
                score: localResult.score,
                severity: localResult.severity,
                signatures: localResult.signatures,
                cmdlets_detected: []
              });
              
              // Para análise local, criar uma sessão temporária
              const tempSessionId = `local_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              console.log('🔑 Criando sessão temporária para análise local:', tempSessionId);
              saveSessionFromBackend(tempSessionId);
            } catch (error) {
              console.error('Erro ao salvar análise local anônima:', error);
            }
          }
        } else {
        // Fallback para análise básica em caso de outros erros
        setResult({
          score: 0,
          severity: "unknown",
          signatures: [],
          decoded: null,
          indicators: ["Error: " + err.message],
          details: "Analysis failed, showing basic info"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Análise otimizada usando backend Python
  useEffect(() => {
    console.log('🔄 useEffect executado - params:', params.toString());
    console.log('🔄 useEffect executado - timestamp:', Date.now());
    console.log('🔄 Análise já executada?', analysisExecutedRef.current);
    
    const command = params.get("cmd") || "";
    const ipAddress = params.get("ip") || null;
    const country = params.get("country") || null;
    const city = params.get("city") || null;
    const region = params.get("region") || null;
    const timezone = params.get("timezone") || null;
    
    setCmd(command);
    
    if (command.trim() && !analysisExecutedRef.current) {
      console.log('📝 Comando encontrado, iniciando análise:', command);
      analysisExecutedRef.current = true; // Marcar como executada
      
      // Criar objeto de localização
      const ipLocation = {
        country,
        city,
        region,
        timezone
      };
      
      performAnalysis(command, ipAddress, ipLocation);
    } else if (command.trim()) {
      console.log('📝 Comando encontrado, mas análise já foi executada');
    } else {
      console.log('❌ Nenhum comando encontrado');
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
  }, []);
  
  // Calculate total risk score from result - soma de TUDO (sem remover duplicatas do total)
  const totalScore = result ? result.score : 0;
  
  // Handle new command analysis
  const handleNewAnalysis = () => {
    if (newCommand.trim()) {
      console.log('🔄 Nova análise solicitada, resetando flag de execução');
      analysisExecutedRef.current = false; // Resetar flag para permitir nova análise
      resetRateLimit(); // Limpar estado do rate limit
      
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('cmd', newCommand.trim());
      // Clear other parameters for new analysis
      currentUrl.searchParams.delete('ip');
      currentUrl.searchParams.delete('country');
      currentUrl.searchParams.delete('city');
      currentUrl.searchParams.delete('region');
      currentUrl.searchParams.delete('timezone');
      router.push(currentUrl.pathname + currentUrl.search);
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
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex-1 w-full">
            <input
              type="text"
              placeholder="Enter a new PowerShell command to analyze..."
              value={newCommand}
              onChange={(e) => setNewCommand(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleNewAnalysis()}
              className="w-full px-4 py-3 rounded-lg font-mono text-sm border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--foreground)',
                focusRingColor: 'var(--accent)'
              }}
            />
          </div>
          <button
            onClick={handleNewAnalysis}
            disabled={!newCommand.trim()}
            className="px-6 py-3 rounded-lg font-mono font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--background)'
            }}
          >
            Evaluate
          </button>
        </div>
        <div className="text-xs text-center mt-2" style={{color: 'var(--muted-foreground)'}}>
          Press Enter or click Evaluate to analyze a new command
        </div>
      </div>

             {/* Command Display */}
       <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8 p-3 sm:p-4" style={{backgroundColor: 'var(--muted)'}}>
         <div className="font-mono text-xs sm:text-sm mb-2" style={{color: 'var(--muted-foreground)'}}>Command evaluated:</div>
         <div className="flex items-start">
           <span className="font-mono text-sm sm:text-base break-all" style={{color: 'var(--foreground)'}}>
             {cmd}
           </span>
         </div>
       </div>

     
       {/* Severity Legend - Compact */}
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-4">
        <SeverityLegend />
      </div>
      {/* Cumulative Base Score Display */}
      {result && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div 
            className="p-6 sm:p-8 rounded-lg border-2 border-green-400 text-center"
            style={{backgroundColor: '#000000'}}
          >
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
            const url = window.location.href;
            navigator.clipboard.writeText(url);
          }}
        >
          Copy sharable link
        </ThemedButton>
      </div>

      {/* Captcha Inline */}
      {showCaptcha && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6">
          <InlineCaptcha
            onSolved={(solution) => {
              handleCaptchaSolved(solution);
              // Reexecutar análise com captcha resolvido
              const command = params.get("cmd") || "";
              const ipAddress = params.get("ip") || null;
              const country = params.get("country") || null;
              const city = params.get("city") || null;
              const region = params.get("region") || null;
              const timezone = params.get("timezone") || null;
              
              const ipLocation = { country, city, region, timezone };
              performAnalysis(command, ipAddress, ipLocation);
            }}
            onError={(error) => setError(error)}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
