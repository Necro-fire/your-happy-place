## Objetivo

Transformar o sistema (hoje single-tenant global) em **multi-tenant real**: cada usuário/empresa opera em um tenant isolado, com um único cardápio automático e URL pública exclusiva `/menu/:codigo`. A rota `/` deixa de exibir cardápio e passa a ser landing com CTA de login.

## Escopo confirmado

- Isolamento em **todos** os módulos administrativos (produtos, categorias, pedidos, PDV, caixa, estoque, financeiro, clientes, funcionários, mesas, etc.).
- URL pública no formato `/menu/:codigo` (código curto autogerado, ex.: `AB12CD`).
- `/` vira landing pública com botão "Entrar" (sem cardápio agregado).

## Arquitetura

### 1. Tenants
- Já existe a tabela `tenants` (usada pelo Master). Reaproveitar como container de empresa.
- Adicionar coluna `owner_user_id uuid` (o usuário dono) e `menu_codigo text unique` (código de 6 chars, gerado auto: `AB12CD`).
- Trigger em `auth.users` (via `handle_new_user` já existente) cria automaticamente: 1 tenant + 1 profile + role `owner` + settings-shell inicial.

### 2. Coluna `tenant_id` em todas as tabelas de domínio
Aplicar `tenant_id uuid not null references tenants(id) on delete cascade` em:
`products, categories, complement_groups, complements, combos, combo_items, product_complement_groups, orders, order_items, order_payments, cash_sessions, cash_movements, stock_movements, suppliers, customers, clients, employees, restaurant_tables, table_history, financeiro_movimentos, producao_orders, service_orders, support_tickets, support_ratings, settings, company_settings, role_permissions, audit_logs`.

Estratégia de backfill: cria 1 tenant "Legacy" para o owner atual (`pa123@gmail.com`) e migra todas as linhas existentes para ele.

### 3. RLS por tenant
Função `SECURITY DEFINER`:
```sql
current_tenant_id() → uuid  -- lê do user_roles.tenant_id do auth.uid()
```
Substituir todas as policies das tabelas acima por: `USING (tenant_id = current_tenant_id())`. Master (role `master`) mantém acesso via `has_role(auth.uid(),'master')`.

`user_roles` ganha `tenant_id` para permitir que um usuário pertença a um tenant específico como owner/staff.

### 4. Cardápio público `/menu/:codigo`
- Nova rota `src/routes/menu.$codigo.tsx` (SSR-on, público).
- Server function `getPublicMenu(codigo)` com client publishable + policies `TO anon` restritas: SELECT em `products/categories/settings` filtrado por `tenants.menu_codigo = :codigo` e apenas `ativo=true`.
- Herda todo o design/carrossel/banner do cardápio atual, mas escopado ao tenant.

### 5. Landing `/`
Substituir cardápio agregado por landing simples: hero, feature chips, botões "Entrar" e "Ver cardápio de exemplo". Zero fetch de produtos globais.

### 6. Fluxos admin
- Frontend: nenhuma UI nova. Todas as queries continuam iguais — a RLS faz o filtro. Remover apenas `.eq('owner'...)` residuais se existirem.
- Master panel: lista tenants (já funciona) e permite ver `menu_codigo`.
- Configurações → Empresa: mostra o `menu_codigo` e link "Copiar URL pública".

## Migração de dados

1. Criar tenant "Empresa Principal" com `owner_user_id = pa123@gmail.com`.
2. `UPDATE ... SET tenant_id = <esse tenant>` em todas as tabelas existentes.
3. Depois do backfill, aplicar `NOT NULL` nas colunas `tenant_id`.
4. Gerar `menu_codigo` para o tenant existente.

## Impacto no que já está construído

- **Preservado 100%**: Dashboard, PDV, Caixa, Pedidos, Vendas, Estoque, Financeiro, Produtos, Categorias, Clientes, Funcionários, Mesas, KDS, QR codes, Configurações, Suporte, Design da Empresa, Assinatura, Aparência.
- **Alterado**: rota `/` (vira landing), rotas públicas antigas de cardápio agregado desativadas — cardápio real vive em `/menu/:codigo`.
- **Removido/ajustado**: fetches globais em `src/routes/index.tsx`, `carrinho.tsx`, `checkout.tsx` (checkout público passa a exigir contexto de tenant — via `sessionStorage` ao entrar no menu do tenant).

## Passos de implementação

1. **Migration 1** — adicionar `owner_user_id` + `menu_codigo` em `tenants`; função `gen_menu_codigo()`; função `current_tenant_id()`; adicionar `tenant_id` em `user_roles`.
2. **Migration 2** — adicionar `tenant_id` (nullable) em todas as tabelas de domínio + índices.
3. **Migration 3** — criar tenant legado, backfill de todas as tabelas, `NOT NULL`.
4. **Migration 4** — recriar policies RLS baseadas em `current_tenant_id()`; policies `TO anon` restritas para o cardápio público (via `menu_codigo`).
5. **Migration 5** — atualizar `handle_new_user()` para provisionar tenant + role owner + settings iniciais em novos signups.
6. **Frontend** — reescrever `src/routes/index.tsx` como landing; criar `src/routes/menu.$codigo.tsx` com fetch público; mover lógica atual de carrinho/checkout para usar `codigo` da URL; adicionar bloco "URL pública" em `admin.configuracoes.empresa.tsx`.

## Riscos

- Grande volume de policies alteradas — risco de quebrar leituras existentes; mitigado testando com o owner atual imediatamente após a migração.
- Checkout público precisa carregar contexto de tenant a partir da URL; sem isso, pedidos anônimos ficariam sem tenant. Solução: `menu_codigo` é fonte de verdade no fluxo público e vai no payload do pedido.

## Fora de escopo

- Convite/gestão de múltiplos funcionários por tenant via UI (já existe estrutura em `user_roles`; UI de convites fica para depois).
- Domínios customizados por tenant.
- Billing por tenant (o módulo Assinatura permanece como está).

Confirma que posso executar?