"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { analyzeCommand } from "../../lib/supabase";
import SeverityLegend from "../components/SeverityLegend";
import AnalysisCard from "../components/AnalysisCard";
import SeverityBadge from "../components/SeverityBadge";
import IndicatorTable from "../components/IndicatorTable";
import ThemedButton from "../components/ThemedButton";
import LoadingSpinner from "../components/LoadingSpinner";

// Score-based color system (5 bins from 1-10)
function getScoreColor(score) {
  if (score >= 8.1) return "border-red-600 text-red-600";      // Critical: 8.1-10.0
  if (score >= 6.1) return "border-orange-400 text-orange-400"; // High: 6.1-8.0
  if (score >= 4.1) return "border-yellow-400 text-yellow-400"; // Medium: 4.1-6.0
  if (score >= 2.1) return "border-green-400 text-green-400";   // Low: 2.1-4.0
  return "border-green-400 text-green-400";                      // Very Low: 1.0-2.0
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
    setCmd(command);
    
    if (command.trim() && isAuthenticated()) {
      performAnalysis(command);
    } else if (command.trim()) {
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

  const performAnalysis = async (command) => {
    try {
      setLoading(true);
      setError("");
      
      const response = await analyzeCommand(command);
      
      if (response.success) {
        const analysisData = response.analysis.analysis_result;
        
        // Converter para formato esperado pelo frontend
        setResult({
          score: analysisData.risk_score,
          severity: analysisData.is_malicious ? "malicious" : "safe",
          signatures: analysisData.signatures_detected || [],
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
  
  // Calculate total risk score from result
  const totalScore = result ? result.score : 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="font-mono text-sm mt-4" style={{color: 'var(--muted-foreground)'}}>
            Analyzing command...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-6 sm:mb-8 text-center" style={{color: 'var(--accent)'}}>
        Analysis Result
      </h1>

     
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8 border rounded-lg p-3 sm:p-4" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
        <div className="font-mono text-xs sm:text-sm mb-2" style={{color: 'var(--accent)'}}>Command analyzed:</div>
        <div className="flex items-start">
          <span className="font-mono text-sm sm:text-base break-all" style={{color: 'var(--foreground)'}}>
            {cmd}
          </span>
        </div>
      </div>

     
      {result && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div 
            className={`p-6 sm:p-8 rounded-lg border-2 ${getScoreColor(totalScore)} text-center`}
            style={{backgroundColor: 'var(--card-bg)'}}
          >
            <div className="mb-4">
              <div className="text-4xl sm:text-5xl font-mono font-bold mb-2">
                {totalScore.toFixed(1)}/10
              </div>
              <div className="text-xl sm:text-2xl font-mono font-bold">
                {getScoreLabel(totalScore)}
              </div>
            </div>
            
            <div className="text-base sm:text-lg font-mono">
              {result.severity === "malicious" ? "⚠️ Potentially Malicious" : 
               result.severity === "safe" ? "✅ Appears Safe" : "❓ Unknown"}
            </div>
          </div>
        </div>
      )}

     
      {result && result.signatures && result.signatures.length > 0 && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-mono font-bold mb-4" style={{color: 'var(--foreground)'}}>
            Signatures Detected
          </h2>
          <div className="space-y-4">
            {result.signatures.map((signature, index) => (
              <AnalysisCard
                key={index}
                title={signature.name}
                description={signature.description || `Pattern: ${signature.pattern}`}
                severity={signature.severity}
                score={signature.score}
                keywords={signature.pattern || signature.keyword}
                tactic={signature.tactic}
                technique={signature.technique}
                reference={signature.reference}
              />
            ))}
          </div>
        </div>
      )}

     
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

     
      {result && result.indicators && result.indicators.length > 0 && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-mono font-bold mb-4" style={{color: 'var(--foreground)'}}>
            Indicators
          </h2>
          <IndicatorTable indicators={result.indicators} />
        </div>
      )}

     
      {result && (result.tactics?.length > 0 || result.techniques?.length > 0) && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8 grid md:grid-cols-2 gap-4">
          {result.tactics && result.tactics.length > 0 && (
            <div className="border rounded-lg p-4" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
              <h3 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
                MITRE ATT&CK Tactics
              </h3>
              <div className="space-y-2">
                {result.tactics.map((tactic, index) => (
                  <div key={index} className="font-mono text-sm" style={{color: 'var(--foreground)'}}>
                    • {tactic}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {result.techniques && result.techniques.length > 0 && (
            <div className="border rounded-lg p-4" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
              <h3 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
                MITRE ATT&CK Techniques
              </h3>
              <div className="space-y-2">
                {result.techniques.map((technique, index) => (
                  <div key={index} className="font-mono text-sm" style={{color: 'var(--foreground)'}}>
                    • {technique}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

     
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

     
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
        <SeverityLegend />
      </div>

     
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <ThemedButton onClick={() => router.push('/')}>
          Analyze Another Command
        </ThemedButton>
        <ThemedButton 
          onClick={() => router.push('/dashboard')} 
          variant="outline"
        >
          View Dashboard
        </ThemedButton>
      </div>
    </div>
  );
}
