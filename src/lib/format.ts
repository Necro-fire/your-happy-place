export const fmtMoney = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

export const fmtDate = (d: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(d));

export const fmtDateOnly = (d: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(d));

export const fmtTime = (d: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(d));

/** Número simples pt-BR (ex.: 1.250) */
export const fmtNumber = (v: number | null | undefined, opts?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat("pt-BR", opts).format(Number(v ?? 0));

/** Quantidade genérica (0 casas por padrão) */
export const fmtQty = (v: number | null | undefined, dec = 0) =>
  fmtNumber(v, { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** Peso em kg com 3 casas (ex.: 0,250 kg) */
export const fmtWeight = (v: number | null | undefined) =>
  `${fmtNumber(v, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;

/** Porcentagem 0..100 (ex.: 15,5%) */
export const fmtPercent = (v: number | null | undefined, dec = 1) =>
  `${fmtNumber(v, { minimumFractionDigits: 0, maximumFractionDigits: dec })}%`;

/** Formata telefone bruto (só dígitos) em (00) 00000-0000 */
export const fmtPhone = (v: string | null | undefined) => {
  const d = (v ?? "").replace(/\D+/g, "");
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return v ?? "";
};

/** Formata CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) automaticamente */
export const fmtDoc = (v: string | null | undefined) => {
  const d = (v ?? "").replace(/\D+/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return v ?? "";
};

/** Formata CEP (00000-000) */
export const fmtCEP = (v: string | null | undefined) => {
  const d = (v ?? "").replace(/\D+/g, "");
  if (d.length === 8) return d.replace(/(\d{5})(\d{3})/, "$1-$2");
  return v ?? "";
};

export const statusLabel: Record<string, string> = {
  novo: "Novo Pedido",
  confirmado: "Confirmado",
  em_preparo: "Em Produção",
  pronto: "Pronto",
  saiu_entrega: "Em Rota de Entrega",
  entregue: "Pedido Entregue",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export const statusColor: Record<string, string> = {
  novo: "bg-chart-4/20 text-chart-4 border border-chart-4/40",
  confirmado: "bg-chart-4/20 text-chart-4",
  em_preparo: "bg-warning text-warning-foreground",
  pronto: "bg-accent text-accent-foreground",
  saiu_entrega: "bg-chart-4 text-white",
  entregue: "bg-success text-success-foreground",
  finalizado: "bg-success text-success-foreground",
  cancelado: "bg-destructive/20 text-destructive",
};

export const paymentLabel: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  credito: "Crédito",
  debito: "Débito",
  vale: "Vale",
  multiplo: "Múltiplo",
  nao_definido: "—",
};

export const tipoLabel: Record<string, string> = {
  retirada: "Retirada",
  local: "Mesa",
  entrega: "Entrega",
};

/** Cor por categoria de pedido (Mesa azul, Entrega verde, Retirada laranja) */
export const tipoColor: Record<string, string> = {
  local: "bg-chart-4/15 text-chart-4 border-chart-4/40",
  entrega: "bg-success/15 text-success border-success/40",
  retirada: "bg-warning/20 text-warning-foreground border-warning/40",
};

export const tipoDot: Record<string, string> = {
  local: "bg-chart-4",
  entrega: "bg-success",
  retirada: "bg-warning",
};

export const origemLabel: Record<string, string> = {
  pdv: "PDV",
  mesa: "Mesa",
  online: "Online",
};
