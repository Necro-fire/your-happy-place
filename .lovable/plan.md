## Fluxo de Alteração de Senha Segura

Implementar substituição da seção "Alterar senha" em **Configurações → Dados Pessoais** por um fluxo em 3 etapas com verificação por e-mail, política forte e invalidação de sessões.

### Etapa 1 — Solicitar código
- Usuário clica em "Alterar senha" → gera código de 6 dígitos aleatório.
- Código armazenado com hash em nova tabela `password_change_codes` (user_id, code_hash, expires_at, attempts, used_at, created_at).
- Expira em 10 minutos, máximo 5 tentativas, invalida códigos anteriores do mesmo user_id ao gerar um novo.
- Rate limit: reenvio bloqueado por 60s.
- Envio do código por e-mail via template scaffold de auth (React Email), com aviso "se você não pediu, ignore".

### Etapa 2 — Validar código
- Server function verifica hash, expiração, tentativas.
- Erros genéricos ("Código inválido ou expirado") para não vazar estado.
- Após validação, retorna um `change_token` (JWT curto de 5 min) assinado no servidor.

### Etapa 3 — Nova senha
- UI com indicador de força + checklist de requisitos ao vivo:
  - mín. 10 caracteres, maiúscula, minúscula, número, especial
  - sem espaços nas bordas
  - não pode conter e-mail/nome
  - não pode ser igual à senha atual (verificado no servidor via `signInWithPassword` interno)
  - bloqueio de senhas comuns (lista curta local)
- Server function valida `change_token`, política, unicidade vs. atual → `supabaseAdmin.auth.admin.updateUserById` + `signOut(scope: 'global')` para revogar todas as sessões.
- Envia e-mail de notificação "sua senha foi alterada" com CTA para suporte.
- Registra em `audit_logs` (solicitação, envio, validação, sucesso, falhas, excesso).

### Backend
- Migration:
  - Tabela `password_change_codes` com RLS (somente service_role).
  - Trigger para limpar códigos expirados/usados (opcional cleanup).
- 3 server functions autenticadas em `src/lib/password-change.functions.ts`:
  - `requestPasswordChangeCode` — gera código, envia e-mail, log auditoria.
  - `verifyPasswordChangeCode` — valida, retorna change_token assinado.
  - `changePassword` — valida token+política, atualiza via admin, revoga sessões, envia notificação, log.
- Secret novo: `PASSWORD_CHANGE_TOKEN_SECRET` (gerado automaticamente).

### Frontend
- Novo componente `PasswordChangeDialog.tsx` (Sheet/Dialog em 3 passos com stepper).
- Substitui a seção atual em `admin.configuracoes.perfil.tsx`.
- Após sucesso: toast → `supabase.auth.signOut()` → redirect `/auth` (nova senha exigida em novo login).

### E-mails
- Se templates de auth ainda não existirem, chamar `email_domain--scaffold_auth_email_templates`. Criar dois templates customizados:
  - `password-change-code` (código de 6 dígitos)
  - `password-changed-notification` (notificação pós-alteração)

### Segurança adicional
- Rate limit por user_id: máx. 5 códigos/hora.
- Bloqueio de 15 min após 5 tentativas inválidas seguidas.
- HTTPS já garantido pelo hosting.
- Nunca revelar se o e-mail existe (fluxo já autenticado, ok).
- Registrar IP e user-agent nos logs.

### Critérios de aceitação
- Só altera senha após validar código enviado por e-mail.
- Nova senha ≠ atual, atende política, indicador de força visível.
- Todas as sessões antigas encerradas (usuário deslogado e obrigado a novo login).
- E-mail de notificação enviado após sucesso.
- Todas as validações duplicadas no servidor.
- Eventos registrados em audit_logs.

Confirma para eu implementar? (Vai envolver 1 migration + secret novo + scaffold de e-mails se ainda não houver.)
