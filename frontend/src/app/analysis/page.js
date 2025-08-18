"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { analyzeCommand } from "../../../lib/supabase";
import SeverityLegend from "../components/SeverityLegend";
import AnalysisCard from "../components/AnalysisCard";
import SeverityBadge from "../components/SeverityBadge";
import IndicatorTable from "../components/IndicatorTable";
import ThemedButton from "../components/ThemedButton";
import LoadingSpinner from "../components/LoadingSpinner";
import AnalysisSkeleton from "../components/AnalysisSkeleton";

// Score-based color system (5 bins from 1-10)
function getScoreColor(score) {
  if (score >= 8.1) return "border-red-600 text-red-600";      // Critical: 8.1-10.0
  if (score >= 6.1) return "border-orange-400 text-orange-400"; // High: 6.1-8.0
  if (score >= 4.1) return "border-yellow-400 text-yellow-400"; // Medium: 4.1-6.0
  if (score >= 2.1) return "border-green-400 text-green-400";   // Low: 2.1-4.0
  return "border-blue-400 text-blue-400";                      // Very Low: 1.0-2.0
}

function getScoreLabel(score) {
  if (score >= 8.1) return "CRITICAL";
  if (score >= 6.1) return "HIGH";
  if (score >= 4.1) return "MEDIUM";
  if (score >= 2.1) return "LOW";
  return "VERY LOW";
}

