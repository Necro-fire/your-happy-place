# Mapeamento Completo de Funcionalidades

> Plataforma de gestão comercial **universal** (restaurantes, lojas, mercados, serviços). Este documento define a responsabilidade de cada elemento do sistema — menu, páginas, botões, ações e configurações — e sua conexão com o backend Supabase.

---

## Fluxo Geral

```
Usuário → Login (Supabase Auth) → Verificação de Permissões (user_roles)
       → Dashboard → Módulos (CRUD + Realtime) → Banco Supabase
       → Sincronização em tempo real (postgres_changes) → Relatórios
```

- **Autenticação:** Supabase Auth (email/senha + Google opcional).
- **Autorização:** tabela `user_roles` + função `has_role()` (SECURITY DEFINER).
- **Sincronização:** hook `useRealtimeSync` invalida caches React Query via `postgres_changes`.
- **Storage:** bucket privado `product-images` com URLs assinadas.

---

## 1. Estrutura Principal

### 1.1 Sidebar (`src/components/admin/AdminSidebar.tsx`)

| Elemento | Responsabilidade | Permissão |
|---|---|---|
| Logo / Nome do estabelecimento | Lê `settings.nome_fantasia`. Clique → Dashboard. | Todos |
| Busca de menu | Filtra itens visíveis em tempo real. | Todos |
| Grupos (labels) | Apenas rótulos visuais — não clicáveis. | — |
| Itens de menu | Navegação para módulos. Highlight ativo. | Conforme `app_role` |
| Rodapé (perfil) | Avatar, nome do usuário, logout. | Todos |

### 1.2 Topbar

- Notificações, atalho para configurações, alternância de tema (sol/lua/auto).

---

## 2. Dashboard (`/admin`)

**Objetivo:** visão geral da operação em tempo real.

| Componente | Origem dos dados | Ação |
|---|---|---|
| Card Faturamento do dia | `orders` (status pago, `created_at::date = today`) | — |
| Card Vendas realizadas | count `orders` do dia | Link → `/admin/vendas` |
| Card Pedidos | count `orders` (todos status) | Link → `/admin/pedidos` |
| Card Ticket médio | avg(`orders.total`) | — |
| Card Produtos vendidos | sum(`order_items.quantity`) | — |
| Card Estoque crítico | `products.stock <= stock_min` | Link → `/admin/estoque` |
| Gráfico Vendas por período | `orders` agregado por dia/hora | Filtro 7/30/90 dias |
| Gráfico Comparativo | período atual vs anterior | — |
| Top produtos | `order_items` agrupados | — |
| Formas de pagamento | `orders.payment_method` | — |
| Atividades recentes | `master_logs` / `stock_movements` | — |
| Ações rápidas | Nova venda, Novo produto, Abrir caixa, Nova despesa | Conforme permissão |

---

## 3. PDV (`/admin/pdv`)

**Objetivo:** operar vendas com máxima velocidade.

| Área | Elementos | Ações |
|---|---|---|
| Header adaptativo | Tipo de atendimento (Balcão, Mesa, Delivery, Retirada) | Botão "Editar dados" abre diálogo dinâmico |
| Busca | Nome, código interno, código de barras, categoria | Debounce + busca inteligente (acentos/case) |
| Grade de produtos | Card 1:1 imagem + nome (2 linhas) + preço + estoque | Clique adiciona ao carrinho |
| Carrinho | Itens, qtd, remover, desconto, obs, complementos, combos | Recalcula total |
| Pagamento | Dinheiro (troco), Pix, Cartão débito/crédito, Outros | Split de pagamento |
| Ações extras | Suspender venda, Retomar, Dividir conta | Persiste em `suspended_sales` |
| Finalização | Cria `orders` + `order_items`, atualiza `products.stock`, gera `financeiro_movimentos`, imprime cupom | Realtime dispara Dashboard |

