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
import InlineCaptcha from "./components/InlineCaptcha";
import { analyzeCommand } from "../../lib/supabase";

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { ipAddress, ipLocation, loading: ipLoading, error: ipError } = useIpAddress();
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
  const [error, setError] = useState("");
  const [command, setCommand] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  console.log('🏠 HOME PAGE: Componente renderizado');
  console.log('  - Usuário autenticado:', isAuthenticated());
  console.log('  - User object:', user);
  console.log('  - Router pathname:', router.pathname);
  console.log('  - Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');

  // Debug logs para IP e localização
  useEffect(() => {
    console.log('🔍 IP Address & Location Debug:');
    console.log('- ipAddress:', ipAddress);
    console.log('- ipLocation:', ipLocation);
    console.log('- ipLoading:', ipLoading);
    console.log('- ipError:', ipError);
    
    // Log detalhado da localização
    if (ipLocation) {
      console.log('📍 Location Details:');
      console.log('  - Country:', ipLocation.country);
      console.log('  - City:', ipLocation.city);
      console.log('  - Region:', ipLocation.region);
      console.log('  - Timezone:', ipLocation.timezone);
      console.log('  - ISP:', ipLocation.isp);
    }
  }, [ipAddress, ipLocation, ipLoading, ipError]);

  // Verificar autenticação - REMOVIDO para permitir acesso de usuários não logados
  // useEffect(() => {
  //   if (!isAuthenticated()) {
  //     router.push('/landing');
  //   }
  // }, [isAuthenticated, router]);

  // Log de mudanças de autenticação
  useEffect(() => {
    console.log('🔐 HOME PAGE: Mudança de autenticação detectada');
    console.log('  - isAuthenticated mudou para:', isAuthenticated());
    console.log('  - User mudou para:', user);
    console.log('  - Loading IP:', ipLoading);
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

  // Command analysis - usando API Python com rate limiting
  const handleAnalyze = async (e) => {
    e.preventDefault();
    
    const validation = validatePowerShellCommand(command);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }
    
    // Se captcha é necessário mas não foi resolvido, não prosseguir
    if (showCaptcha && !captchaSolution) {
      setError("Please solve the captcha to continue.");
      return;
    }
    
    setError(""); // Clear previous error
    setLoading(true);
    
    try {
      console.log('🚀 Starting analysis with Python API:');
      console.log('- Command:', command);
      console.log('- IP Address:', ipAddress);
      console.log('- IP Location:', ipLocation);
      console.log('- Captcha Solution:', captchaSolution);
      
      // Preparar dados para a API
      const requestData = {
        command: command.trim(),
        user_id: user?.id || null, // Incluir user_id se usuário estiver logado
        ip_address: ipAddress,
        country: ipLocation?.country,
        city: ipLocation?.city,
        region: ipLocation?.region,
        timezone: ipLocation?.timezone,
        search_type: "WEB"
      };

      // Incluir captcha se disponível
      if (captchaSolution) {
        requestData.captcha_token = captchaSolution.token;
        requestData.captcha_answer = captchaSolution.answer;
      }

      // Fazer requisição para a API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      console.log('🌐 API URL:', apiUrl);
      console.log('📤 Request data:', requestData);
      
      const response = await fetch(`${apiUrl}/analyze-pcre2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      // Verificar se precisa de rate limiting ou captcha
      const needsHandling = handleRateLimitResponse(response, data);
      
      if (needsHandling) {
        setLoading(false);
        return; // Para por aqui se precisa de captcha ou rate limit
      }

      // Se chegou aqui mas ainda precisa de captcha (primeira vez), mostrar captcha
      if (!showCaptcha && data.rate_limit_info?.requires_captcha) {
        handleRateLimitResponse(response, data);
        setLoading(false);
        return;
      }

      // Se chegou aqui, a análise foi bem-sucedida
      if (response.ok && data.success) {
        // Redirecionar para página de análise com resultados
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
      } else {
        setError(data.error || 'Erro na análise');
      }
      
    } catch (err) {
      console.error('Erro na análise:', err);
      
      // Verificar se é erro de conexão
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError(`Erro de conexão: Não foi possível conectar com a API em ${apiUrl}. Verifique se o servidor backend está rodando.`);
      } else if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        setError(`Servidor backend não está acessível. Verifique se está rodando em ${apiUrl}`);
      } else {
        setError(`Erro de conexão: ${err.message}`);
      }
    } finally {
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
    <div className="flex h-full">
      {/* Chat lateral - sempre visível para todos os usuários */}
      <div className="flex-shrink-0">
        <AnalysisChat />
      </div>
      
      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-6 sm:mb-8 text-center px-2" style={{color: 'var(--accent)'}}>
          {/* Forçar novo deploy - removendo Edge Function references */}
          powershell.exposed teste
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
          
          {/* Rate Limit Info */}
          {rateLimitInfo && (
            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-md">
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Notice:</strong> You have made {rateLimitInfo.current_count} of {rateLimitInfo.limit} allowed searches in {rateLimitInfo.window_seconds} seconds.
                {rateLimitInfo.current_count >= rateLimitInfo.limit && (
                  <div className="mt-3 space-y-3">
                    <div className="font-medium text-center p-2 bg-orange-100 dark:bg-orange-900 rounded border">
                      🚫 Rate limit reached - Choose an option:
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Opção 1: Esperar */}
                      {isTimerActive && timeLeft > 0 && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-700">
                          <div className="text-center">
                            <div className="text-lg mb-2">⏰</div>
                            <div className="font-bold text-blue-900 dark:text-blue-100">
                              Option 1: Wait
                            </div>
                            <div className="font-mono text-sm font-bold text-blue-800 dark:text-blue-200">
                              {formatTime}
                            </div>
                            <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                              Wait for automatic reset
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Opção 2: Captcha */}
                      <div className="p-3 bg-green-50 dark:bg-green-900 rounded border border-green-200 dark:border-green-700">
                        <div className="text-center">
                          <div className="text-lg mb-2">🔓</div>
                          <div className="font-bold text-green-900 dark:text-green-100">
                            Option 2: Solve Captcha
                          </div>
                          <div className="text-sm text-green-800 dark:text-green-200">
                            Continue immediately
                          </div>
                          <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                            Solve the captcha below
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center text-xs text-yellow-700 dark:text-yellow-300 border-t pt-2">
                      Choose either option to continue making searches
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Captcha Inline */}
          {showCaptcha && (
            <div className="mt-4">
              <InlineCaptcha
                onSolved={handleCaptchaSolved}
                onError={(error) => setError(error)}
                className="w-full"
              />
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