export default function AnalysisPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [result, setResult] = useState(null);
  const [cmd, setCmd] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Verificar autenticação
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/landing');
    }
  }, [isAuthenticated, router]);

  // Análise otimizada usando backend
  useEffect(() => {
    const command = params.get("cmd") || "";
    const ipAddress = params.get("ip") || null;
    const country = params.get("country") || null;
    const city = params.get("city") || null;
    const region = params.get("region") || null;
    const timezone = params.get("timezone") || null;
    
    setCmd(command);
    
    console.log('🔍 Analysis Page Debug:');
    console.log('- Command from URL:', command);
    console.log('- IP Address from URL:', ipAddress);
    console.log('- Country from URL:', country);
    console.log('- City from URL:', city);
    console.log('- Region from URL:', region);
    console.log('- Timezone from URL:', timezone);
    console.log('- Is Authenticated:', isAuthenticated());
    
    // Log detalhado dos parâmetros da URL
    console.log('🔍 URL Parameters Debug:');
    console.log('  - Raw URL:', window.location.href);
    console.log('  - Search params:', window.location.search);
    console.log('  - All params:', Object.fromEntries(new URLSearchParams(window.location.search)));
    
    if (command.trim() && isAuthenticated()) {
      // Criar objeto de localização
      const ipLocation = {
        country,
        city,
        region,
        timezone
      };
      
      console.log('🚀 Starting analysis with IP:', ipAddress, 'and location:', ipLocation);
      console.log('📍 Location object being sent:');
      console.log('  - Country:', ipLocation.country);
      console.log('  - City:', ipLocation.city);
      console.log('  - Region:', ipLocation.region);
      console.log('  - Timezone:', ipLocation.timezone);
      
      performAnalysis(command, ipAddress, ipLocation);
    } else if (command.trim()) {
      console.log('⚠️ Not authenticated, showing fallback');
      // Fallback para análise local simples se não autenticado
      setLoading(false);
      setResult({
        score: 0,
        severity: "safe",
        signatures: [],
        decoded: null,
        indicators: [],
        details: "Please login to get detailed analysis"
      });
    }
  }, [params, isAuthenticated]);

  const performAnalysis = async (command, ipAddress, ipLocation) => {
    try {
      setLoading(true);
      setError("");
      
      console.log('🔄 Performing analysis:');
      console.log('- Command:', command);
      console.log('- IP Address:', ipAddress);
      console.log('- IP Location:', ipLocation);
      
      // Garantir que o skeleton apareça por pelo menos 800ms para UX
      const minDelay = new Promise(resolve => setTimeout(resolve, 800));
      
      // Timeout de 15 segundos para análise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timeout - taking too long')), 15000)
      );
      
      const analysisPromise = analyzeCommand(command, ipAddress, ipLocation);
      
      // Executar análise e delay mínimo em paralelo
      const [response] = await Promise.all([
        Promise.race([analysisPromise, timeoutPromise]),
        minDelay
      ]);
      
      if (response.success) {
        const analysisData = response.analysis.analysis_result;
        
        // Converter para formato esperado pelo frontend
        setResult({
          score: analysisData.risk_score,
          severity: analysisData.is_malicious ? "malicious" : "safe",
          signatures: (analysisData.signatures_detected || []).sort((a, b) => (b.score || 0) - (a.score || 0)),
          decoded: analysisData.decoded_command,
          indicators: analysisData.analysis_details?.indicators || [],
          details: analysisData.analysis_details?.recommendations?.join(", ") || "",
          tactics: analysisData.tactics || [],
          techniques: analysisData.techniques || []
        });
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message);
      // Fallback para análise básica
      setResult({
        score: 0,
        severity: "unknown",
        signatures: [],
        decoded: null,
        indicators: ["Error: " + err.message],
        details: "Analysis failed, showing basic info"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate total risk score from result - soma de TUDO (sem remover duplicatas do total)
  const totalScore = result ? result.score : 0;

  if (loading) {
    return <AnalysisSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-6 sm:mb-8 text-center" style={{color: 'var(--accent)'}}>
        Analysis Result
      </h1>

      {/* Command Display */}
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8 border rounded-lg p-3 sm:p-4" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
        <div className="font-mono text-xs sm:text-sm mb-2" style={{color: 'var(--accent)'}}>Command analyzed:</div>
        <div className="flex items-start">
          <span className="font-mono text-sm sm:text-base break-all" style={{color: 'var(--foreground)'}}>
            {cmd}
          </span>
        </div>
      </div>

     
 {/* Severity Legend */}
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <SeverityLegend />
      </div>
      {/* Risk Score Display */}
      {result && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div 
            className="p-6 sm:p-8 rounded-lg border-2 border-green-400 text-center"
            style={{backgroundColor: '#000000'}}
          >
            <div className="text-xl sm:text-2xl font-mono font-bold mb-4 text-green-400">
              Risk Score
            </div>
            <div className="text-5xl sm:text-6xl font-mono font-bold mb-4 text-white">
              {totalScore.toFixed(1)}
            </div>
            <div className="text-sm sm:text-base font-mono text-green-400 mb-2">
              {totalScore === 0 ? "No indicators detected" : "Cumulative score from all indicators"}
            </div>
            {/* Mostrar breakdown do score se houver indicators */}
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
                  
                  const securityScore = securitySigs.reduce((sum, sig) => sum + (sig.score || 0), 0);
                  const allCmdletScore = allCmdlets.reduce((sum, sig) => sum + (sig.score || 0), 0);
                  
                  return (
                    <>
                      {securityScore > 0 && <div>Security Indicators: {securityScore.toFixed(1)}</div>}
                      {allCmdletScore > 0 && <div>PowerShell Cmdlets: {allCmdletScore.toFixed(1)}</div>}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Individual Indicators Details */}
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
                {/* Signatures importantes */}
                {realSignatures.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg sm:text-xl font-mono font-bold mb-4" style={{color: 'var(--foreground)'}}>
                      Security Indicators
                    </h2>
                    <div className="space-y-4">
                      {realSignatures.map((signature, index) => (
                        <AnalysisCard
                          key={`real-${index}`}
                          title={signature.name}
                          description={signature.description || `Pattern detected: ${signature.pattern}`}
                          severity={signature.severity}
                          score={signature.score}
                          pattern={signature.pattern}
                          matched_text={signature.matched_text}
                          matched_command={signature.matched_command}
                          keywords={signature.pattern || signature.keyword}
                          tactic={signature.tactics || signature.tactic}
                          technique={signature.techniques || signature.technique}
                          reference={signature.reference}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* PowerShell Cmdlets básicos - cards compactos */}
                {basicCmdlets.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-base font-mono font-bold mb-3" style={{color: 'var(--muted-foreground)'}}>
                      PowerShell Cmdlets Detected ({basicCmdlets.length})
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
                            Score: {cmdlet.score} • Basic PowerShell
                          </div>
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
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-lg sm:text-xl font-mono font-bold mb-2 text-green-400">
              No Malicious Indicators Detected
            </h2>
            <p className="text-sm sm:text-base font-mono" style={{color: 'var(--muted-foreground)'}}>
              This command appears to be safe based on our signature database.
            </p>
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
      <div className="flex justify-center mb-8">
        <ThemedButton onClick={() => router.push('/')}>
          Analyze Another Command
        </ThemedButton>
      </div>
    </div>
  );
}
