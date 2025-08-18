"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getAnalysisById } from "../../../../lib/supabase";
import LoadingSpinner from "../../components/LoadingSpinner";
import SeverityBadge from "../../components/SeverityBadge";
import ThemedButton from "../../components/ThemedButton";
import { ErrorMessage } from "../../components/Messages";

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

export default function AnalysisDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (params.id) {
      loadAnalysis();
    }
  }, [isAuthenticated, params.id, router]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError("");
      
      const data = await getAnalysisById(params.id);
      setAnalysis(data);
      
    } catch (err) {
      setError(err.message || "Failed to load analysis");
    } finally {
      setLoading(false);
    }
  };

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
            <ThemedButton onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </ThemedButton>
          </div>
        </div>
      </div>
    );
  }

  const analysisResult = analysis.analysis_result;
  const scoreColor = getScoreColor(analysisResult.risk_score);
  const scoreLabel = getScoreLabel(analysisResult.risk_score);

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <ThemedButton 
              onClick={() => router.push('/dashboard')}
              variant="secondary"
            >
              ← Back to Dashboard
            </ThemedButton>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
            Analysis Details
          </h1>
          <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
            Created: {new Date(analysis.created_at).toLocaleString()}
          </p>
        </div>

        {/* Command Display */}
        <div className="mb-6">
          <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
            Command
          </h2>
          <div 
            className="p-4 rounded-lg border font-mono text-sm overflow-x-auto"
            style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
          >
            <code style={{color: 'var(--foreground)'}}>{analysis.command}</code>
          </div>
        </div>

        {/* IP Address Display */}
        {analysis.ip_address && (
          <div className="mb-6">
            <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
              IP Address & Location
            </h2>
            <div 
              className="p-4 rounded-lg border font-mono text-sm"
              style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
            >
              <div className="space-y-3">
                {/* IP Address */}
                <div className="flex items-center gap-2">
                  <span style={{color: 'var(--accent)'}}>🌐</span>
                  <code style={{color: 'var(--foreground)'}}>{analysis.ip_address}</code>
                </div>
                
                {/* Location Information */}
                {(analysis.ip_country || analysis.ip_city || analysis.ip_region || analysis.ip_timezone) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-gray-600">
                    {analysis.ip_country && (
                      <div className="flex items-center gap-2">
                        <span style={{color: 'var(--accent)'}}>🏳️</span>
                        <span style={{color: 'var(--foreground)'}}>
                          <strong>Country:</strong> {analysis.ip_country}
                        </span>
                      </div>
                    )}
                    
                    {analysis.ip_city && (
                      <div className="flex items-center gap-2">
                        <span style={{color: 'var(--accent)'}}>🏙️</span>
                        <span style={{color: 'var(--foreground)'}}>
                          <strong>City:</strong> {analysis.ip_city}
                        </span>
                      </div>
                    )}
                    
                    {analysis.ip_region && (
                      <div className="flex items-center gap-2">
                        <span style={{color: 'var(--accent)'}}>🗺️</span>
                        <span style={{color: 'var(--foreground)'}}>
                          <strong>Region:</strong> {analysis.ip_region}
                        </span>
                      </div>
                    )}
                    
                    {analysis.ip_timezone && (
                      <div className="flex items-center gap-2">
                        <span style={{color: 'var(--accent)'}}>🕐</span>
                        <span style={{color: 'var(--foreground)'}}>
                          <strong>Timezone:</strong> {analysis.ip_timezone}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-xs mt-3 pt-3 border-t border-gray-600" style={{color: 'var(--muted-foreground)'}}>
                  Analysis performed from this IP address and location
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search Type Display */}
        {analysis.search_type && (
          <div className="mb-6">
            <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
              Search Information
            </h2>
            <div 
              className="p-4 rounded-lg border font-mono text-sm"
              style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
            >
              <div className="flex items-center gap-2">
                <span style={{color: 'var(--accent)'}}>🔍</span>
                <span style={{color: 'var(--foreground)'}}>
                  <strong>Search Type:</strong> {analysis.search_type}
                </span>
              </div>
              <p className="text-xs mt-3 pt-3 border-t border-gray-600" style={{color: 'var(--muted-foreground)'}}>
                Analysis performed via {analysis.search_type} interface
              </p>
            </div>
          </div>
        )}

        {/* User Agent Display */}
        {analysis.user_agent && (
          <div className="mb-6">
            <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
              Browser Information
            </h2>
            <div 
              className="p-4 rounded-lg border font-mono text-sm"
              style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
            >
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span style={{color: 'var(--accent)'}}>🌐</span>
                  <div>
                    <span style={{color: 'var(--foreground)'}}>
                      <strong>User Agent:</strong>
                    </span>
                    <div className="mt-2 p-3 rounded bg-gray-800 text-xs font-mono break-all" style={{color: 'var(--muted-foreground)'}}>
                      {analysis.user_agent}
                    </div>
                  </div>
                </div>
                
                {/* Parse User Agent para informações úteis */}
                {(() => {
                  const ua = analysis.user_agent;
                  let browser = 'Unknown';
                  let os = 'Unknown';
                  let device = 'Unknown';
                  
                  // Detectar navegador
                  if (ua.includes('Chrome')) browser = 'Chrome';
                  else if (ua.includes('Firefox')) browser = 'Firefox';
                  else if (ua.includes('Safari')) browser = 'Safari';
                  else if (ua.includes('Edge')) browser = 'Edge';
                  else if (ua.includes('Opera')) browser = 'Opera';
                  
                  // Detectar OS
                  if (ua.includes('Windows')) os = 'Windows';
                  else if (ua.includes('Mac')) os = 'macOS';
                  else if (ua.includes('Linux')) os = 'Linux';
                  else if (ua.includes('Android')) os = 'Android';
                  else if (ua.includes('iOS')) os = 'iOS';
                  
                  // Detectar dispositivo
                  if (ua.includes('Mobile')) device = 'Mobile';
                  else if (ua.includes('Tablet')) device = 'Tablet';
                  else device = 'Desktop';
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-gray-600">
                      <div className="flex items-center gap-2">
                        <span style={{color: 'var(--accent)'}}>🌍</span>
                        <span style={{color: 'var(--foreground)'}}>
                          <strong>Browser:</strong> {browser}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span style={{color: 'var(--accent)'}}>💻</span>
                        <span style={{color: 'var(--foreground)'}}>
                          <strong>OS:</strong> {os}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span style={{color: 'var(--accent)'}}>📱</span>
                        <span style={{color: 'var(--foreground)'}}>
                          <strong>Device:</strong> {device}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                
                <p className="text-xs mt-3 pt-3 border-t border-gray-600" style={{color: 'var(--muted-foreground)'}}>
                  Analysis performed from this browser and device
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cumulative Base Score Card */}
        <div className="mb-6">
          <div 
            className={`p-6 rounded-lg border-2 ${scoreColor}`}
            style={{backgroundColor: 'var(--card-bg)'}}
          >
            <div className="text-center">
              <div className="text-3xl font-mono font-bold mb-2">
                {analysisResult.risk_score.toFixed(1)}/10
              </div>
              <div className="text-lg font-mono font-bold mb-2">
                {scoreLabel}
              </div>
              <div className="font-mono text-sm">
                {analysisResult.is_malicious ? '⚠️ Potentially Malicious' : '✅ Appears Safe'}
              </div>
            </div>
          </div>
        </div>

        {/* Detected Cmdlets */}
        {analysisResult.cmdlets_detected && analysisResult.cmdlets_detected.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
              PowerShell Cmdlets Detected
            </h2>
            <div className="space-y-3">
              {analysisResult.cmdlets_detected.map((cmdlet, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-lg border"
                  style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-mono font-bold" style={{color: 'var(--foreground)'}}>
                      {cmdlet.alias} → {cmdlet.cmdlet_name}
                    </h3>
                    <span className="px-2 py-1 rounded text-xs font-mono bg-blue-900/30 text-blue-400 border border-blue-800">
                      Score: {cmdlet.score}
                    </span>
                  </div>
                  <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                    {cmdlet.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detected Indicators */}
        {analysisResult.signatures_detected && analysisResult.signatures_detected.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
              Detected Indicators
            </h2>
            <div className="space-y-3">
              {analysisResult.signatures_detected.map((signature, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-lg border"
                  style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-mono font-bold" style={{color: 'var(--foreground)'}}>
                      {signature.name}
                    </h3>
                    <SeverityBadge score={signature.score || 0} />
                  </div>
                  <p className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                    Pattern: <code>{signature.pattern}</code>
                  </p>
                  <p className="font-mono text-sm mt-1" style={{color: 'var(--muted-foreground)'}}>
                    Score: {signature.score}/10
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MITRE ATT&CK Tactics & Techniques */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Tactics */}
          {analysisResult.tactics && analysisResult.tactics.length > 0 && (
            <div>
              <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
                MITRE ATT&CK Tactics
              </h2>
              <div 
                className="p-4 rounded-lg border"
                style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
              >
                <div className="space-y-2">
                  {analysisResult.tactics.map((tactic, index) => (
                    <div key={index} className="font-mono text-sm" style={{color: 'var(--foreground)'}}>
                      • {tactic}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Techniques */}
          {analysisResult.techniques && analysisResult.techniques.length > 0 && (
            <div>
              <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
                MITRE ATT&CK Techniques
              </h2>
              <div 
                className="p-4 rounded-lg border"
                style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
              >
                <div className="space-y-2">
                  {analysisResult.techniques.map((technique, index) => (
                    <div key={index} className="font-mono text-sm" style={{color: 'var(--foreground)'}}>
                      • {technique}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Decoded Command */}
        {analysisResult.decoded_command && (
          <div className="mb-6">
            <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
              Decoded Command
            </h2>
            <div 
              className="p-4 rounded-lg border font-mono text-sm overflow-x-auto"
              style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
            >
              <code style={{color: 'var(--foreground)'}}>{analysisResult.decoded_command}</code>
            </div>
          </div>
        )}

        {/* Indicators */}
        {analysisResult.analysis_details?.indicators && analysisResult.analysis_details.indicators.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
              Indicators
            </h2>
            <div 
              className="p-4 rounded-lg border"
              style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
            >
              <div className="space-y-2">
                {analysisResult.analysis_details.indicators.map((indicator, index) => (
                  <div key={index} className="font-mono text-sm flex items-start gap-2">
                    <span style={{color: 'var(--accent)'}}>•</span>
                    <span style={{color: 'var(--foreground)'}}>{indicator}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysisResult.analysis_details?.recommendations && analysisResult.analysis_details.recommendations.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
              Recommendations
            </h2>
            <div 
              className="p-4 rounded-lg border"
              style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
            >
              <div className="space-y-3">
                {analysisResult.analysis_details.recommendations.map((recommendation, index) => (
                  <div key={index} className="font-mono text-sm flex items-start gap-2">
                    <span style={{color: 'var(--foreground)'}}>{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Further Notes */}
        <div className="mb-6">
          <h2 className="text-lg font-mono font-bold mb-3" style={{color: 'var(--foreground)'}}>
          Analyses Notes
          </h2>
          <div 
            className="p-4 rounded-lg border font-mono text-sm"
            style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
          >
            <div className="space-y-3">
              {analysisResult.signatures_detected && analysisResult.signatures_detected.length > 0 && (
                <div className="flex items-start gap-2">
                  <span style={{color: 'var(--accent)'}}>•</span>
                  <span>This command shows potentially suspicious activity. While not immediately dangerous, it should be reviewed in context.</span>
                </div>
              )}
              
              {analysisResult.signatures_detected && analysisResult.signatures_detected.length > 0 && (
                <div className="flex items-start gap-2">
                  <span style={{color: 'var(--accent)'}}>•</span>
                  <span>Analysis completed with {analysisResult.signatures_detected.length} detection patterns using MITRE ATT&CK framework.</span>
                </div>
              )}
              
              {analysisResult.cmdlets_detected && analysisResult.cmdlets_detected.length > 0 && (
                <div className="flex items-start gap-2">
                  <span style={{color: 'var(--accent)'}}>•</span>
                  <span>{analysisResult.cmdlets_detected.length} PowerShell cmdlets identified and analyzed for potential security implications.</span>
                </div>
              )}
              
              {analysisResult.risk_score > 0 && (
                <div className="flex items-start gap-2">
                  <span style={{color: 'var(--accent)'}}>•</span>
                  <span>Cumulative base score calculated from all detected indicators and PowerShell cmdlets.</span>
                </div>
              )}
              
              {(!analysisResult.signatures_detected || analysisResult.signatures_detected.length === 0) && analysisResult.risk_score === 0 && (
                <div className="flex items-start gap-2">
                  <span style={{color: 'var(--accent)'}}>•</span>
                  <span>No malicious patterns detected in this command. It appears to be safe based on our analysis.</span>
                </div>
              )}
              
              <div className="text-xs pt-3 border-t border-gray-600" style={{color: 'var(--muted-foreground)'}}>
                Analysis performed using advanced PowerShell command pattern recognition and threat intelligence
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <ThemedButton onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </ThemedButton>
          <ThemedButton 
            onClick={() => router.push('/')}
            variant="secondary"
          >
            New Analysis
          </ThemedButton>
        </div>
      </div>
    </div>
  );
}
