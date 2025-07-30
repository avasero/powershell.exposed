"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import SeverityBadge from "../components/SeverityBadge";
import ThemedButton from "../components/ThemedButton";
import AnalysisCard from "../components/AnalysisCard";

const SEVERITY_COLORS = {
  info: "border-green-400 text-green-400 bg-green-50 dark:bg-green-900/20",
  medium: "border-yellow-400 text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20", 
  high: "border-red-400 text-red-400 bg-red-50 dark:bg-red-900/20",
  critical: "border-red-600 text-red-600 bg-red-50 dark:bg-red-900/20",
};

const CATEGORY_COLORS = {
  "ASPX FILE REFERENCE": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "BASE64 TO STRING CONVERTION": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "ENCODED COMMAND": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "FAIRLY SUSPICIUS KEYWORDS": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "LONG BASE64 STRING": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "tEXT.eNCODING AND BASE64 STRING MANIPULATION": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "MIMIKATZ EXECUTION": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "BLOODHOUND EXECUTION": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "FILELESS BLOODHOUND": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "AUTOMATED EXECUTION": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "UAC BYPASS": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "COM OBJECT ABUSE": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "XML PAYLOAD EXECUTION": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "MSHTA PAYLOAD EXECUTION": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "DOWNLOAD CRADLE": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "REGISTRY PAYLOAD EXECUTION": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "ADS EXECUTION": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "REMOTE POWERSHELL": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "PARAMETER VARIATION": "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  "OBFUSCATED EXECUTION": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "MALICIOUS CMDLETS": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "PRIVILEGE ESCALATION": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "DNS ABUSE": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "AD ENUMERATION": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "AD CACHE BUILDING": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
};

export default function SignaturesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Carregar signatures
  useEffect(() => {
    const loadSignatures = async () => {
      try {
        const response = await fetch('/signatures.json');
        const signaturesData = await response.json();
        setSignatures(signaturesData);
      } catch (error) {
        console.error('Erro ao carregar signatures:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSignatures();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  // Filtrar signatures
  const filteredSignatures = signatures.filter(sig => {
    const matchesSearch = sig.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sig.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sig.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = selectedSeverity === "all" || sig.severity === selectedSeverity;
    const matchesCategory = selectedCategory === "all" || sig.category === selectedCategory;
    
    return matchesSearch && matchesSeverity && matchesCategory;
  });

  // Obter categorias únicas
  const uniqueCategories = [...new Set(signatures.map(sig => sig.category))].sort();
  const uniqueSeverities = [...new Set(signatures.map(sig => sig.severity))];

  // Estatísticas
  const stats = {
    total: signatures.length,
    critical: signatures.filter(s => s.severity === 'critical').length,
    high: signatures.filter(s => s.severity === 'high').length,
    medium: signatures.filter(s => s.severity === 'medium').length,
    info: signatures.filter(s => s.severity === 'info').length,
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-6 sm:mb-8 text-center" style={{color: 'var(--accent)'}}>
        Detection Signatures
      </h1>

      {/* Estatísticas */}
      <div className="w-full max-w-6xl mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="border rounded-lg p-3 text-center" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
            <div className="font-mono text-lg font-bold" style={{color: 'var(--foreground)'}}>{stats.total}</div>
            <div className="text-xs font-mono" style={{color: 'var(--accent)'}}>Total</div>
          </div>
          <div className="border rounded-lg p-3 text-center border-red-600" style={{backgroundColor: 'var(--card-bg)'}}>
            <div className="font-mono text-lg font-bold text-red-600">{stats.critical}</div>
            <div className="text-xs font-mono text-red-600">Critical</div>
          </div>
          <div className="border rounded-lg p-3 text-center border-red-400" style={{backgroundColor: 'var(--card-bg)'}}>
            <div className="font-mono text-lg font-bold text-red-400">{stats.high}</div>
            <div className="text-xs font-mono text-red-400">High</div>
          </div>
          <div className="border rounded-lg p-3 text-center border-yellow-400" style={{backgroundColor: 'var(--card-bg)'}}>
            <div className="font-mono text-lg font-bold text-yellow-400">{stats.medium}</div>
            <div className="text-xs font-mono text-yellow-400">Medium</div>
          </div>
          <div className="border rounded-lg p-3 text-center border-green-400" style={{backgroundColor: 'var(--card-bg)'}}>
            <div className="font-mono text-lg font-bold text-green-400">{stats.info}</div>
            <div className="text-xs font-mono text-green-400">Info</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="w-full max-w-6xl mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Busca */}
          <div>
            <input
              type="text"
              placeholder="Search signatures..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border rounded-lg font-mono text-sm"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--foreground)'
              }}
            />
          </div>
          
          {/* Filtro por Severidade */}
          <div>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full p-3 border rounded-lg font-mono text-sm"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--foreground)'
              }}
            >
              <option value="all">All Severities</option>
              {uniqueSeverities.map(severity => (
                <option key={severity} value={severity}>
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          {/* Filtro por Categoria */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-3 border rounded-lg font-mono text-sm"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--foreground)'
              }}
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="text-sm font-mono" style={{color: 'var(--accent)'}}>
          Showing {filteredSignatures.length} of {signatures.length} signatures
        </div>
      </div>

      {/* Lista de Signatures */}
      <div className="w-full max-w-6xl space-y-4 mb-8">
        {filteredSignatures.map((signature, index) => (
          <div 
            key={index}
            className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
            style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
              <h3 className="font-mono font-bold text-lg" style={{color: 'var(--accent)'}}>
                {signature.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                <SeverityBadge severity={signature.severity} />
                <span className={`px-2 py-1 rounded text-xs font-mono ${CATEGORY_COLORS[signature.category] || 'bg-gray-100 text-gray-800'}`}>
                  {signature.category}
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs font-mono">
                  Score: {signature.score}
                </span>
              </div>
            </div>
            
            <p className="text-sm mb-3" style={{color: 'var(--foreground)', opacity: 0.8}}>
              {signature.description}
            </p>
            
            <div className="border rounded p-2" style={{backgroundColor: 'var(--background)', borderColor: 'var(--border-color)'}}>
              <div className="text-xs font-mono mb-1" style={{color: 'var(--accent)'}}>Regex Pattern:</div>
              <code className="text-xs font-mono break-all" style={{color: 'var(--foreground)'}}>
                {signature.regex}
              </code>
              {signature.flags && (
                <div className="text-xs font-mono mt-1" style={{color: 'var(--accent)'}}>
                  Flags: {signature.flags}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Botão para voltar */}
      <ThemedButton onClick={() => router.push("/")} className="mb-6">
        Back to Analysis
      </ThemedButton>
    </div>
  );
}
