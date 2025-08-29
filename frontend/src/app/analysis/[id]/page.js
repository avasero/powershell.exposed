"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import SeverityBadge from "../../components/SeverityBadge";
import ThemedButton from "../../components/ThemedButton";
import { ErrorMessage } from "../../components/Messages";
import AnalysisCard from "../../components/AnalysisCard";
import SeverityLegend from "../../components/SeverityLegend";

export default function AnalysisDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log('🔍 Carregando análise com ID:', params.id);
      
      // Chamar a nova API Python
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/analysis/${params.id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      console.log('📥 Resposta da API:', { status: response.status, data });
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      if (data.success) {
        setAnalysis(data.analysis);
        console.log('✅ Análise carregada com sucesso');
      } else {
        throw new Error('Failed to load analysis');
      }
      
    } catch (err) {
      console.error('❌ Erro ao carregar análise:', err);
      setError(err.message || "Failed to load analysis");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      loadAnalysis();
    }
  }, [params.id, loadAnalysis]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="font-mono text-sm mt-4" style={{color: 'var(--muted-foreground)'}}>
            Loading analysis...
          </p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
            Analysis Not Found
          </h2>
          <ErrorMessage message={error || "Analysis not found or you don't have permission to view it."} />
          <div className="mt-6">
            <ThemedButton onClick={() => router.push('/')}>
              Back to Home
            </ThemedButton>
          </div>
        </div>
      </div>
    );
  }

  // Calcular score total
  const totalScore = analysis.risk_score || 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-6 sm:mb-8 text-center" style={{color: 'var(--accent)'}}>
        Evaluation Results
      </h1>

      {/* Command Display */}
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8 p-3 sm:p-4" style={{backgroundColor: 'var(--muted)'}}>
        <div className="font-mono text-xs sm:text-sm mb-2" style={{color: 'var(--muted-foreground)'}}>Command evaluated:</div>
        <div className="flex items-start">
          <span className="font-mono text-sm sm:text-base break-all" style={{color: 'var(--foreground)'}}>
            {analysis.command}
          </span>
        </div>
      </div>

      {/* Cumulative Base Score Display */}
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
        </div>
      </div>

      {/* Individual Patterns Details */}
      {analysis.signatures_detected && analysis.signatures_detected.length > 0 && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-mono font-bold mb-4" style={{color: 'var(--foreground)'}}>
            Detected Patterns
          </h2>
          <div className="space-y-4">
            {analysis.signatures_detected.map((signature, index) => (
              <AnalysisCard
                key={index}
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

      {/* No Indicators Message */}
      {(!analysis.signatures_detected || analysis.signatures_detected.length === 0) && totalScore === 0 && (
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

      {/* Analysis Info */}
      {analysis.created_at && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="border rounded-lg p-4" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
              Analysis Information
            </h2>
            <div className="font-mono text-sm space-y-2" style={{color: 'var(--muted-foreground)'}}>
              <div>
                <strong>Analysis ID:</strong> {analysis.id}
              </div>
              <div>
                <strong>Created:</strong> {new Date(analysis.created_at).toLocaleString()}
              </div>
              {analysis.ip_country && (
                <div>
                  <strong>Location:</strong> {analysis.ip_country}
                  {analysis.ip_city && `, ${analysis.ip_city}`}
                </div>
              )}
              {analysis.search_type && (
                <div>
                  <strong>Search Type:</strong> {analysis.search_type}
                </div>
              )}
              <div className="text-xs pt-3 border-t border-gray-600">
                Share this analysis by copying the current URL
              </div>
            </div>
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
            navigator.clipboard.writeText(url).then(() => {
              // Optionally show a toast or notification
              console.log('URL copied to clipboard');
            });
          }}
        >
          Copy sharable link
        </ThemedButton>
      </div>
    </div>
  );
}