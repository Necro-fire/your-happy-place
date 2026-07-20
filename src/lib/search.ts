// Pesquisa inteligente: ignora acentos, caixa e busca por partes.

export function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Retorna true se `haystack` contém `needle` (normalizados). */
export function smartMatch(haystack: string | null | undefined, needle: string): boolean {
  const n = normalize(needle);
  if (!n) return true;
  return normalize(haystack).includes(n);
}

/**
 * Retorna true se algum dos campos de `item` (usando `fields`) casar com `q`.
 * Faz split por espaço para busca multi-termo (todos devem casar).
 */
export function smartFilter<T>(items: T[], q: string, fields: (keyof T | ((x: T) => unknown))[]): T[] {
  const query = normalize(q);
  if (!query) return items;
  const terms = query.split(/\s+/).filter(Boolean);
  return items.filter((it) => {
    const values = fields
      .map((f) => (typeof f === "function" ? (f as any)(it) : (it as any)[f]))
      .map((v) => normalize(v == null ? "" : String(v)))
      .join(" ");
    return terms.every((t) => values.includes(t));
  });
}

/** Envolve trechos que casam com `q` em <mark>. Retorna array de nós React-safe. */
export function highlight(text: string, q: string): Array<string | { mark: string }> {
  const n = normalize(q);
  if (!n) return [text];
  const src = text ?? "";
  const norm = normalize(src);
  const out: Array<string | { mark: string }> = [];
  let i = 0;
  while (i < src.length) {
    const idx = norm.indexOf(n, i);
    if (idx === -1) {
      out.push(src.slice(i));
      break;
    }
    if (idx > i) out.push(src.slice(i, idx));
    out.push({ mark: src.slice(idx, idx + n.length) });
    i = idx + n.length;
  }
  return out;
}
