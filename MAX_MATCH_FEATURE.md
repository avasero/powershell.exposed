# Funcionalidade MAX_MATCH - PowerShell.exposed

## Visão Geral

A funcionalidade `max_match` permite que uma signature PowerShell detecte múltiplos matches em um comando e calcule o score total multiplicando o score base pela quantidade de matches encontrados.

## Como Funciona

### 1. Campo `max_match` no Banco de Dados

Cada signature na tabela `powershell_signatures` possui um campo `max_match` que define quantas vezes uma signature pode dar match em um comando:

```sql
-- Exemplo de signature com max_match = 3
{
  "name": "Fairly suspicious keywords",
  "basescore": 4.0,
  "max_match": 3,
  "patterns": ["(?i)shell\\.application|password|dump|Obfuscation|sploit|scanner|rundll|Reflection|icm\\s+|base64|discover-|IsInRole|Get-WinSystemLocale|..."]
}
```

### 2. Lógica de Análise

Quando uma signature é analisada:

1. **Busca por matches**: Usa `regex.finditer()` para encontrar todos os matches possíveis
2. **Limitação por max_match**: Apenas os primeiros `max_match` matches são considerados
3. **Cálculo do score**: `score_total = score_base × quantidade_matches`
4. **Detalhes dos matches**: Cada match inclui posição, texto encontrado e número do match

### 3. Exemplo Prático

**Comando**: `password Reflection base64 Get-WinSystemLocale`

**Signature**: "Fairly suspicious keywords" (score base: 4.0, max_match: 3)

**Matches encontrados**:
- Match 1: "password" (posição 0-8)
- Match 2: "Reflection" (posição 9-19)  
- Match 3: "base64" (posição 20-26)
- Match 4: "Get-WinSystemLocale" (posição 27-42) - **IGNORADO** (limite de 3 atingido)

**Score calculado**: 4.0 × 3 = **12.0**

## Implementação no Backend (Python)

### 1. Carregamento das Signatures

```python
async def load_signatures_from_db() -> list:
    # ... código existente ...
    converted_signatures.append({
        # ... outros campos ...
        "max_match": int(sig.get("max_match", 1))  # Novo campo
    })
```

### 2. Lógica de Análise

```python
for signature in signatures:
    matches_found = 0
    signature_matches = []
    
    for pattern in signature["patterns"]:
        regex = re.compile(pattern, re.IGNORECASE)
        all_matches = list(regex.finditer(command))
        
        if all_matches:
            # Limitar matches conforme max_match
            max_allowed = min(len(all_matches), signature["max_match"])
            allowed_matches = all_matches[:max_allowed]
            
            for i, match in enumerate(allowed_matches):
                matches_found += 1
                # ... processar match ...
            
            break
    
    if matches_found > 0:
        # Calcular score total
        signature_total_score = signature["score"] * matches_found
        
        detected_signatures.append({
            # ... outros campos ...
            "base_score": signature["score"],
            "matches_found": matches_found,
            "total_score": signature_total_score,
            "max_match_allowed": signature["max_match"],
            "matches_details": signature_matches
        })
```

## Implementação no Frontend (React)

### 1. Componente AnalysisCard

O componente `AnalysisCard` foi atualizado para exibir informações detalhadas dos matches:

```jsx
{matchesInfo && matchesInfo.matchesFound > 1 && (
  <div className="mb-4">
    <div className="text-sm font-mono font-bold mb-2">
      Matches Found:
    </div>
    <div className="text-sm font-mono p-3 rounded">
      <div className="mb-2">
        <span className="font-bold">Matches: </span>
        <span className="text-green-400">{matchesInfo.matchesFound}</span>
        <span className="text-gray-400"> / {matchesInfo.maxMatchAllowed}</span>
      </div>
      <div className="mb-2">
        <span className="font-bold">Score Base: </span>
        <span className="text-yellow-400">{matchesInfo.baseScore}</span>
      </div>
      <div className="mb-2">
        <span className="font-bold">Score Total: </span>
        <span className="text-red-400 font-bold">{matchesInfo.totalScore}</span>
        <span className="text-gray-400"> ({matchesInfo.baseScore} × {matchesInfo.matchesFound})</span>
      </div>
      
      {/* Detalhes dos matches individuais */}
      {matchesInfo.matchesDetails && matchesInfo.matchesDetails.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="text-xs font-bold mb-2">Match Details:</div>
          <div className="space-y-2">
            {matchesInfo.matchesDetails.map((match, idx) => (
              <div key={idx} className="text-xs p-2 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold">Match {match.match_number}:</span>
                  <span className="text-green-400">Pos {match.position?.start}-{match.position?.end}</span>
                </div>
                <div className="font-mono break-all">
                  <span className="text-yellow-400">"{match.matched_text}"</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
)}
```

### 2. Exibição das Signatures

As signatures agora mostram:
- **Score Total**: Score base × quantidade de matches
- **Quantidade de Matches**: X / Y (encontrados / permitidos)
- **Score Base**: Score individual da signature
- **Detalhes dos Matches**: Posição e texto de cada match

## Benefícios

1. **Detecção mais precisa**: Captura múltiplas instâncias de padrões suspeitos
2. **Score proporcional**: Score total reflete a severidade real do comando
3. **Transparência**: Usuário vê exatamente onde e quantas vezes cada padrão foi encontrado
4. **Flexibilidade**: Cada signature pode ter seu próprio limite de matches
5. **Performance**: Evita processamento excessivo limitando matches por signature

## Configuração

Para configurar uma signature com `max_match`:

1. **Banco de dados**: Definir o campo `max_match` na tabela `powershell_signatures`
2. **Valor padrão**: Se não especificado, `max_match = 1` (comportamento original)
3. **Recomendação**: Usar valores entre 1-5 para evitar scores excessivamente altos

## Exemplo de Uso

```sql
-- Signature que detecta múltiplas palavras suspeitas
INSERT INTO powershell_signatures (
  name, 
  description, 
  patterns, 
  basescore, 
  max_match, 
  severity
) VALUES (
  'Suspicious Keywords',
  'Detects multiple suspicious keywords in PowerShell commands',
  '["(?i)password|dump|base64|Reflection"]',
  3.0,
  3,
  'medium'
);
```

Com esta signature, o comando `password dump base64` resultaria em:
- **Matches**: 3/3
- **Score Base**: 3.0
- **Score Total**: 9.0 (3.0 × 3)