**Regras:**
- Não permite abrir 2 pedidos simultâneos para a mesma mesa.
- Bloqueia venda sem estoque (configurável em Config → PDV).

---

## 4. Produtos (`/admin/catalogo`)

| Ação | Detalhe | Tabela |
|---|---|---|
| Listar / filtrar / pesquisar | Grid + tabela, ordenação alfabética | `products` |
| Cadastrar / editar | Nome, descrição, categoria, imagem (1:1 WebP), código, código de barras, preço, custo, margem auto, estoque inicial/mínimo, unidade, ativo, controla estoque, permite venda sem estoque | `products` |
| Excluir / desativar | Soft delete via `active=false` | — |
| Upload imagem | `ProductImageUploader` → bucket `product-images` | Storage |

---

## 5. Categorias (`/admin/categorias`)

- Criar, editar, excluir, ordenar, definir ícone (`IconPicker`) e cor, ativar/desativar.
- Ao excluir categoria com produtos: solicita reatribuição.
- Tabela: `categories`.

---

## 6. Estoque (`/admin/estoque`)

| Bloco | Função |
|---|---|
| Situação atual | Disponível, acabando (≤ mínimo), sem estoque |
| Entrada | Compra, ajuste positivo, devolução |
| Saída | Venda (auto via PDV), perda, ajuste negativo |
| Histórico | `stock_movements`: data, usuário, produto, quantidade, motivo |

---

## 7. Caixa (`/admin/caixa`)

| Etapa | Ação | Tabela |
|---|---|---|
| Abertura | Valor inicial + responsável | `cash_sessions` |
| Operação | Sangria, reforço, entradas/saídas manuais | `cash_movements` |
| Fechamento | Total esperado (calculado) vs informado → diferença | `cash_sessions` |

Somente uma sessão aberta por usuário/filial.

---

## 8. Vendas (`/admin/vendas`)

- Histórico com filtros avançados (`FiltersDrawer`): período, forma de pagamento, operador, status.
- Detalhe: itens, pagamentos, cliente, observações.
- Ações: reimprimir cupom, cancelar (com motivo), devolver produto (repõe estoque).

---

## 9. Clientes (`/admin/clientes`)

- Cadastro: código único `CL-XXXXX`, nome, telefone, documento, endereço, observações.
- Deduplicação por telefone/documento.
- Histórico: pedidos, frequência, ticket médio, valor total gasto.
- Tabela: `customers` (+ `clients` legado quando aplicável).

---

## 10. Fornecedores (`/admin/fornecedores`)

- Cadastro completo, contatos, produtos vinculados, histórico de compras.
- Tabela: `suppliers`.

---

## 11. Compras (`/admin/compras`)

- Nova compra → selecionar fornecedor → adicionar produtos → valores → confirmar.
- Ao confirmar: cria entrada em `stock_movements` e despesa em `financeiro_movimentos`.

---

## 12. Financeiro (`/admin/financeiro`)

| Tipo | Fonte | Automação |
|---|---|---|
| Receita | Vendas (auto) + entradas manuais | Trigger no fechamento da venda |
| Despesa | Contas, custos, pagamentos, compras | Manual ou via módulo Compras |
| Relatórios | Lucro, gastos, fluxo de caixa | Agregação por período |

Tabela: `financeiro_movimentos`.

---

## 13. Relatórios (`/admin/relatorios`)

- **Vendas:** por período, produto, usuário, forma de pagamento.
- **Estoque:** produtos parados, mais vendidos, movimentações.
- **Financeiro:** receita, despesas, lucro, DRE simplificado.
- Exportação CSV/PDF.

---

## 14. Usuários e Permissões (`/admin/configuracoes/usuarios`)

**Regra crítica:** roles em tabela separada `user_roles` (NUNCA em `profiles`).

