"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "../components/LoadingSpinner";
import ThemedButton from "../components/ThemedButton";
import { ErrorMessage } from "../components/Messages";

export default function IndicatorsPage() {
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const router = useRouter();

  const severityOptions = [
    { value: "", label: "All Severities" },
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
    { value: "CRITICAL", label: "Critical" }
  ];

  // Debounced search function
  const debounceSearch = useCallback((searchValue, severity, page) => {
    const timeoutId = setTimeout(() => {
      loadIndicators(searchValue, severity, page);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (searchTerm === "" && selectedSeverity === "" && currentPage === 1) {
      loadIndicators();
    } else {
      setSearching(true);
      const cleanup = debounceSearch(searchTerm, selectedSeverity, currentPage);
      return cleanup;
    }
  }, [currentPage, selectedSeverity, searchTerm, debounceSearch]);

  const loadIndicators = async (search = searchTerm, severity = selectedSeverity, page = currentPage) => {
    try {
      if (search !== searchTerm || severity !== selectedSeverity || page !== currentPage) {
        setSearching(true);
      } else {
        setLoading(true);
      }
      setError("");
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20"
      });
      
      if (severity) {
        params.append('severity', severity);
      }
      
      if (search && search.trim()) {
        params.append('search', search.trim());
      }
      
      const response = await fetch(`/api/indicators?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      setIndicators(data.indicators || []);
      setPagination(data.pagination || {});
      
    } catch (err) {
      setError(err.message || "Failed to load indicators");
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleSeverityChange = (severity) => {
    setSelectedSeverity(severity);
    setCurrentPage(1);
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

  const handleIndicatorClick = (indicatorId) => {
    router.push(`/indicators/${indicatorId}`);
  };

  if (loading && indicators.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
            PowerShell Indicators
          </h1>
          <p className="font-mono text-sm mb-4" style={{color: 'var(--muted-foreground)'}}>
            Detection indicators available in the database
          </p>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 rounded border font-mono text-sm"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--foreground)'
                }}
              />
              {searching && (
                <div className="flex items-center px-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{borderColor: 'var(--accent)'}}></div>
                </div>
              )}
            </div>
            
            <select
              value={selectedSeverity}
              onChange={(e) => handleSeverityChange(e.target.value)}
              className="px-3 py-2 rounded border font-mono text-sm"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--foreground)'
              }}
            >
              {severityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stats */}
          {pagination.total > 0 && (
            <div className="flex flex-wrap gap-4 text-sm font-mono mb-4" style={{color: 'var(--muted-foreground)'}}>
              <span>Total: <strong style={{color: 'var(--accent)'}}>{pagination.total}</strong></span>
              <span>Page: <strong style={{color: 'var(--accent)'}}>{pagination.page}</strong> of <strong style={{color: 'var(--accent)'}}>{pagination.totalPages}</strong></span>
              {selectedSeverity && <span>Filter: <strong style={{color: 'var(--accent)'}}>{severityOptions.find(s => s.value === selectedSeverity)?.label}</strong></span>}
            </div>
          )}
        </div>

        {error && <ErrorMessage message={error} />}

        {indicators.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-mono text-lg mb-4" style={{color: 'var(--muted-foreground)'}}>
              {searchTerm || selectedSeverity ? "No indicators found with current filters" : "No indicators found"}
            </p>
            {(searchTerm || selectedSeverity) && (
              <ThemedButton onClick={() => {
                setSearchTerm("");
                setSelectedSeverity("");
                setCurrentPage(1);
              }}>
                Clear Filters
              </ThemedButton>
            )}
          </div>
        ) : (
          <>
            {/* Simplified Indicators List */}
            <div className="space-y-2">
              {indicators.map((indicator) => (
                <div 
                  key={indicator.id}
                  onClick={() => handleIndicatorClick(indicator.id)}
                  className="p-4 rounded border cursor-pointer hover:bg-opacity-80 transition-all" 
                  style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-mono font-bold text-lg truncate" style={{color: 'var(--foreground)'}}>
                          {indicator.name}
                        </h3>
                        <span 
                          className={`px-2 py-1 rounded text-xs font-mono font-bold border ${getSeverityColor(indicator.severity)}`}
                        >
                          {indicator.severity}
                        </span>
                        <span className="font-mono text-xs" style={{color: 'var(--muted-foreground)'}}>
                          Score: {indicator.basescore}/10
                        </span>
                      </div>
                      {indicator.description && (
                        <p className="font-mono text-sm truncate" style={{color: 'var(--muted-foreground)'}}>
                          {indicator.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="font-mono text-xs" style={{color: 'var(--muted-foreground)'}}>
                        ID: {indicator.id}
                      </span>
                      <svg className="w-4 h-4" style={{color: 'var(--muted-foreground)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6">
                <ThemedButton
                  variant="ghost"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  ← Previous
                </ThemedButton>
                
                <span className="font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                  Page {currentPage} of {pagination.totalPages}
                </span>
                
                <ThemedButton
                  variant="ghost"
                  size="sm"
                  disabled={currentPage >= pagination.totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next →
                </ThemedButton>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
