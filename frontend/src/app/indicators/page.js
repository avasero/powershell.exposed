// eslint-disable-line react-hooks/exhaustive-deps
"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import LoadingSpinner from "../components/LoadingSpinner";
import ThemedButton from "../components/ThemedButton";
import { ErrorMessage } from "../components/Messages";
import { getSeverityColor as getColorObject } from "../../constants/severityColors";
import Link from "next/link";
import { FaGithub } from 'react-icons/fa';
export default function IndicatorsPage() {
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState("basescore");
  const [sortOrder, setSortOrder] = useState("desc");
  const router = useRouter();

  const loadIndicators = useCallback(async (search = searchTerm, page = currentPage, sortBy = sortField, order = sortOrder) => {
    try {
      if (search !== searchTerm || page !== currentPage) {
        setSearching(true);
      } else {
        setLoading(true);
      }
      setError("");

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize === "All" ? "1000" : pageSize.toString()
      });

      if (sortBy && order) {
        params.append('sortBy', sortBy);
        params.append('order', order);
      }

      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`/api/indicators?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      // Debug: Check if last_modified_by data is present
      if (data.indicators && data.indicators.length > 0) {
        console.log('First indicator data:', data.indicators[0]);
      }

      setIndicators(data.indicators || []);
      setPagination(data.pagination || {});

    } catch (err) {
      setError(err.message || "Failed to load indicators");
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [searchTerm, currentPage, pageSize, sortField, sortOrder]);

  // Debounced search function
  const debounceSearch = useCallback((searchValue, page, sortBy, order) => {
    const timeoutId = setTimeout(() => {
      loadIndicators(searchValue, page, sortBy, order);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [loadIndicators]);

  useEffect(() => {
    if (searchTerm === "" && currentPage === 1 && !sortField) {
      loadIndicators();
    } else {
      setSearching(true);
      const cleanup = debounceSearch(searchTerm, currentPage, sortField, sortOrder);
      return cleanup;
    }
  }, [currentPage, searchTerm, pageSize, sortField, sortOrder, debounceSearch, loadIndicators]);

  // Função para ordenar no backend
  const sortIndicators = (field) => {
    let newOrder = "asc";

    // Se já está ordenando por esse campo, inverte a ordem
    if (sortField === field) {
      newOrder = sortOrder === "asc" ? "desc" : "asc";
    }

    setSortField(field);
    setSortOrder(newOrder);

    // O useEffect irá disparar o carregamento quando sortField ou sortOrder mudar
  };

  const getSeverityChipClass = (severity) => {
    const severityLower = severity?.toUpperCase() || '';
    const colors = {
      'CRITICAL': 'bg-red-500/20 text-red-400 border-red-500/50',
      'HIGH': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      'MEDIUM': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      'LOW': 'bg-green-500/20 text-green-400 border-green-500/50',
      'INFORMATIONAL': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    };
    return colors[severityLower] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-2" style={{ color: 'var(--accent)' }}>
            Community Indicators
          </h1>
          <div className="flex justify-between items-center">
            <p className="font-mono text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
              Browse and search detection public indicators
            </p>
            <Link href="https://github.com/avasero/psexposed" target="_blank">
              <ThemedButton className="gap-2 mb-4">
                <FaGithub size={18} />
                Explore on GitHub
              </ThemedButton>
            </Link>
          </div>

          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search indicators (name, sev, score, description, author)..."
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
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
                </div>
              )}
            </div>


            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(e.target.value === "All" ? "All" : parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none px-4 py-3 pr-10 rounded border font-mono text-sm min-w-[120px] cursor-pointer hover:bg-opacity-80 transition-all focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--foreground)'
                  }}
                >
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value="All">Show All</option>
                </select>

                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--muted-foreground)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
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


        </div>

        {error && <ErrorMessage message={error} />}

        {indicators.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-black/80 border-green-500/30">
            <p className="font-mono text-lg mb-4" style={{ color: 'var(--muted-foreground)' }}>
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

            <div className="hidden md:block overflow-x-auto border rounded-lg bg-black/80 border-green-500/30">
              <table className="w-full">
                <thead className="border-b border-green-500/30">
                  <tr className="bg-black/40">
                    <th
                      onClick={() => sortIndicators("name")}
                      className="px-4 py-3 text-left font-mono text-sm font-bold cursor-pointer hover:bg-green-500/10 transition-colors"
                      style={{ color: 'var(--accent)' }}
                    >
                      <span className="inline-flex items-center">Name<SortIcon field="name" /></span>
                    </th>
                    <th
                      onClick={() => sortIndicators("severity")}
                      className="px-4 py-3 text-left font-mono text-sm font-bold cursor-pointer hover:bg-green-500/10 transition-colors"
                      style={{ color: 'var(--accent)' }}
                    >
                      <span className="inline-flex items-center">Severity<SortIcon field="severity" /></span>
                    </th>
                    <th
                      onClick={() => sortIndicators("basescore")}
                      className="px-4 py-3 text-left font-mono text-sm font-bold cursor-pointer hover:bg-green-500/10 transition-colors"
                      style={{ color: 'var(--accent)' }}
                    >
                      <span className="inline-flex items-center">Base Score<SortIcon field="basescore" /></span>
                    </th>
                    <th
                      onClick={() => sortIndicators("last_modified_by")}
                      className="px-4 py-3 text-left font-mono text-sm font-bold cursor-pointer hover:bg-green-500/10 transition-colors"
                      style={{ color: 'var(--accent)' }}
                    >
                      <span className="inline-flex items-center">Author<SortIcon field="last_modified_by" /></span>
                    </th>
                    <th
                      onClick={() => sortIndicators("merger")}
                      className="px-4 py-3 text-left font-mono text-sm font-bold cursor-pointer hover:bg-green-500/10 transition-colors"
                      style={{ color: 'var(--accent)' }}
                    >
                      <span className="inline-flex items-center">Merger<SortIcon field="merger" /></span>
                    </th>
                    <th
                      onClick={() => sortIndicators("last_modification")}
                      className="px-4 py-3 text-left font-mono text-sm font-bold cursor-pointer hover:bg-green-500/10 transition-colors"
                      style={{ color: 'var(--accent)' }}
                    >
                      <span className="inline-flex items-center">Updated At<SortIcon field="last_modification" /></span>
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
                        <a
                          onClick={() => handleIndicatorClick(indicator.id)}
                          className="font-mono text-sm font-bold text-left hover:opacity-80 transition-opacity underline hover:text-green-500"
                        >
                          {indicator.name}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-xs font-bold px-2 py-1 rounded border ${getSeverityChipClass(indicator.severity)}`}>
                          {indicator.severity ? indicator.severity.toUpperCase() : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                        {indicator.basescore || 0}
                      </td>
                      <td className="px-4 py-3">
                        {indicator.last_modified_by ? (
                          <div className="flex items-center gap-2">
                            {indicator.last_modified_by_avatar ? (
                              <img
                                src={indicator.last_modified_by_avatar}
                                alt={indicator.last_modified_by}
                                className="w-6 h-6 rounded-full border border-green-500/30"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            {!indicator.last_modified_by_avatar && (
                              <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                                <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
                                  {indicator.last_modified_by.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                              {truncateText(indicator.last_modified_by, 20)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {indicator.merger ? (
                          <div className="flex items-center gap-2">
                            {indicator.merger_avatar ? (
                              <img
                                src={indicator.merger_avatar}
                                alt={indicator.merger}
                                className="w-6 h-6 rounded-full border border-green-500/30"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextElementSibling) {
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            {!indicator.merger_avatar && (
                              <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                                <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
                                  {indicator.merger.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                              {truncateText(indicator.merger, 20)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {indicator.updated_at ? new Date(indicator.updated_at).toLocaleDateString('en-US', {
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


            <div className="md:hidden space-y-3">
              {indicators.map((indicator) => (
                <div
                  key={indicator.id}
                  onClick={() => handleIndicatorClick(indicator.id)}
                  className="border rounded-lg p-4 bg-black/80 border-green-500/30 hover:border-green-500/50 transition-all cursor-pointer hover:shadow-lg"
                  style={{
                    boxShadow: 'hover' ? '0 0 15px rgba(32, 224, 115, 0.1)' : 'none'
                  }}
                >

                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <a
                        className="font-mono text-sm font-bold hover:text-green-400 transition-colors underline break-words"
                        style={{ color: 'var(--accent)' }}
                      >
                        {indicator.name}
                      </a>
                    </div>
                    <span className={`font-mono text-xs font-bold whitespace-nowrap px-2 py-1 rounded border ${getSeverityChipClass(indicator.severity)}`}>
                      {indicator.severity ? indicator.severity.toUpperCase() : 'N/A'}
                    </span>
                  </div>


                  <div className="mb-3 flex items-center justify-between text-xs font-mono">
                    <span style={{ color: 'var(--muted-foreground)' }}>Base Score:</span>
                    <span style={{ color: 'var(--accent)' }} className="font-bold">
                      {indicator.basescore || 0}
                    </span>
                  </div>


                  <div className="pt-3 border-t border-green-500/20 text-xs font-mono space-y-2">
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--muted-foreground)' }}>Author:</span>
                      <div className="flex items-center gap-2">
                        {indicator.last_modified_by ? (
                          <>
                            {indicator.last_modified_by_avatar ? (
                              <img
                                src={indicator.last_modified_by_avatar}
                                alt={indicator.last_modified_by}
                                className="w-5 h-5 rounded-full border border-green-500/30"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextElementSibling) {
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            {!indicator.last_modified_by_avatar && (
                              <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                                <span style={{ color: 'var(--accent)' }} className="text-xs font-bold">
                                  {indicator.last_modified_by.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span style={{ color: 'var(--foreground)' }}>
                              {truncateText(indicator.last_modified_by, 15)}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--muted-foreground)' }}>-</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--muted-foreground)' }}>Merger:</span>
                      <div className="flex items-center gap-2">
                        {indicator.merger ? (
                          <>
                            {indicator.merger_avatar ? (
                              <img
                                src={indicator.merger_avatar}
                                alt={indicator.merger}
                                className="w-5 h-5 rounded-full border border-green-500/30"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextElementSibling) {
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            {!indicator.merger_avatar && (
                              <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                                <span style={{ color: 'var(--accent)' }} className="text-xs font-bold">
                                  {indicator.merger.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span style={{ color: 'var(--foreground)' }}>
                              {truncateText(indicator.merger, 15)}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--muted-foreground)' }}>-</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--muted-foreground)' }}>Updated:</span>
                      <span style={{ color: 'var(--foreground)' }}>
                        {indicator.updated_at ? new Date(indicator.updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        }) : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {pagination.total > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm font-mono mt-6 p-4 border rounded-lg bg-black/80 border-green-500/30">
                <div className="flex flex-wrap gap-4" style={{ color: 'var(--muted-foreground)' }}>
                  <span>Total: <strong style={{ color: 'var(--accent)' }}>{pagination.total}</strong> indicators</span>
                  {pageSize !== "All" ? (
                    <>
                      <span>Showing: <strong style={{ color: 'var(--accent)' }}>{((pagination.page - 1) * pageSize) + 1}</strong> - <strong style={{ color: 'var(--accent)' }}>{Math.min(pagination.page * pageSize, pagination.total)}</strong></span>
                      <span>Page: <strong style={{ color: 'var(--accent)' }}>{pagination.page}</strong> of <strong style={{ color: 'var(--accent)' }}>{pagination.totalPages}</strong></span>
                    </>
                  ) : (
                    <span>Showing: <strong style={{ color: 'var(--accent)' }}>All {pagination.total}</strong> indicators</span>
                  )}
                </div>

                {pagination.totalPages > 1 && pageSize !== "All" && (
                  <div className="flex items-center gap-2">
                    <FiChevronLeft
                      onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                      className={`w-5 h-5 transition-all ${currentPage <= 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:opacity-70'}`}
                      style={{ color: 'var(--accent)' }}
                    />

                    <div className="flex gap-1">
                      {[...Array(pagination.totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        if (
                          pageNum === 1 ||
                          pageNum === pagination.totalPages ||
                          (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-2 py-1 rounded font-mono text-xs transition-all ${currentPage === pageNum
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
                          return <span key={pageNum} className="px-1 flex items-center" style={{ color: 'var(--muted-foreground)' }}>...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <FiChevronRight
                      onClick={() => currentPage < pagination.totalPages && setCurrentPage(currentPage + 1)}
                      className={`w-5 h-5 transition-all ${currentPage >= pagination.totalPages ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:opacity-70'}`}
                      style={{ color: 'var(--accent)' }}
                    />
                  </div>
                )}
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}