| Role | Acesso |
|---|---|
| `owner` | Total, inclui Configurações e Master (se master flag) |
| `admin` | Total exceto master |
| `gerente` | Relatórios, Caixa, Produtos, Estoque, Financeiro |
| `operador` | PDV, Clientes, Vendas próprias |

Ações: criar, editar, bloquear, excluir, redefinir senha.

---

## 15. Configurações (`/admin/configuracoes`)

Hub com 25 seções na sidebar interna. Cada seção grava em `settings` (JSONB por bloco).

| Seção | Responsabilidade |
|---|---|
| **Empresa** | Nome comercial, logo, CNPJ/CPF, endereço, telefone, segmento |
| **PDV** | Impressão auto, exibição de produtos, permitir desconto, venda sem estoque, métodos de pagamento habilitados |
| **Financeiro** | Moeda, formatação, taxas de cartão, categorias de receita/despesa |
| **Aparência** | Tema Claro/Escuro/Auto (sol/lua), 4 presets, paleta customizável OKLCH, prévia ao vivo |
| **Impressão** | Modelo cupom, impressora padrão, tamanho papel (58/80mm/A4), cabeçalho, rodapé |
| **Segurança** | Timeout de sessão, política de senha, 2FA (futuro), log de atividades |
| **Sistema** | Backup, integrações, atualizações, preferências gerais |
| **Notificações** | WhatsApp oficial de suporte, e-mails transacionais |
| **QR Codes** | Atalho para `/admin/qrcodes` |
| **Assinatura** | Plano atual, comparativo Básico vs Plus, simulação de renovação |
| **Filiais** | Multi-loja (`filiais`) |
| **Categorias financeiras** | Personalização de plano de contas |
| **Impostos** | Regras fiscais |
| ...demais | Integrações, delivery, cardápio público, etc. |

---

## 16. Suporte (`/admin/suporte`)

- **Cliente vê:** "Como podemos ajudar?" (categorias com soluções guiadas) + "Meus chamados".
- Fluxo: escolher categoria → seguir solução automática → "Resolveu?" → se não, encaminha para WhatsApp oficial (configurado em Notificações).
- Tabelas: `support_tickets`, `support_categories`.

---

## 17. Perfil (`/admin/perfil`)

- Editar dados pessoais, avatar.
- Trocar senha (via Supabase Auth).
- Visualizar permissões atribuídas (read-only).
- Encerrar sessão.

---

## 18. Módulo Master (`/master`)

Painel exclusivo do desenvolvedor/SaaS admin.

- **Tenants:** clientes SaaS (`tenants`).
- **Licenças:** planos, vigência, renovação (`licenses`).
- **Logs:** `master_logs` (auditoria de ações críticas).
- Acesso via role especial + flag master.

---

## Arquitetura Supabase — Checklist

| Item | Status |
|---|---|
| RLS habilitado em todas as tabelas públicas | ✅ |
| GRANTs explícitos por tabela | ✅ |
| `user_roles` + `has_role()` SECURITY DEFINER | ✅ |
| Realtime via `postgres_changes` | ✅ (`useRealtimeSync`) |
| Storage privado com signed URLs | ✅ (`product-images`) |
| Server functions com `requireSupabaseAuth` | ✅ |
| Backups automatizados | ⏳ (Cloud gerenciado) |
| Índices de relatórios (períodos/agregações) | ⏳ recomendado |
| Webhooks públicos em `/api/public/*` | ✅ padrão |

---

## Critérios de Aceitação

- ✅ Todo item de menu tem função e permissão definidas.
- ✅ Toda tela tem objetivo, ações e conexões documentados.
- ✅ Toda configuração tem responsabilidade clara.
- ✅ Sistema neutro por segmento (Store icon + `nome_fantasia`).
- ✅ Nenhum módulo órfão — todos conectados a `settings`, `user_roles` ou fluxo canônico de venda.
- ✅ Arquitetura preparada para escalar em Supabase (RLS, Realtime, Storage, Edge/Server Functions).
