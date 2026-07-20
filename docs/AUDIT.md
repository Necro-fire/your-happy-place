# Auditoria Geral do Sistema

Documento vivo com o mapa completo de rotas, módulos, conexões e permissões
da plataforma. O sistema é **genérico** — atende restaurantes, padarias,
lanchonetes, pizzarias, mercados, lojas e pequenos comércios em geral. Não
há lógica hard-coded para um único segmento; o nome comercial, logo e cores
vêm de **Configurações → Empresa/Aparência**.

Backend: **Supabase** (Lovable Cloud). Todas as tabelas ficam sob RLS,
com `user_roles` (`app_role`) + função `has_role` para autorização.
Sincronização entre módulos: `useRealtimeSync()` (invalidação de cache via
`postgres_changes`).

---

## 1. Mapa de rotas

### Públicas
| Rota | Arquivo | Função |
| --- | --- | --- |
| `/` | `src/routes/index.tsx` | Cardápio digital (catálogo público) |
| `/carrinho` | `carrinho.tsx` | Carrinho de compras |
| `/checkout` | `checkout.tsx` | Finalização de pedido público |
| `/pedido/$numero` | `pedido.$numero.tsx` | Acompanhamento de pedido |
| `/mesa/$numero` | `mesa.$numero.tsx` | Entrada da mesa (cardápio / meus pedidos) |
| `/mesa/$numero/pedidos` | `mesa.$numero.pedidos.tsx` | Pedidos da mesa em tempo real |
| `/auth` | `auth.tsx` | Login/cadastro |
| `/reset-password` | `reset-password.tsx` | Reset de senha |
| `/sitemap.xml` | `sitemap[.]xml.ts` | Sitemap SEO |

### Autenticadas — `/admin/*` (`_authenticated/route.tsx` gate)
| Rota | Módulo |
| --- | --- |
| `/admin` | Dashboard |
| `/admin/pdv` | PDV — Ponto de Venda |
| `/admin/pedidos` | Pedidos |
| `/admin/mesas` | Mesas |
| `/admin/vendas` | Histórico de vendas |
| `/admin/caixa` | Caixa |
| `/admin/catalogo` | Produtos e Categorias |
| `/admin/kds` | KDS Cozinha |
| `/admin/qrcodes` | QR Codes |
| `/admin/usuarios` | Usuários |
| `/admin/suporte` | Suporte |
| `/admin/configuracoes` + 25 sub-rotas | Central de Configurações |

### Master (`role = master`)
| Rota | Função |
| --- | --- |
| `/master` | Dashboard da plataforma |
| `/master/clientes` | Tenants |
| `/master/licencas` | Licenças e planos |
| `/master/logs` | Auditoria master |

---

## 2. Módulos e responsabilidades

Cada módulo abaixo segue o padrão: **responsabilidade → funcionalidades →
conexões → tabelas Supabase**.

### Dashboard (`/admin`)
- **Responsabilidade:** visão consolidada.
- **Funcionalidades:** faturamento, pedidos, top produtos, estoque baixo,
  atividade recente.
- **Conexões:** PDV, Caixa, Produtos, Estoque, Relatórios.
- **Dados:** `orders`, `order_items`, `products`, `stock_movements`,
  `cash_sessions`, `financeiro_movimentos`.

### PDV (`/admin/pdv`)
- **Responsabilidade:** venda rápida.
- **Funcionalidades:** grade 1:1 de produtos, complementos, combos,
  descontos, múltiplos pagamentos, tipos de atendimento (Balcão / Mesa /
  Delivery / Retirada), impressão térmica.
- **Conexões:** Produtos, Estoque, Clientes, Caixa, Financeiro.
- **Dados:** `products`, `complements`, `combos`, `orders`, `order_items`,
  `order_payments`, `cash_sessions`, `customers`, `restaurant_tables`.

### Pedidos (`/admin/pedidos`)
- **Responsabilidade:** gestão de todos os pedidos abertos e fechados.
- **Filtros:** status, tipo, período, canal.
- **Conexões:** PDV, KDS, Cardápio Público, Delivery.

### Mesas (`/admin/mesas`)
- **Responsabilidade:** ocupação e status em tempo real.
- **Funcionalidades:** abrir/transferir/juntar mesas, iniciar comanda,
  ver pedidos.
- **Dados:** `restaurant_tables`, `orders`, `table_history`.

### Vendas (`/admin/vendas`)
- **Responsabilidade:** histórico e relatório financeiro de vendas.
- **Filtros:** período, forma de pagamento, operador, canal.

### Caixa (`/admin/caixa`)
- **Responsabilidade:** abertura, sangria, suprimento, fechamento.
- **Dados:** `cash_sessions`, `cash_movements`.

### Catálogo (`/admin/catalogo`)
- **Responsabilidade:** CRUD de produtos, categorias, combos, complementos.
- **Funcionalidades:** upload 1:1 (bucket `product-images` privado, signed URLs),
  código interno, código de barras, ativo/inativo.
