"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import LoadingSpinner from "../../components/LoadingSpinner";
import ThemedButton from "../../components/ThemedButton";
import { ErrorMessage } from "../../components/Messages";

export default function IndicatorDetailPage() {
  const [indicator, setIndicator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (params.id) {
      loadIndicator(params.id);
    }
  }, [params.id]);

  const loadIndicator = async (id) => {
    try {
      setLoading(true);
      setError("");
      
      const response = await fetch(`/api/indicators/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Indicator not found");
        }
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      setIndicator(data.indicator);
      
    } catch (err) {
      setError(err.message || "Failed to load indicator");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'text-red-400 bg-red-900/30 border-red-800';
      case 'HIGH': return 'text-orange-400 bg-orange-900/30 border-orange-800';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-900/30 border-yellow-800';
      case 'LOW': return 'text-green-400 bg-green-900/30 border-green-800';
      default: return 'text-gray-400 bg-gray-900/30 border-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <ErrorMessage message={error} />
          <div className="text-center mt-6">
            <ThemedButton onClick={() => router.push('/indicators')}>
              ← Back to Indicators
            </ThemedButton>
          </div>
        </div>
      </div>
    );
  }

  if (!indicator) {
    return (
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-mono font-bold mb-4" style={{color: 'var(--accent)'}}>
            Indicator Not Found
          </h1>
          <ThemedButton onClick={() => router.push('/indicators')}>
            ← Back to Indicators
          </ThemedButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <ThemedButton 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/indicators')}
            className="mb-4"
          >
            ← Back to Indicators
          </ThemedButton>
          
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-mono font-bold mb-3" style={{color: 'var(--accent)'}}>
                {indicator.name}
              </h1>
              <div className="flex items-center gap-3 mb-3">
                <span 
                  className={`px-3 py-1 rounded-full text-sm font-mono font-bold border ${getSeverityColor(indicator.severity)}`}
                >
                  {indicator.severity}
                </span>
                <span className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                  Base Score: <strong style={{color: 'var(--accent)'}}>{indicator.basescore}/10</strong>
                </span>
                <span className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                  Max Match: <strong style={{color: 'var(--accent)'}}>{indicator.max_match}</strong>
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                ID: {indicator.id}
              </div>
              <div className={`font-mono text-sm ${indicator.is_active ? 'text-green-400' : 'text-red-400'}`}>
                {indicator.is_active ? '✅ Active' : '❌ Inactive'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6">
          {/* Description */}
          {indicator.description && (
            <div 
              className="p-6 rounded-lg border"
              style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
            >
              <h2 className="font-mono text-lg font-semibold mb-3" style={{color: 'var(--foreground)'}}>
                Description
              </h2>
              <p className="font-mono text-sm leading-relaxed" style={{color: 'var(--muted-foreground)'}}>
                {indicator.description}
              </p>
            </div>
          )}

          {/* MITRE ATT&CK Tactics */}
          {indicator.tactics && indicator.tactics.length > 0 && (
            <div 
              className="p-6 rounded-lg border"
              style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
            >
              <h2 className="font-mono text-lg font-semibold mb-3" style={{color: 'var(--foreground)'}}>
                MITRE ATT&CK Tactics
              </h2>
              <div className="flex flex-wrap gap-2">
                {indicator.tactics.map((tactic, index) => (
                  <span 
                    key={index}
                    className="px-3 py-2 rounded text-sm font-mono bg-blue-900/30 text-blue-400 border border-blue-800"
                  >
                    {tactic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* MITRE ATT&CK Techniques */}
          {indicator.techniques && indicator.techniques.length > 0 && (
            <div 
              className="p-6 rounded-lg border"
              style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
            >
              <h2 className="font-mono text-lg font-semibold mb-3" style={{color: 'var(--foreground)'}}>
                MITRE ATT&CK Techniques
              </h2>
              <div className="flex flex-wrap gap-2">
                {indicator.techniques.map((technique, index) => (
                  <span 
                    key={index}
                    className="px-3 py-2 rounded text-sm font-mono bg-purple-900/30 text-purple-400 border border-purple-800"
                  >
                    {technique}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* References */}
          {indicator.reference && indicator.reference.length > 0 && (
            <div 
              className="p-6 rounded-lg border"
              style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
            >
              <h2 className="font-mono text-lg font-semibold mb-3" style={{color: 'var(--foreground)'}}>
                References
              </h2>
              <div className="space-y-2">
                {indicator.reference.map((ref, index) => (
                  <div key={index}>
                    <a 
                      href={ref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-mono bg-green-900/30 text-green-400 border border-green-800 hover:bg-green-900/50 transition-colors"
                    >
                      🔗 Reference {index + 1}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Link */}
          {indicator.link && (
            <div 
              className="p-6 rounded-lg border"
              style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
            >
              <h2 className="font-mono text-lg font-semibold mb-3" style={{color: 'var(--foreground)'}}>
                Additional Information
              </h2>
              <a 
                href={indicator.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-mono bg-indigo-900/30 text-indigo-400 border border-indigo-800 hover:bg-indigo-900/50 transition-colors"
              >
                🔗 View Details
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}

          {/* Metadata */}
          <div 
            className="p-6 rounded-lg border"
            style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
          >
            <h2 className="font-mono text-lg font-semibold mb-3" style={{color: 'var(--foreground)'}}>
              Metadata
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
              <div>
                <span className="font-semibold">Created:</span> {new Date(indicator.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div>
                <span className="font-semibold">Updated:</span> {new Date(indicator.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
