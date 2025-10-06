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
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [sortField, setSortField] = useState(""); // Campo atual de ordenação
  const [sortOrder, setSortOrder] = useState("asc"); // asc ou desc
  const router = useRouter();

  // Debounced search function
  const debounceSearch = useCallback((searchValue, page) => {
    const timeoutId = setTimeout(() => {
      loadIndicators(searchValue, page);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (searchTerm === "" && currentPage === 1 && !sortField) {
      loadIndicators();
    } else {
      setSearching(true);
      const cleanup = debounceSearch(searchTerm, currentPage);
      return cleanup;
    }
  }, [currentPage, searchTerm, debounceSearch]);

  const loadIndicators = async (search = searchTerm, page = currentPage) => {
    try {
      if (search !== searchTerm || page !== currentPage) {
        setSearching(true);
      } else {
        setLoading(true);
      }
      setError("");
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10"
      });
      
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

  // Função para ordenar localmente
  const sortIndicators = (field) => {
    let newOrder = "asc";
    
    // Se já está ordenando por esse campo, inverte a ordem
    if (sortField === field) {
      newOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    
    setSortField(field);
    setSortOrder(newOrder);
    
    const sorted = [...indicators].sort((a, b) => {
      let aValue, bValue;
      
      switch (field) {
        case "label":
          aValue = (a.name || "").toLowerCase();
          bValue = (b.name || "").toLowerCase();
          break;
        case "severity":
          const severityOrder = { "LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4 };
          aValue = severityOrder[a.severity?.toUpperCase()] || 0;
          bValue = severityOrder[b.severity?.toUpperCase()] || 0;
          break;
        case "basescore":
          aValue = a.basescore || 0;
          bValue = b.basescore || 0;
          break;
        case "description":
          aValue = (a.description || "").toLowerCase();
          bValue = (b.description || "").toLowerCase();
          break;
        case "last_modification":
          aValue = a.last_modification ? new Date(a.last_modification).getTime() : 0;
          bValue = b.last_modification ? new Date(b.last_modification).getTime() : 0;
          break;
        default:
          return 0;
      }
      
      if (newOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
    
    setIndicators(sorted);
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'text-red-400';
      case 'HIGH': return 'text-orange-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'LOW': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const handleIndicatorClick = (indicatorId) => {
    router.push(`/indicators/${indicatorId}`);
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Componente para o ícone de ordenação
  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 inline ml-1 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    if (sortOrder === "asc") {
      return (
        <svg className="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    }
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-2" style={{color: 'var(--accent)'}}>
            PowerShell Indicators
          </h1>
          <p className="font-mono text-sm mb-6" style={{color: 'var(--muted-foreground)'}}>
            Browse and search detection indicators
          </p>
          
          {/* Search Bar */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-3 rounded border font-mono text-sm"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--foreground)'
                }}
              />
              {searching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{borderColor: 'var(--accent)'}}></div>
                </div>
              )}
            </div>
            {searchTerm && (
              <ThemedButton
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
              >
                Clear
              </ThemedButton>
            )}
          </div>

          {/* Stats */}
          {pagination.total > 0 && (
            <div className="flex flex-wrap gap-4 text-sm font-mono mb-4" style={{color: 'var(--muted-foreground)'}}>
              <span>Total: <strong style={{color: 'var(--accent)'}}>{pagination.total}</strong> indicators</span>
              <span>Showing: <strong style={{color: 'var(--accent)'}}>{((pagination.page - 1) * 10) + 1}</strong> - <strong style={{color: 'var(--accent)'}}>{Math.min(pagination.page * 10, pagination.total)}</strong></span>
              <span>Page: <strong style={{color: 'var(--accent)'}}>{pagination.page}</strong> of <strong style={{color: 'var(--accent)'}}>{pagination.totalPages}</strong></span>
            </div>
          )}
        </div>

        {error && <ErrorMessage message={error} />}

        {indicators.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-black/80 border-green-500/30">
            <p className="font-mono text-lg mb-4" style={{color: 'var(--muted-foreground)'}}>
              {searchTerm ? "No indicators found matching your search" : "No indicators found"}
            </p>
            {searchTerm && (
              <ThemedButton onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}>
                Clear Search
              </ThemedButton>
            )}
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto border rounded-lg bg-black/80 border-green-500/30">
              <table className="w-full">
                <thead className="border-b border-green-500/30">
                  <tr className="bg-black/40">
                    <th 
                      onClick={() => sortIndicators("label")}
                      className="px-4 py-3 text-left font-mono text-sm font-bold cursor-pointer hover:bg-green-500/10 transition-colors" 
                      style={{color: 'var(--accent)'}}
                    >
                      Label <SortIcon field="label" />
                    </th>
                    <th 
                      onClick={() => sortIndicators("severity")}
                      className="px-4 py-3 text-left font-mono text-sm font-bold cursor-pointer hover:bg-green-500/10 transition-colors" 
                      style={{color: 'var(--accent)'}}
                    >
                      Severity <SortIcon field="severity" />
                    </th>
                    <th 
                      onClick={() => sortIndicators("basescore")}
                      className="px-4 py-3 text-left font-mono text-sm font-bold cursor-pointer hover:bg-green-500/10 transition-colors" 
                      style={{color: 'var(--accent)'}}
                    >
                      Base Score <SortIcon field="basescore" />
                    </th>
                    <th 
                      onClick={() => sortIndicators("description")}
                      className="px-4 py-3 text-left font-mono text-sm font-bold cursor-pointer hover:bg-green-500/10 transition-colors" 
                      style={{color: 'var(--accent)'}}
                    >
                      Description <SortIcon field="description" />
                    </th>
                    <th 
                      onClick={() => sortIndicators("last_modification")}
                      className="px-4 py-3 text-left font-mono text-sm font-bold cursor-pointer hover:bg-green-500/10 transition-colors" 
                      style={{color: 'var(--accent)'}}
                    >
                      Last Modified <SortIcon field="last_modification" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {indicators.map((indicator, index) => (
                    <tr 
                      key={indicator.id}
                      className="border-b border-green-500/20 hover:bg-green-500/5 transition-colors"
                      style={{
                        backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleIndicatorClick(indicator.id)}
                          className="font-mono text-sm font-bold text-left hover:opacity-80 transition-opacity"
                          style={{color: 'var(--foreground)'}}
                        >
                          {truncateText(indicator.name, 40)}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-sm font-bold ${getSeverityColor(indicator.severity)}`}>
                          {indicator.severity || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm" style={{color: 'var(--foreground)'}}>
                        {indicator.basescore || 0}/10
                      </td>
                      <td className="px-4 py-3 font-mono text-sm" style={{color: 'var(--muted-foreground)'}}>
                        {truncateText(indicator.description, 60)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{color: 'var(--muted-foreground)'}}>
                        {indicator.last_modification ? new Date(indicator.last_modification).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                
                <div className="flex gap-2">
                  {[...Array(pagination.totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    // Show first, last, current, and pages around current
                    if (
                      pageNum === 1 ||
                      pageNum === pagination.totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded font-mono text-sm transition-all ${
                            currentPage === pageNum
                              ? 'bg-green-500/20 border-2 border-green-500/50 font-bold'
                              : 'border border-green-500/30 hover:bg-green-500/10'
                          }`}
                          style={{
                            color: currentPage === pageNum ? 'var(--accent)' : 'var(--muted-foreground)'
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === currentPage - 2 ||
                      pageNum === currentPage + 2
                    ) {
                      return <span key={pageNum} className="px-2" style={{color: 'var(--muted-foreground)'}}>...</span>;
                    }
                    return null;
                  })}
                </div>
                
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

