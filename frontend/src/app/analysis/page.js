"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { savePowerShellAnalysis } from "../../../utils/database";
import SeverityLegend from "../components/SeverityLegend";
import AnalysisCard from "../components/AnalysisCard";
import SeverityBadge from "../components/SeverityBadge";
import IndicatorTable from "../components/IndicatorTable";
import ThemedButton from "../components/ThemedButton";

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

// Simple YAML parser for signature files
function parseYamlSignature(yamlText) {
  try {
    const lines = yamlText.split('\n');
    const signature = {};
    let currentKey = null;
    let inReferenceSection = false;
    let references = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      
      // Handle reference list items
      if (inReferenceSection && line.startsWith('- ')) {
        const ref = line.slice(2).trim(); // Remove "- " prefix
        references.push(ref);
        continue;
      }
      
      // If we're in reference section but encounter a non-list item, end the section
      if (inReferenceSection && !line.startsWith('- ') && line.includes(':')) {
        inReferenceSection = false;
      }
      
      if (line.includes(':')) {
        const colonIndex = line.indexOf(':');
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        currentKey = key;
        
        switch (currentKey) {
          case 'name':
            signature.name = value;
            inReferenceSection = false;
            break;
          case 'description':
            signature.description = value;
            inReferenceSection = false;
            break;
          case 'regex':
            signature.regex = value;
            signature.flags = 'i'; // Default case insensitive
            inReferenceSection = false;
            break;
          case 'basescore':
            signature.score = parseFloat(value) || 0;
            inReferenceSection = false;
            break;
          case 'tactic':
            // Parse array format [item1, item2] or simple value
            if (value.startsWith('[') && value.endsWith(']')) {
              signature.tactic = value.slice(1, -1).split(',').map(t => t.trim());
            } else {
              signature.tactic = [value];
            }
            inReferenceSection = false;
            break;
          case 'technique':
            // Parse array format [item1, item2] or simple value
            if (value.startsWith('[') && value.endsWith(']')) {
              signature.technique = value.slice(1, -1).split(',').map(t => t.trim());
            } else {
              signature.technique = [value];
            }
            inReferenceSection = false;
            break;
          case 'reference':
            inReferenceSection = true;
            references = [];
            // If there's a value on the same line after "reference:"
            if (value && value !== '') {
              references.push(value);
            }
            break;
        }
      }
    }
    
    // Add references to signature if any were found
    if (references.length > 0) {
      signature.reference = references;
    }
    
    return signature;
  } catch (error) {
    console.error('Erro ao parsear YAML:', error);
    return null;
  }
}

function analyzeCommand(cmd, signatures = []) {
  const found = [];
  let totalScore = 0;
  let maxScore = 0;
  
  for (const sig of signatures) {
    // Convert JSON regex string to RegExp object
    const regex = new RegExp(sig.regex, sig.flags || 'i');
    const match = cmd.match(regex);
    if (match) {
      found.push({
        name: sig.name,
        keyword: match[0],
        score: sig.score,
        description: sig.description,
        category: sig.category,
        tactic: sig.tactic,
        technique: sig.technique,
        reference: sig.reference  // Add references here!
      });
      totalScore += sig.score;
      if (sig.score > maxScore) {
        maxScore = sig.score;
      }
    }
  }
  return {
    maxScore: maxScore,
    score: totalScore,
    signatures: found
  };
}

