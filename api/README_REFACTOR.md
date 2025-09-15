# PowerShell.exposed API - Estrutura Modular

Este projeto foi refatorado para uma estrutura modular mais organizada e manutenível.

## Estrutura de Diretórios

```
api/
├── config/
│   ├── __init__.py
│   └── settings.py          # Configurações e constantes
├── middleware/
│   ├── __init__.py
│   ├── cors_middleware.py   # Middleware CORS e IP
│   └── rate_limiting.py     # Rate limiting e captcha
├── services/
│   ├── __init__.py
│   ├── session_manager.py   # Gerenciamento de sessões
│   └── powershell_analyzer.py # Análise de comandos PowerShell
├── utils/
│   ├── __init__.py
│   └── geolocation.py       # Utilitários de geolocalização
├── routes/
│   ├── __init__.py
│   └── api_routes.py        # Todas as rotas da API
├── main.py                  # Arquivo original (mantido para compatibilidade)
├── main_new.py             # Nova aplicação modular
└── requirements.txt
```

## Módulos

### config/settings.py
- Todas as configurações e constantes da aplicação
- Variáveis de ambiente
- Configurações de rate limiting, cache, CORS, etc.

### middleware/rate_limiting.py
- Funções de rate limiting global e por sessão
- Geração e verificação de captcha
- Limpeza de dados expirados

### middleware/cors_middleware.py
- Configuração do middleware CORS
- Extração do IP do cliente

### services/session_manager.py
- Criação e gerenciamento de sessões
- Cliente Supabase
- Funções auxiliares para sessões

### services/powershell_analyzer.py
- Carregamento de assinaturas do banco
- Análise de comandos PowerShell
- Cálculo de severidade e risco
- Salvamento de análises no banco

### utils/geolocation.py
- Obtenção de informações de geolocalização por IP
- Funções auxiliares para formatação

### routes/api_routes.py
- Todas as rotas da API organizadas em funções
- Endpoints para análise, captcha, sessões, etc.

## Como Usar

### Executar a aplicação modular:
```bash
python main_new.py
```

### Executar a aplicação original (mantida para compatibilidade):
```bash
python main.py
```

## Benefícios da Refatoração

1. **Organização**: Código dividido em módulos lógicos
2. **Manutenibilidade**: Mais fácil de manter e debugar
3. **Reutilização**: Funções podem ser reutilizadas em outros projetos
4. **Testabilidade**: Cada módulo pode ser testado independentemente
5. **Escalabilidade**: Estrutura preparada para crescimento

## Migração

A aplicação original (`main.py`) foi mantida para garantir compatibilidade. A nova estrutura (`main_new.py`) oferece a mesma funcionalidade com melhor organização.

Para migrar completamente:
1. Teste a nova aplicação (`main_new.py`)
2. Verifique se todas as funcionalidades estão funcionando
3. Substitua `main.py` pelo conteúdo de `main_new.py`
4. Remova `main_new.py`
