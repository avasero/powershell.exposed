"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { savePowerShellAnalysis } from "../../../utils/database";
import LoadingSpinner from "../components/LoadingSpinner";
import SeverityLegend from "../components/SeverityLegend";
import AnalysisCard from "../components/AnalysisCard";
import SeverityBadge from "../components/SeverityBadge";
import IndicatorTable from "../components/IndicatorTable";
import ThemedButton from "../components/ThemedButton";

// Regex helpers
function countMatches(str, regex) {
  const m = str.match(regex);
  return m ? m.length : 0;
}

const SEVERITY_ORDER = ["info", "medium", "high", "critical"];
const SEVERITY_COLORS = {
  info: "border-green-400 text-green-400",
  medium: "border-yellow-400 text-yellow-400", 
  high: "border-red-400 text-red-400",
  critical: "border-red-600 text-red-600",
};

const SEVERITY_DESCRIPTIONS = {
  info: {
    label: "Info",
    description: "Informational: Common or benign PowerShell commands, typically used for administration or diagnostics.",
  },
  medium: {
    label: "Medium", 
    description: "Medium: Potentially suspicious activity, such as service or network manipulation, but not immediately dangerous.",
  },
  high: {
    label: "High",
    description: "High: Strong indicators of malicious intent, such as encoded commands, downloads, or remote execution.",
  },
  critical: {
    label: "Critical",
    description: "Critical: Highly dangerous, obfuscated, or credential-stealing commands. Immediate attention required!",
  },
};

