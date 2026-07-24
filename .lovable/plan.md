## Escopo

Reformular três módulos do Admin Master: **Empresas** (consulta), **Licenças** (edição completa + animações) e **Assinaturas** (novo painel de gestão). Dashboard permanece intacto.

---

## 1. Empresas → painel de consulta

- Remover ações de mutação (criar, editar, excluir, mudar status, exportar) da lista atual.
- Substituir por um único botão **"Ver detalhes"** que abre um `Dialog` amplo (somente leitura).
- O detalhe carrega dados agregados em uma única server function `getTenantDetails(tenantId)`:
  - Dados do tenant: nome, empresa, CNPJ, contato, endereço, cidade/estado/CEP.
  - Proprietário: `profiles` do `owner_user_id` (nome, e-mail, telefone) + `auth.users.last_sign_in_at`.
  - Licença ativa: plano, situação, dias restantes, vencimento, cadastro.
  - Contadores: `employees`, `products`, `orders` (COUNT por `tenant_id`).
  - Cardápio: `slug`, `menu_codigo`, `public_codigo` + link público.
  - Recursos ativos derivados de `settings.config`.
- Todos os campos exibidos em blocos etiquetados, sem inputs — apenas texto e badges.

---

## 2. Licenças → animações + edição completa

### Micro-interações
Adicionar utilitário CSS `.ms-hover-lift` em `styles.css` (transform + shadow + cursor) e aplicar em:
- Cards de resumo do topo.
- Linhas da tabela (hover row lift sutil + fundo).
- Ícones de ação (scale-105 + tint).
- Botões primários e outline.

### Ajustes de ações
- Remover ícone **"Visualizar"** (olho).
- Manter **"Abrir cardápio público"** (ícone externo).
- **Lápis** passa a abrir um `Dialog` de edição em modo **"impersonação leve"**.

### Editor de licença (impersonation dialog)
Estrutura em abas dentro do dialog, cobrindo tudo que o usuário edita:

```
[Empresa] [Design] [Cardápio] [PDV] [Usuários] [Assinatura]
```

Implementação:
- Criar contexto `TenantScopeProvider` que injeta um `tenantId` override.
- Adaptar `getMySettingsRow`, `settings-io`, e queries de categorias/produtos/usuários para aceitar `tenantId` opcional (default = current tenant do usuário).
- Reaproveitar os formulários já existentes (`admin.configuracoes.empresa`, `.design`, `.pdv`, etc.) como componentes controlados que recebem o `tenantId` via contexto.
- Todas as mutações via `supabaseAdmin` **só** depois de `has_role(auth.uid(),'master')` confirmar — envolvidas em uma server function `masterUpdateTenantData({tenantId, patch, table})`.
- Bloquear campos exclusivos do Master (status da licença global, código público, `owner_user_id`) — apresentados como somente leitura.

---

## 3. Assinaturas → novo módulo

### Banco (nova migration)

```
subscription_plans        # id, slug, nome, ativo, ordem,
                          # preco_mensal, preco_trimestral, preco_anual,
                          # trial_dias, renovacao_automatica
subscription_benefits     # id, plan_id, texto, ordem, ativo
subscription_coupons      # id, codigo, nome, tipo (percentual|fixo),
                          # valor, validade, limite_uso, usos,
                          # ativo, aplicacao (auto|manual),
                          # plan_restricao (nullable)
```
- RLS: SELECT `TO authenticated` para `plans`/`benefits`; ALL apenas para `master` (via `has_role`).
- Seed inicial: planos "Básico" e "Plus" (Em breve) com os preços atuais e benefícios já listados em `admin.configuracoes.assinatura`.

### Página `/master/assinaturas` (novo arquivo)

Layout em três seções + painel de métricas no topo:

**Métricas (cards)**
- Assinantes ativos (COUNT `tenants` ativo).
- Receita mensal estimada (Σ plano×tenants ativos).
- Receita anual projetada (mensal × 12).
- Cupons ativos / expirados.
- Plano mais utilizado.

**Planos**
- Cards editáveis por plano (nome, 3 preços, trial, toggles ativo/renovação).
- Ações inline: salvar, desativar, ativar.

**Benefícios**
- Lista drag-and-drop simples (setas ↑↓) por plano.
- CRUD inline + toggle ativo.

**Cupons**
- Tabela com CRUD via dialog.
- Campos: código, nome, tipo, valor, validade, limite, usos (readonly), status, aplicação, restrição por plano.
- Filtro por status.

### Histórico
- Ler de `master_logs` filtrando `entity IN ('subscription_plan','subscription_benefit','subscription_coupon')`.

---

## 4. Sidebar do Master

- Trocar item "Configurações" (que hoje mistura tema) — o item **"Assinaturas"** ganha o slot `CreditCard` logo abaixo de Licenças.
- Manter os demais itens.

---

## Detalhes técnicos

- Novas rotas: `master.assinaturas.tsx`.
- Novos componentes: `TenantDetailsDialog`, `LicenseEditorDialog` (com abas), `TenantScopeProvider`, `PlansEditor`, `BenefitsEditor`, `CouponsManager`, `SubscriptionMetrics`.
- Novos hooks: `useTenantScope()`, `useSubscriptionPlans()`, `useCoupons()`.
- Nova server function: `src/lib/master.functions.ts` com `getTenantDetails`, `masterUpdateTenantData`, ambas com `requireSupabaseAuth` + verificação `master`.
- Utilitário CSS `.ms-hover-lift`, `.ms-hover-row`, `.ms-hover-icon` em `src/styles.css` (dentro de `.master-saas`).
- Toda navegação em tempo real via `qc.invalidateQueries` + canais Realtime já existentes.

---

## Fora de escopo

- Integração real com gateway de pagamento (Stripe/Paddle) — apenas cadastro dos planos.
- Fluxo de cobrança automática de cupons.
- Impersonação total (login como usuário) — apenas edição via server functions do Master.

---

## Ordem de implementação

1. Migration (`subscription_plans`, `subscription_benefits`, `subscription_coupons` + seed).
2. Utilitário CSS de hover no Master.
3. Empresas: substituir dialog de edição por dialog de detalhes; remover ações destrutivas.
4. Licenças: remover olho, aplicar hover, criar `LicenseEditorDialog` com as 6 abas.
5. Assinaturas: server functions + página + componentes.
6. Sidebar: adicionar rota.
7. Verificação: `tsgo`, smoke test com usuário master.