- **Dados:** `products`, `categories`, `combos`, `combo_items`,
  `complement_groups`, `complements`, `product_complement_groups`.

### KDS (`/admin/kds`)
- **Responsabilidade:** tela de cozinha/produção com fluxo de status.
- **Dados:** `orders`, `order_items`, `producao_orders`.

### QR Codes (`/admin/qrcodes`)
- **Responsabilidade:** gerar QR de mesas e do cardápio.
- **Conexões:** Mesas, Cardápio Público.

### Usuários (`/admin/usuarios`) + Permissões (`/admin/configuracoes/usuarios`)
- **Responsabilidade:** convidar usuários, atribuir papéis, editar
  permissões por módulo.
- **Dados:** `profiles`, `user_roles` (enum `app_role`), `role_permissions`,
  `employees`.

### Suporte (`/admin/suporte`)
- **Responsabilidade:** central de ajuda oficial + abertura de chamados.
- **Dados:** `support_categories`, `support_problems`, `support_tickets`,
  `support_ratings`.

### Configurações (`/admin/configuracoes/*`)
25 seções agrupadas em Empresa, Operação, Financeiro, Clientes & Marketing,
Comunicação e Sistema. Persistidas em `settings` (JSONB por seção) +
`company_settings`, `filiais`.

Seções: empresa, assinatura, usuários, aparência, produtos, pedidos, pdv,
mesas, delivery, estoque, impressoes, caixa, financeiro, dashboard,
clientes, fidelidade, marketing, notificacoes, area-publica, qrcodes,
filiais, seguranca, auditoria (`audit_logs`), backup (export JSON),
regiao, sistema.

### Módulos futuros / stubs
- **Fornecedores** (`suppliers`): tabela pronta, UI pendente.
- **Compras**: derivada de `stock_movements` (tipo "entrada") — módulo
  dedicado pendente.
- **Financeiro completo**: `financeiro_movimentos` já suporta receitas,
  despesas e conciliação — UI em `ComingSoon`.
- **Relatórios**: página consolidada pendente (dados já existem).

---

## 3. Fluxo canônico de uma venda

```
Usuário autenticado
   ↓ (user_roles.has_role)
PDV → adiciona produto (products/complements/combos)
   ↓ finaliza
INSERT orders + order_items + order_payments
   ↓ trigger de estoque
UPDATE products.estoque_atual + INSERT stock_movements
   ↓ caixa aberto
INSERT cash_movements (entrada)
   ↓ realtime (postgres_changes)
useRealtimeSync → invalida React Query
   ↓
Dashboard, Vendas, Caixa e Relatórios refletem imediatamente
```

---

## 4. Permissões (`app_role`)

- `master`: acesso a `/master/*` (tenants, licenças, logs da plataforma).
- `owner`: acesso total ao tenant.
- `manager`: operações + relatórios, sem faturamento/licença.
- `cashier`: PDV, Caixa, Pedidos.
- `kitchen`: KDS.
- `waiter`: Mesas + PDV limitado.

Toda tabela `public.*` tem RLS + GRANT explícito. Papéis conferidos via
`public.has_role(auth.uid(), 'x')` (SECURITY DEFINER).

---

## 5. Estado da migração para Supabase

Supabase **já é** o backend. Checklist arquitetural:

- [x] Auth (email/senha + Google, broker Lovable).
- [x] RLS em todas as tabelas `public.*`.
- [x] `user_roles` separado do `profiles` (anti privilege-escalation).
- [x] Realtime configurado (`useRealtimeSync`).
- [x] Storage: `product-images` (privado, signed URLs), `avatars`, `logos`.
- [x] Server functions (`createServerFn` + `requireSupabaseAuth`) para
      operações sensíveis; `client.server` apenas em `.server.ts` /
      handlers com dynamic import.
- [x] Auditoria (`audit_logs`, `master_logs`).
- [ ] **Pendências recomendadas** antes de escalar:
  - Módulo Fornecedores/Compras (UI).
  - Página consolidada de Relatórios.
  - Trigger de `updated_at` em todas as tabelas restantes.
  - Índices em `orders(created_at)`, `stock_movements(product_id, created_at)`,
    `financeiro_movimentos(data)` para relatórios.
  - Backup automático agendado (pg_cron → server route em `/api/public/backup`).

---

## 6. Regras de plataforma genérica

- **Branding:** sidebar lê `settings.nome_comercial` (fallback "Meu Negócio").
  Logo/cores em Configurações → Aparência (OKLCH, tema claro/escuro/auto).
- **Vocabulário:** nomes de módulos são genéricos ("Mesas" pode ser
  desativado por segmento; "KDS" só aparece para negócios com produção).
- **Segmentos suportados:** restaurantes, padarias, lanchonetes,
  pizzarias, mercados, lojas, prestadores.
- **Nenhuma rota órfã:** todas as rotas listadas acima têm componente e
  destino de navegação.
