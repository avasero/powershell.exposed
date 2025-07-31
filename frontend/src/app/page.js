"use client"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./contexts/AuthContext";
import LoadingSpinner from "./components/LoadingSpinner";
import { ErrorMessage, InfoMessage } from "./components/Messages";
import CommandInput from "./components/CommandInput";
import ThemedButton from "./components/ThemedButton";

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [error, setError] = useState("");
  const [command, setCommand] = useState("");
  const [result, setResult] = useState(null); // { type: 'safe'|'malicious', severity: 'leve'|'médio'|'crítico' }

  // Verificar autenticação
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/landing');
    }
  }, [isAuthenticated, router]);

  // Função para validar se o input é um comando PowerShell válido
  const validatePowerShellCommand = (input) => {
    if (!input || typeof input !== 'string') {
      return { isValid: false, error: "Command cannot be empty." };
    }

    const trimmedInput = input.trim();
    if (trimmedInput.length === 0) {
      return { isValid: false, error: "Command cannot be empty." };
    }

    // Remove comentários do PowerShell
    const cleanInput = trimmedInput.replace(/#.*$/gm, '').trim();
    if (cleanInput.length === 0) {
      return { isValid: false, error: "Command cannot contain only comments." };
    }

    // Verifica se contém apenas texto plano sem estrutura de comando
    if (!/[;|&\(\)\[\]{}\$\-\.]/.test(cleanInput) && !/^[A-Za-z][A-Za-z0-9\-]*/.test(cleanInput)) {
      return { isValid: false, error: "Please enter a valid PowerShell command, not plain text." };
    }

    // Lista de cmdlets/comandos PowerShell válidos comuns
    const validPSPatterns = [
      // Cmdlets padrão
      /^(Get|Set|New|Remove|Add|Install|Uninstall|Start|Stop|Restart|Test|Invoke|Import|Export|Clear|Show|Hide|Enable|Disable|Update|Format|Select|Where|Sort|Group|Measure|Compare|Copy|Move|Rename|Out)-[A-Za-z]+/,
      // Aliases comuns
      /^(ls|dir|cat|type|cp|copy|mv|move|rm|del|ps|kill|start|echo|cls|clear|pwd|cd|mkdir|rmdir|grep|findstr|curl|wget|iwr|iwmi|gwmi|gcm|gci|gps|gsv|alias|help|man|more|less|head|tail|tee|wc|cut|awk|sed|sort|uniq)/,
      // PowerShell executables
      /^(powershell\.exe|pwsh\.exe)/,
      // Registry commands
      /^reg\.exe/,
      // MSHTA commands
      /^mshta\.exe/,
      // CMD commands  
      /^cmd\.exe/,
      // System executables
      /^[A-Za-z]:[\\\/][\w\s\-\\\/\.]+\.exe/,
      /^\.?[\\\/]?[\w\-]+\.exe/,
      // Comandos com parâmetros
      /^[A-Za-z][A-Za-z0-9\-]*\s+(-[A-Za-z]+|\w+)/,
      // Variáveis do PowerShell
      /\$[A-Za-z_][A-Za-z0-9_]*/,
      // Pipes e redirecionamentos
      /\||\>\>?|\<\<?/,
      // Expressões PowerShell (incluindo .NET)
      /\[[\w\.\[\]]+\]/,
      // Base64 e encoding patterns
      /\[Convert\]::/,
      /\[Text\.Encoding\]::/,
      /FromBase64String/,
      /GetString/,
      // IEX patterns
      /IEX\s*\(/,
      /Invoke-Expression/,
      // Download patterns
      /New-Object.*Net\.WebClient/,
      /DownloadString/,
      /DownloadFile/,
      // COM Object patterns
      /New-Object.*-ComObject/,
      // Registry access patterns
      /gp\s+HKCU:/,
      /Get-ItemProperty.*HKEY/,
      // Comandos do sistema
      /^(cmd|powershell|pwsh|wscript|cscript|mshta|rundll32|regsvr32|sc|net|netsh|reg|wmic|tasklist|taskkill|ipconfig|netstat|ping|nslookup|telnet|ftp|ssh|scp|curl|certutil|bitsadmin|schtasks)/,
      // Números e operadores matemáticos
      /[\+\-\*\/\%\=\!\<\>\&\|]+/,
      // Strings entre aspas
      /['"`]/,
      // Parênteses para expressões
      /\(.*\)/,
      // Chaves para script blocks
      /\{.*\}/,
      // Array notation
      /\@\(/,
      // Function definitions
      /function\s+\w+/,
      // Try-catch blocks
      /try\s*\{.*\}\s*catch/,
      // Loops and conditionals
      /(foreach|for|while|if)\s*\(/
    ];

    // Verifica se o comando corresponde a algum padrão válido
    const isValidCommand = validPSPatterns.some(pattern => pattern.test(cleanInput));
    
    if (!isValidCommand) {
      // Verifica se parece com texto comum (palavras sem estrutura de comando)
      const wordsOnly = /^[A-Za-z\s]+$/.test(cleanInput);
      const hasMultipleWords = cleanInput.split(/\s+/).length > 1;
      
      if (wordsOnly && hasMultipleWords && !cleanInput.includes('-')) {
        return { isValid: false, error: "This appears to be plain text. Please enter a PowerShell command." };
      }
      
      return { isValid: false, error: "Invalid PowerShell command format. Please enter a valid cmdlet, script, or executable." };
    }

    // Validações adicionais de segurança (opcional)
    const suspiciousPatterns = [
      /^(just|only|some|random|test|hello|world|example|sample|demo|please|help me|how to)/i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(cleanInput))) {
      return { isValid: false, error: "Please enter an actual PowerShell command, not a description or request." };
    }

    return { isValid: true, error: null };
  };

  // Command analysis simulation
  const handleAnalyze = (e) => {
    e.preventDefault();
    
    const validation = validatePowerShellCommand(command);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }
    
    setError(""); // Clear previous error
    router.push(`/analysis?cmd=${encodeURIComponent(command.trim())}`);
  };

  // Validação em tempo real quando o usuário digita
  const handleCommandChange = (e) => {
    const newCommand = e.target.value;
    setCommand(newCommand);
    
    // Clear error if field is empty
    if (!newCommand.trim()) {
      setError("");
      return;
    }
    
    // Basic real-time validation (only for obvious errors)
    if (newCommand.trim().length > 5) {
      const validation = validatePowerShellCommand(newCommand);
      if (!validation.isValid && (
        validation.error.includes("plain text") || 
        validation.error.includes("description") ||
        validation.error.includes("only comments")
      )) {
        setError(validation.error);
      } else {
        setError("");
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-6 sm:mb-8 text-center px-2" style={{color: 'var(--accent)'}}>
        powershell.exposed
      </h1>
        
        <form onSubmit={handleAnalyze} className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="flex-1">
              <CommandInput
                value={command}
                onChange={handleCommandChange}
                placeholder="Type a PowerShell command (e.g., Get-Process, ls | sort, Start-Service -Name...)"
                error={error}
              />
            </div>
            
            <div className="flex-shrink-0">
              <ThemedButton
                type="submit"
                disabled={error !== ""}
                className="w-full md:w-auto px-6 py-3"
              >
                Analyze
              </ThemedButton>
            </div>
          </div>
          
          <ErrorMessage message={error} />
          <InfoMessage 
            message={!error && command.trim() === "" ? "Examples: Get-Process | Where-Object CPU -gt 100 | Select Name, CPU" : ""}
          />
        </form>

        {/* Result area */}
        <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl min-h-[80px] sm:min-h-[100px] flex items-center justify-center border rounded-lg p-4 sm:p-6" style={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)'}}>
          {result ? (
            <div className="text-center">
              <div className="mb-2">
                <span className="font-mono text-base sm:text-lg" style={{color: result.type === "safe" ? 'var(--accent)' : 'var(--secondary)'}}>
                  {result.type === "safe" ? "✓ Safe command" : "✗ Malicious command"}
                </span>
              </div>
              <div>
                <span className="font-mono text-xs sm:text-sm" style={{color: 'var(--foreground)'}}>
                  Severity: {result.severity === "leve" ? "Low" : result.severity === "médio" ? "Medium" : "Critical"}
                </span>
              </div>
            </div>
          ) : (
            <div className="font-mono text-sm sm:text-base" style={{color: 'var(--accent)'}}>
              Type a command for analysis
            </div>
          )}
        </div>
    </div>
  );
}