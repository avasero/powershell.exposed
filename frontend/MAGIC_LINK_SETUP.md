# Configuração de Magic Link com Supabase

Este documento explica como configurar magic links para autenticação no PowerShell.exposed.

## 🔧 Configuração do Supabase

### 1. Configurações de Email

No painel do Supabase, vá para **Authentication > Settings > Email** e configure:

```
Site URL: http://localhost:3000  (desenvolvimento)
         https://seu-dominio.com (produção)

Redirect URLs:
- http://localhost:3000/auth/confirm
- https://seu-dominio.com/auth/confirm
```

### 2. Templates de Email

Configure os templates de email em **Authentication > Settings > Email Templates**:

#### Magic Link Template
```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>
```

#### Invite User Template
```html
<h2>You have been invited</h2>

<p>You have been invited to create a user on {{ .SiteURL }}. Follow this link to accept the invite:</p>
<p><a href="{{ .ConfirmationURL }}">Accept the invite</a></p>
```

## 🚀 Como Funciona

### Fluxo de Registro
1. Usuário insere email e username
2. Sistema chama `supabase.auth.signInWithOtp()` com `shouldCreateUser: true`
3. Supabase envia magic link por email
4. Usuário clica no link
5. Redirecionamento para `/auth/confirm`
6. Verificação do token e login automático

### Fluxo de Login
1. Usuário insere email
2. Sistema chama `supabase.auth.signInWithOtp()` com `shouldCreateUser: false`
3. Supabase envia magic link por email
4. Usuário clica no link
5. Redirecionamento para `/auth/confirm`
6. Verificação do token e login automático

## 🔐 Segurança

- Magic links expiram em 1 hora por padrão
- Tokens são verificados pelo Supabase
- URLs são protegidas contra ataques CSRF
- Redirecionamentos são validados

## 🛠️ Desenvolvimento Local

Para testar localmente:

1. Configure um SMTP de teste (ex: Mailtrap)
2. Defina as URLs corretas no Supabase:
   ```
   Site URL: http://localhost:3000
   Redirect URLs: http://localhost:3000/auth/confirm
   ```

## 📧 Configuração de SMTP

No Supabase, configure o SMTP em **Settings > Auth**:

```
SMTP Host: seu-smtp-host
SMTP Port: 587
SMTP User: seu-usuario
SMTP Pass: sua-senha
SMTP Sender Name: PowerShell.exposed
SMTP Sender Email: noreply@powershell.exposed
```

## 🐛 Troubleshooting

### Magic link não funciona
- Verifique se a Site URL está correta
- Confirme se a Redirect URL está na lista permitida
- Verifique se o SMTP está configurado corretamente

### Erro "Invalid token"
- Magic link pode ter expirado
- Token pode ter sido usado já
- URL pode ter sido corrompida

### Erro "Email link is invalid"
- Verifique se o token_hash está presente na URL
- Confirme se o type está correto (signup/magiclink)
- Verifique se a URL não foi truncada
