// Ordenação alfabética padrão pt-BR (acento-insensível, caixa-insensível).

const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

export function sortAlpha<T>(items: T[], key: keyof T | ((x: T) => string | null | undefined)): T[] {
  const get = (x: T) =>
    (typeof key === "function" ? (key as any)(x) : (x as any)[key]) ?? "";
  return [...items].sort((a, b) => collator.compare(String(get(a)), String(get(b))));
}

/** Ordena por nome quando existir; útil como default. */
export function sortByName<T extends { nome?: string | null; name?: string | null }>(items: T[]): T[] {
  return sortAlpha(items, (x) => (x.nome ?? x.name ?? "") as string);
}

export { collator as ptCollator };
