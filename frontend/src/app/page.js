"use client"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./contexts/AuthContext";
import { useIpAddress } from "../hooks/useIpAddress";
import LoadingSpinner from "./components/LoadingSpinner";
import { ErrorMessage, InfoMessage } from "./components/Messages";
import CommandInput from "./components/CommandInput";
import ThemedButton from "./components/ThemedButton";
import AnalysisChat from "./components/AnalysisChat";
import { analyzeCommand } from "../../lib/supabase";

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { ipAddress, ipLocation, loading: ipLoading, error: ipError } = useIpAddress();
  const [error, setError] = useState("");
  const [command, setCommand] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

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

  // Verificar autenticação
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/landing');
    }
  }, [isAuthenticated, router]);

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

  // Command analysis - REVERTED to original behavior
  const handleAnalyze = (e) => {
    e.preventDefault();
    
    const validation = validatePowerShellCommand(command);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }
    
    setError(""); // Clear previous error
    
    console.log('🚀 Starting analysis with:');
    console.log('- Command:', command);
    console.log('- IP Address:', ipAddress);
    console.log('- IP Location:', ipLocation);
    
    // Log detalhado da localização antes de enviar
    if (ipLocation) {
      console.log('📍 Sending location data:');
      console.log('  - Country:', ipLocation.country);
      console.log('  - City:', ipLocation.city);
      console.log('  - Region:', ipLocation.region);
      console.log('  - Timezone:', ipLocation.timezone);
    }
    
    // Incluir IP address e localização na URL para análise
    const analysisUrl = `/analysis?cmd=${encodeURIComponent(command.trim())}`;
    if (ipAddress) {
      let finalUrl = `${analysisUrl}&ip=${encodeURIComponent(ipAddress)}`;
      
      // Adicionar informações de localização se disponíveis
      if (ipLocation && ipLocation.country) {
        finalUrl += `&country=${encodeURIComponent(ipLocation.country)}`;
        if (ipLocation.city) finalUrl += `&city=${encodeURIComponent(ipLocation.city)}`;
        if (ipLocation.region) finalUrl += `&region=${encodeURIComponent(ipLocation.region)}`;
        if (ipLocation.timezone) finalUrl += `&timezone=${encodeURIComponent(ipLocation.timezone)}`;
      }
      
      console.log('📍 Redirecting to:', finalUrl);
      console.log('📍 URL parameters:');
      console.log('  - cmd:', command.trim());
      console.log('  - ip:', ipAddress);
      console.log('  - country:', ipLocation?.country);
      console.log('  - city:', ipLocation?.city);
      console.log('  - region:', ipLocation?.region);
      console.log('  - timezone:', ipLocation?.timezone);
      
      router.push(finalUrl);
    } else {
      console.log('⚠️ No IP address available, redirecting to:', analysisUrl);
      router.push(analysisUrl);
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
      {/* Chat lateral - apenas para usuários autenticados no desktop */}
      {isAuthenticated() && <AnalysisChat />}
      
      {/* Conteúdo principal */}
      <div className={`flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 ${isAuthenticated() ? 'md:ml-0' : ''}`}>
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
                disabled={error !== ""}
                className="w-full md:w-auto px-6 py-3"
              >
                Analyze
              </ThemedButton>
            </div>
          </div>
          
          <ErrorMessage message={error} />
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