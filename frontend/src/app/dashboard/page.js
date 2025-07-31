"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { getUserAnalyses, deleteAnalysis } from "../../../utils/database";
import LoadingSpinner from "../components/LoadingSpinner";
import SeverityBadge from "../components/SeverityBadge";
import ThemedButton from "../components/ThemedButton";
import { ErrorMessage, InfoMessage } from "../components/Messages";

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    loadAnalyses();
  }, [isAuthenticated, router]);

  const loadAnalyses = async () => {
    try {
      setLoading(true);
      const data = await getUserAnalyses(50);
      setAnalyses(data);
    } catch (err) {
      setError('Error loading analyses: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async (analysisId) => {
    if (!confirm('Are you sure you want to delete this analysis?')) {
      return;
    }

    try {
      await deleteAnalysis(analysisId);
      setMessage('Analysis deleted successfully');
      setAnalyses(analyses.filter(a => a.id !== analysisId));
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError('Error deleting analysis: ' + err.message);
    }
  };

  const handleViewAnalysis = (command) => {
    const encodedCommand = encodeURIComponent(command);
    router.push(`/analysis?cmd=${encodedCommand}`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
            Dashboard
          </h1>
          <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
            Your saved PowerShell analyses
          </p>
        </div>

        {error && <ErrorMessage message={error} />}
        {message && <InfoMessage message={message} />}

        {analyses.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-mono text-lg mb-4" style={{color: 'var(--muted-foreground)'}}>
              No analysis found
            </p>
            <ThemedButton onClick={() => router.push('/')}>
              Run first analysis
            </ThemedButton>
          </div>
        ) : (
          <div className="grid gap-4">
            {analyses.map((analysis) => (
              <div 
                key={analysis.id}
                className="p-6 rounded-lg border" 
                style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <SeverityBadge severity={analysis.severity} />
                      <span className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                        Score: {analysis.risk_score}
                      </span>
                    </div>
                    <p className="font-mono text-sm break-all" style={{color: 'var(--muted-foreground)'}}>
                      {new Date(analysis.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <ThemedButton
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewAnalysis(analysis.command)}
                    >
                      View Analysis
                    </ThemedButton>
                    <button
                      onClick={() => handleDeleteAnalysis(analysis.id)}
                      className="px-3 py-1 font-mono text-sm rounded border transition-colors hover:opacity-80"
                      style={{
                        backgroundColor: 'transparent',
                        color: 'var(--destructive)',
                        borderColor: 'var(--destructive)'
                      }}
                    >
                      Deletar
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <h3 className="font-mono text-sm font-semibold mb-1" style={{color: 'var(--foreground)'}}>
                      Comando:
                    </h3>
                    <code 
                      className="block p-3 rounded text-xs break-all font-mono"
                      style={{backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)'}}
                    >
                      {analysis.command}
                    </code>
                  </div>
                  
                  {analysis.decoded_command && (
                    <div>
                      <h3 className="font-mono text-sm font-semibold mb-1" style={{color: 'var(--foreground)'}}>
                        Comando Decodificado:
                      </h3>
                      <code 
                        className="block p-3 rounded text-xs break-all font-mono"
                        style={{backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)'}}
                      >
                        {analysis.decoded_command}
                      </code>
                    </div>
                  )}
                  
                  {analysis.signatures_detected && analysis.signatures_detected.length > 0 && (
                    <div>
                      <h3 className="font-mono text-sm font-semibold mb-2" style={{color: 'var(--foreground)'}}>
                        Assinaturas Detectadas:
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.signatures_detected.slice(0, 5).map((sig, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 rounded text-xs font-mono"
                            style={{
                              backgroundColor: 'var(--accent)',
                              color: 'var(--accent-foreground)'
                            }}
                          >
                            {sig.name || sig}
                          </span>
                        ))}
                        {analysis.signatures_detected.length > 5 && (
                          <span 
                            className="px-2 py-1 rounded text-xs font-mono"
                            style={{color: 'var(--muted-foreground)'}}
                          >
                            +{analysis.signatures_detected.length - 5} mais
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
