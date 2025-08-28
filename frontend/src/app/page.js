"use client"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./contexts/AuthContext";
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
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Debug: monitorar mudanças no rate limit
  useEffect(() => {
    console.log('🏠 HOME - Rate limit info mudou:', rateLimitInfo);
    console.log('🏠 HOME - Timer ativo:', isTimerActive);
    console.log('🏠 HOME - Tempo restante:', timeLeft);
  }, [rateLimitInfo, isTimerActive, timeLeft]);

  // Debug logs reduzidos para melhor performance
  if (process.env.NODE_ENV === 'development') {
    console.log('🏠 HOME PAGE: Componente renderizado');
  }

  // Debug logs para IP e localização (apenas em desenvolvimento)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 IP Address & Location:', { ipAddress, country: ipLocation?.country, loading: ipLoading });
    }
  }, [ipAddress, ipLocation, ipLoading, ipError]);

  // Verificar autenticação - REMOVIDO para permitir acesso de usuários não logados
  // useEffect(() => {
  //   if (!isAuthenticated()) {
  //     router.push('/landing');
  //   }
  // }, [isAuthenticated, router]);

  // Log de mudanças de autenticação (apenas em desenvolvimento)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 HOME PAGE: Auth change -', { authenticated: isAuthenticated(), userId: user?.id });
    }
  }, [isAuthenticated, user, ipLoading]);



  // Função para validar se o input é um comando PowerShell válido
  const validatePowerShellCommand = (input) => {
    if (!input || typeof input !== 'string') {
      return { isValid: false, error: "Command cannot be empty." };
    }

    const trimmedInput = input.trim();
    if (trimmedInput.length === 0) {
      return { isValid: false, error: "Command cannot be empty." };
    }

    // Remove comentários do PowerShell
    const cleanInput = trimmedInput.replace(/#.*$/gm, '').trim();
    if (cleanInput.length === 0) {
      return { isValid: false, error: "Command cannot contain only comments." };
    }

    // Simplified validation - allow any non-empty input for testing
    // The backend will handle the actual analysis
    return { isValid: true, error: null };
  };

  // Command analysis - apenas redirecionar para página de análise
  const handleAnalyze = async (e) => {
    e.preventDefault();
    
    const validation = validatePowerShellCommand(command);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }
    
    setError(""); // Clear previous error
    
    console.log('🚀 Redirecting to analysis page:');
    console.log('- Command:', command);
    console.log('- IP Address:', ipAddress);
    console.log('- IP Location:', ipLocation);
    
    // Redirecionar para página de análise com parâmetros
    const analysisUrl = `/analysis?cmd=${encodeURIComponent(command.trim())}`;
    let finalUrl = analysisUrl;
    
    if (ipAddress) {
      finalUrl += `&ip=${encodeURIComponent(ipAddress)}`;
      
      // Adicionar informações de localização se disponíveis
      if (ipLocation && ipLocation.country) {
        finalUrl += `&country=${encodeURIComponent(ipLocation.country)}`;
        if (ipLocation.city) finalUrl += `&city=${encodeURIComponent(ipLocation.city)}`;
        if (ipLocation.region) finalUrl += `&region=${encodeURIComponent(ipLocation.region)}`;
        if (ipLocation.timezone) finalUrl += `&timezone=${encodeURIComponent(ipLocation.timezone)}`;
      }
    }
    
    console.log('📍 Redirecting to:', finalUrl);
    resetRateLimit(); // Limpar estado do rate limit
    router.push(finalUrl);
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
    <div className="flex h-full">
      {/* Chat lateral - sempre visível para todos os usuários */}
      <div className="flex-shrink-0">
        <AnalysisChat />
      </div>
      
      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-6 sm:mb-8 text-center px-2" style={{color: 'var(--accent)'}}>
          powershell.exposed
        </h1>
        
        <form onSubmit={handleAnalyze} className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="flex-1">
              <CommandInput
                value={command}
                onChange={handleCommandChange}
                onSubmit={() => handleAnalyze({ preventDefault: () => {} })}
                placeholder="Type a PowerShell command (e.g., Get-Process, ls | sort, Start-Service -Name...) • Press Enter to analyze"
                error={error}
              />
            </div>
            
            <div className="flex-shrink-0">
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
                  'Analyze'
                )}
              </ThemedButton>
            </div>
          </div>
          
          <ErrorMessage message={error} />
          
          {/* Rate Limit Info - Design Melhorado */}
          {rateLimitInfo && (
            <div className="mt-4 rounded-lg border-2" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
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
                          
                          {/* Barra de progresso visual (opcional) */}
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
            message={!error && command.trim() === "" ? "Examples: Get-Process | Where-Object CPU -gt 100 | Select Name, CPU" : ""}
          />
        </form>

        {/* Result area - REVERTED to original */}
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl min-h-[80px] sm:min-h-[100px] flex items-center justify-center border rounded-lg p-4 sm:p-6" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
          {result ? (
            <div className="text-center">
              <div className="mb-2">
                <span className="font-mono text-base sm:text-lg" style={{color: result.type === "safe" ? 'var(--accent)' : 'var(--secondary)'}}>
                  {result.type === "safe" ? "✓ Safe command" : "✗ Malicious command"}
                </span>
              </div>
              <div>
                <span className="font-mono text-xs sm:text-sm" style={{color: 'var(--foreground)'}}>
                  Severity: {result.severity === "leve" ? "Low" : result.severity === "médio" ? "Medium" : "Critical"}
                </span>
              </div>
            </div>
          ) : (
            <div className="font-mono text-sm sm:text-base" style={{color: 'var(--accent)'}}>
              Type a command for analysis
            </div>
          )}
        </div>
        

      </div>
    </div>
  );
}