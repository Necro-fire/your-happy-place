import { useCallback, useEffect, useMemo, useState } from "react";
import { emptyState, type FiltersState, type PeriodPreset, type SavedPreset } from "./types";

const KEY = (mod: string) => `lv.filters.${mod}`;

export function useFilters(moduleKey: string, initial?: Partial<FiltersState>) {
  const [state, setState] = useState<FiltersState>({ ...emptyState, ...initial });
  const [presets, setPresets] = useState<SavedPreset[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY(moduleKey));
      if (raw) setPresets(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [moduleKey]);

  const persist = useCallback(
    (next: SavedPreset[]) => {
      setPresets(next);
      try {
        localStorage.setItem(KEY(moduleKey), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [moduleKey],
  );

  const savePreset = useCallback(
    (name: string) => {
      const p: SavedPreset = { id: crypto.randomUUID(), name, state };
      persist([...presets, p]);
    },
    [state, presets, persist],
  );

  const removePreset = useCallback((id: string) => persist(presets.filter((p) => p.id !== id)), [presets, persist]);
  const renamePreset = useCallback(
    (id: string, name: string) => persist(presets.map((p) => (p.id === id ? { ...p, name } : p))),
    [presets, persist],
  );
  const applyPreset = useCallback((id: string) => {
    const p = presets.find((x) => x.id === id);
    if (p) setState(p.state);
  }, [presets]);

  const reset = useCallback(() => setState({ ...emptyState, ...initial }), [initial]);

  const dateRange = useMemo(() => periodToRange(state.period, state.dateFrom, state.dateTo), [state.period, state.dateFrom, state.dateTo]);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (state.q) chips.push({ key: "q", label: `"${state.q}"`, onRemove: () => setState((s) => ({ ...s, q: "" })) });
    if (state.period !== "todos") {
      chips.push({
        key: "period",
        label: periodLabel(state.period, state.dateFrom, state.dateTo),
        onRemove: () => setState((s) => ({ ...s, period: "todos", dateFrom: undefined, dateTo: undefined })),
      });
    }
    state.status.forEach((v) =>
      chips.push({ key: `st-${v}`, label: v, onRemove: () => setState((s) => ({ ...s, status: s.status.filter((x) => x !== v) })) }),
    );
    state.categories.forEach((v) =>
      chips.push({ key: `cat-${v}`, label: v, onRemove: () => setState((s) => ({ ...s, categories: s.categories.filter((x) => x !== v) })) }),
    );
    if (state.valueMin != null)
      chips.push({ key: "min", label: `≥ R$ ${state.valueMin}`, onRemove: () => setState((s) => ({ ...s, valueMin: undefined })) });
    if (state.valueMax != null)
      chips.push({ key: "max", label: `≤ R$ ${state.valueMax}`, onRemove: () => setState((s) => ({ ...s, valueMax: undefined })) });
    Object.entries(state.extras).forEach(([k, v]) => {
      if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return;
      chips.push({
        key: `x-${k}`,
        label: `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`,
        onRemove: () => setState((s) => ({ ...s, extras: { ...s.extras, [k]: undefined } })),
      });
    });
    return chips;
  }, [state]);

  return {
    state,
    setState,
    reset,
    dateRange,
    activeChips,
    presets,
    savePreset,
    removePreset,
    renamePreset,
    applyPreset,
  };
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

export function periodToRange(p: PeriodPreset, from?: string, to?: string): { start?: Date; end?: Date } {
  const now = new Date();
  switch (p) {
    case "hoje": return { start: startOfDay(now), end: endOfDay(now) };
    case "ontem": { const y = new Date(now); y.setDate(y.getDate() - 1); return { start: startOfDay(y), end: endOfDay(y) }; }
    case "7d": { const s = new Date(now); s.setDate(s.getDate() - 7); return { start: startOfDay(s), end: endOfDay(now) }; }
    case "15d": { const s = new Date(now); s.setDate(s.getDate() - 15); return { start: startOfDay(s), end: endOfDay(now) }; }
    case "30d": { const s = new Date(now); s.setDate(s.getDate() - 30); return { start: startOfDay(s), end: endOfDay(now) }; }
    case "mes": return { start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: endOfDay(now) };
    case "mes_passado": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: startOfDay(s), end: endOfDay(e) };
    }
    case "ano": return { start: startOfDay(new Date(now.getFullYear(), 0, 1)), end: endOfDay(now) };
    case "personalizado": return { start: from ? startOfDay(new Date(from)) : undefined, end: to ? endOfDay(new Date(to)) : undefined };
    default: return {};
  }
}

export const PERIOD_LABEL: Record<PeriodPreset, string> = {
  todos: "Todos",
  hoje: "Hoje",
  ontem: "Ontem",
  "7d": "Últimos 7 dias",
  "15d": "Últimos 15 dias",
  "30d": "Últimos 30 dias",
  mes: "Este mês",
  mes_passado: "Mês passado",
  ano: "Este ano",
  personalizado: "Personalizado",
};

function periodLabel(p: PeriodPreset, from?: string, to?: string) {
  if (p === "personalizado") return `${from ?? "…"} → ${to ?? "…"}`;
  return PERIOD_LABEL[p];
}