// Function to decode Base64 PowerShell commands robustly
function decodeBase64Command(cmd) {
  // Extract Base64 payload from -EncodedCommand, -enc, or -e flags
  const match = /(?:-EncodedCommand|-enc(?:odedcommand)?|-e)\s+(['"]?)([A-Za-z0-9+/=]+)\1/i.exec(cmd);
  if (!match) return null;
  const base64 = match[2];
  try {
    // Decode Base64 to binary string
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    // Decode as UTF-16LE
    let text = new TextDecoder('utf-16le').decode(bytes);
    if (/[\u0001-\u007F]/.test(text)) {
      return text;
    }
    // Fallback to UTF-8
    text = new TextDecoder('utf-8').decode(bytes);
    return text;
  } catch (error) {
    console.error('decodeBase64Command error:', error);
    return null;
  }
}

function analyzeCommand(cmd, signatures = []) {
  const found = [];
  let totalScore = 0;
  let maxSeverity = "info";
  let decodedCommand = null;
  
  // Try to decode Base64 command if it's encoded
  const decoded = decodeBase64Command(cmd);
  if (decoded) {
    decodedCommand = decoded;
    // Analyze both original and decoded command
    cmd = cmd + ' ' + decoded; // Combine both for analysis
  }
  
  // Obfuscation ratio
  const symbolCount = countMatches(cmd, /['@%^,;:=&+"(){}\]`!*./?_\[\]|<>~$]/g);
  const nonSymbolCount = countMatches(cmd, /[^'@%^,;:=&+"(){}\]`!*./?_\[\]|<>~$\s]/g);
  const ps_len = cmd.length;
  const ratio = symbolCount > 0 ? (nonSymbolCount / symbolCount) : 99;
  let obfuscationDetails = null;
  if (ps_len > 100 && ratio < 3) {
    found.push({
      name: "Highly Obfuscated Command (ratio)",
      keyword: `ratio: ${ratio.toFixed(2)}, len: ${ps_len}`,
      score: 90,
      severity: "critical",
      description: "Command contains a high ratio of symbols, likely obfuscated.",
      obfuscation: true,
    });
    totalScore += 90;
    maxSeverity = "critical";
    obfuscationDetails = { ratio, ps_len };
  }
  for (const sig of signatures) {
    // Convert JSON regex string to RegExp object
    const regex = new RegExp(sig.regex, sig.flags || 'i');
    const match = cmd.match(regex);
    if (match) {
      found.push({
        name: sig.name,
        keyword: match[0],
        score: sig.score,
        severity: sig.severity,
        description: sig.description,
        category: sig.category,
      });
      totalScore += sig.score;
      if (
        SEVERITY_ORDER.indexOf(sig.severity) >
        SEVERITY_ORDER.indexOf(maxSeverity)
      ) {
        maxSeverity = sig.severity;
      }
    }
  }
  return {
    severity: maxSeverity,
    score: totalScore,
    signatures: found,
    obfuscationDetails,
    decodedCommand,
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
  const decodedResult = result && result.decodedCommand ? analyzeCommand(result.decodedCommand, signatures) : null;
  // Combine and dedupe indicators from original and decoded command
  const allSignatures = result
    ? decodedResult
      ? [...result.signatures, ...decodedResult.signatures]
      : result.signatures
    : [];
  const mergedSignatures = Array.from(
    new Map(allSignatures.map(sig => [sig.name, sig])).values()
  );
  // Calculate total risk score from merged indicators
  const mergedScore = mergedSignatures.reduce((sum, sig) => sum + sig.score, 0);
  // Carregar signatures do arquivo JSON
  useEffect(() => {
    const loadSignatures = async () => {
      try {
        const response = await fetch('/signatures.json');
        const signaturesData = await response.json();
        setSignatures(signaturesData);
      } catch (error) {
        console.error('Erro ao carregar signatures:', error);
      }
    };
    loadSignatures();
  }, []);

  // Function to save analysis to Supabase
  const saveAnalysisToDatabase = async (command, analysisResult) => {
    if (!isAuthenticated()) {
      console.log('User not authenticated, not saving analysis');
      return;
    }
    
    try {
      const analysisData = {
        command: command,
        analysis_result: analysisResult,
        risk_score: analysisResult.score || 0,
        severity: analysisResult.severity || 'info',
        signatures_detected: analysisResult.signatures || [],
        decoded_command: analysisResult.decodedCommand || null
      };
      
      const savedAnalysis = await savePowerShellAnalysis(analysisData);
      console.log('Analysis saved successfully:', savedAnalysis);
    } catch (error) {
      console.error('Error saving analysis:', error);
    }
  };

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
  }, [params, signatures, isAuthenticated]);

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

      {/* Severity Legend */}
      <SeverityLegend />
      {/* Decoded Command Display */}
      {result && result.decodedCommand && (
        <AnalysisCard title="Decoded Command" variant="info">
          <pre className="font-mono text-xs sm:text-sm break-all" style={{color: 'var(--foreground)'}}>
            {result.decodedCommand}
          </pre>
        </AnalysisCard>
      )}

      {/* Results */}
      {result && (
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          {/* Session Severity & Risk Score */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="border rounded-lg p-4 sm:p-6 text-center" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
              <h3 className="font-mono text-base sm:text-lg font-bold mb-2" style={{color: 'var(--accent)'}}>
                Session Severity
              </h3>
              <span className={`px-3 sm:px-4 py-2 border rounded font-mono text-base sm:text-lg font-bold uppercase ${SEVERITY_COLORS[result.severity]}`}>
                {result.severity}
              </span>
            </div>
            <div className="border rounded-lg p-4 sm:p-6 text-center" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
              <h3 className="font-mono text-base sm:text-lg font-bold mb-2" style={{color: 'var(--accent)'}}>
                Risk Score
              </h3>
              <span className="font-mono text-xl sm:text-2xl font-bold" style={{color: 'var(--foreground)'}}>
                {mergedScore}
              </span>
              <span className="font-mono text-xs block mt-1" style={{color: 'var(--accent)', opacity: 0.7}}>
                Cumulative score from all indicators
              </span>
            </div>
          </div>

          {result.obfuscationDetails && (
            <AnalysisCard title="Obfuscation Analysis" variant="warning">
              Obfuscation detected: ratio {result.obfuscationDetails.ratio.toFixed(2)}, length {result.obfuscationDetails.ps_len}
            </AnalysisCard>
          )}

          {/* Scored Indicators */}
          <IndicatorTable signatures={mergedSignatures} />

          {/* Notes Section */}
          <AnalysisCard title="Analysis Notes" variant="warning">
            <div className="space-y-2 sm:space-y-3">
              {result.severity === 'info' && (
                <div>
                  • This command contains common PowerShell cmdlets typically used for system administration and diagnostics.
                </div>
              )}
              {result.severity === 'medium' && (
                <div>
                  • This command shows potentially suspicious activity. While not immediately dangerous, it should be reviewed in context.
                </div>
              )}
              {result.severity === 'high' && (
                <div>
                  • This command contains strong indicators of malicious intent. Review the execution context and source carefully.
                </div>
              )}
              {result.severity === 'critical' && (
                <div>
                  • This command is highly dangerous and likely malicious. Immediate investigation and containment may be required.
                </div>
              )}
              
              {mergedScore > 50 && (
                <div>
                  • High risk score ({mergedScore}) indicates multiple suspicious patterns detected.
                </div>
              )}
              
              {result.obfuscationDetails && (
                <div>
                  • Command shows signs of obfuscation, which is commonly used to evade detection.
                </div>
              )}
              
              <div>
                • Analysis completed with {signatures.length} detection signatures.
              </div>
            </div>
          </AnalysisCard>
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