export default function AnalysisPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [result, setResult] = useState(null);
  const [cmd, setCmd] = useState("");
  const [signatures, setSignatures] = useState([]);

  // Verificar autenticação
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/landing');
    }
  }, [isAuthenticated, router]);
  
  // Calculate total risk score from signatures
  const totalScore = result ? result.signatures.reduce((sum, sig) => sum + sig.score, 0) : 0;
  // Carregar signatures dos 5 arquivos YAML principais
  useEffect(() => {
    const loadSignatures = async () => {
      try {
        // Lista dos 5 arquivos YAML principais
        const yamlFiles = [
          'ps_indicator_scheduled_task_modification.yaml',
          'ps_indicator_ms_defender_tampering.yaml',
          'ps_indicator_web_client_traces.yaml',
          'ps_indicator_service_creation.yaml',
          'ps_indicator_invoke_expression.yaml'
        ];

        const loadedSignatures = [];

        // Carregar cada arquivo YAML
        for (const fileName of yamlFiles) {
          try {
            const response = await fetch(`/signatures/${fileName}`);
            if (response.ok) {
              const yamlText = await response.text();
              const signature = parseYamlSignature(yamlText);
              if (signature) {
                loadedSignatures.push(signature);
              }
            }
          } catch (error) {
            console.warn(`Erro ao carregar ${fileName}:`, error);
          }
        }

        setSignatures(loadedSignatures);
      } catch (error) {
        console.error('Erro ao carregar signatures:', error);
      }
    };
    loadSignatures();
  }, []);

  // Function to save analysis to Supabase
  const saveAnalysisToDatabase = useCallback(async (command, analysisResult) => {
    if (!isAuthenticated()) {
      console.log('User not authenticated, not saving analysis');
      return;
    }
    
    try {
      // Extract tactics and techniques from signatures
      const allTactics = [];
      const allTechniques = [];
      
      analysisResult.signatures.forEach(sig => {
        if (sig.tactic) {
          allTactics.push(...(Array.isArray(sig.tactic) ? sig.tactic : [sig.tactic]));
        }
        if (sig.technique) {
          allTechniques.push(...(Array.isArray(sig.technique) ? sig.technique : [sig.technique]));
        }
      });

      const analysisData = {
        command: command,
        analysis_result: analysisResult,
        risk_score: analysisResult.score || 0,
        signatures_detected: analysisResult.signatures || [],
        decoded_command: null,
        signature_file: 'yaml_signatures', // Identificador para sistema YAML
        tactics: [...new Set(allTactics)], // Remove duplicatas
        techniques: [...new Set(allTechniques)] // Remove duplicatas
      };
      
      const savedAnalysis = await savePowerShellAnalysis(analysisData);
      console.log('Analysis saved successfully:', savedAnalysis);
    } catch (error) {
      console.error('Error saving analysis:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const command = params.get("cmd") || "";
    setCmd(command);
    if (signatures.length > 0) {
      const analysisResult = analyzeCommand(command, signatures);
      setResult(analysisResult);
      
      // Save analysis to database if user is authenticated
      if (command && analysisResult) {
        saveAnalysisToDatabase(command, analysisResult);
      }
    }
  }, [params, signatures, isAuthenticated, saveAnalysisToDatabase]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-6 sm:mb-8 text-center" style={{color: 'var(--accent)'}}>
        Analysis Result
      </h1>

      {/* Command Display */}
      <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8 border rounded-lg p-3 sm:p-4" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
        <div className="font-mono text-xs sm:text-sm mb-2" style={{color: 'var(--accent)'}}>Command analyzed:</div>
        <div className="flex items-start">
          <span className="font-mono mr-2 text-sm" style={{color: 'var(--accent)'}}>PS &gt;</span>
          <span className="font-mono text-xs sm:text-sm break-all" style={{color: 'var(--foreground)'}}>{cmd}</span>
        </div>
      </div>

      {/* Score Legend */}
      <SeverityLegend />
      
      {/* Results */}
      {result && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          {/* Session Score & Risk Score */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="border rounded-lg p-4 sm:p-6 text-center max-w-md mx-auto" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
              <h3 className="font-mono text-base sm:text-lg font-bold mb-2" style={{color: 'var(--accent)'}}>
                Risk Score
              </h3>
              <span className="font-mono text-xl sm:text-2xl font-bold" style={{color: 'var(--foreground)'}}>
                {totalScore.toFixed(1)}
              </span>
              <span className="font-mono text-xs block mt-1" style={{color: 'var(--accent)', opacity: 0.7}}>
                Cumulative score from all indicators
              </span>
            </div>
          </div>

          {/* Scored Indicators */}
          <IndicatorTable signatures={result.signatures} />

          {/* Notes Section */}
          <div className="mt-8 mb-6">
            <AnalysisCard title="Analysis Notes" variant="warning">
            <div className="space-y-2 sm:space-y-3">
              {result.maxScore <= 2.0 && (
                <div>
                  • This command contains basic PowerShell operations with minimal security implications.
                </div>
              )}
              {result.maxScore > 2.0 && result.maxScore <= 4.0 && (
                <div>
                  • This command contains common administrative operations that are generally safe.
                </div>
              )}
              {result.maxScore > 4.0 && result.maxScore <= 6.0 && (
                <div>
                  • This command shows potentially suspicious activity. While not immediately dangerous, it should be reviewed in context.
                </div>
              )}
              {result.maxScore > 6.0 && result.maxScore <= 8.0 && (
                <div>
                  • This command contains strong indicators of malicious intent. Review the execution context and source carefully.
                </div>
              )}
              {result.maxScore > 8.0 && (
                <div>
                  • This command is highly dangerous and likely malicious. Immediate investigation and containment may be required.
                </div>
              )}
              
              {totalScore > 20 && (
                <div>
                  • High cumulative risk score ({totalScore.toFixed(1)}) indicates multiple suspicious patterns detected.
                </div>
              )}
              
              <div>
                • Analysis completed with {signatures.length} detection signatures using MITRE ATT&CK framework.
              </div>
            </div>
          </AnalysisCard>
          </div>
        </div>
      )}

      {/* Back Button */}
      <ThemedButton
        onClick={() => router.push("/")}
        className="mb-6 sm:mb-8"
      >
        Analyze another command
      </ThemedButton>
    </div>
  );
}