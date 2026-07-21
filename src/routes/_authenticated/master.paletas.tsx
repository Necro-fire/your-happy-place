import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Palette as PaletteIcon, Sparkles, AlertTriangle, RotateCcw, Save } from "lucide-react";
import {
  PRESETS,
  applyTheme,
  loadStored,
  saveStored,
  resolveMode,
  type Palette,
} from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/master/paletas")({
  component: PaletasPage,
});

const FIELDS: { key: keyof Palette; label: string; help?: string }[] = [
  { key: "primary", label: "Cor primária", help: "Botões, links e destaques" },
  { key: "secondary", label: "Cor secundária" },
  { key: "accent", label: "Cor de destaque (Accent)" },
  { key: "ring", label: "Cor de foco (Ring)" },
  { key: "sidebar", label: "Cor da sidebar" },
  { key: "sidebar-primary", label: "Ativo na sidebar" },
];

// ---- Contrast helpers ------------------------------------------------------
function cssToRgb(color: string): [number, number, number] | null {
  if (typeof document === "undefined") return null;
  const el = document.createElement("div");
  el.style.color = color;
  el.style.display = "none";
  document.body.appendChild(el);
  const m = getComputedStyle(el).color.match(/\d+(\.\d+)?/g);
  document.body.removeChild(el);
  if (!m || m.length < 3) return null;
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}
function luminance([r, g, b]: [number, number, number]) {
  const conv = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * conv(r) + 0.7152 * conv(g) + 0.0722 * conv(b);
}
function contrast(a: string, b: string): number {
  const ra = cssToRgb(a);
  const rb = cssToRgb(b);
  if (!ra || !rb) return 0;
  const la = luminance(ra);
  const lb = luminance(rb);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
function ratingFor(ratio: number) {
  if (ratio >= 7) return { label: "AAA", tone: "ok" as const };
  if (ratio >= 4.5) return { label: "AA", tone: "ok" as const };
  if (ratio >= 3) return { label: "AA (grande)", tone: "warn" as const };
  return { label: "Insuficiente", tone: "bad" as const };
}

// ---- Preview ---------------------------------------------------------------
function PalettePreview({ palette }: { palette: Palette }) {
  const style: React.CSSProperties = {
    // Local CSS vars scoped to the preview
    ["--pv-primary" as never]: palette.primary,
    ["--pv-secondary" as never]: palette.secondary,
    ["--pv-accent" as never]: palette.accent,
    ["--pv-sidebar" as never]: palette.sidebar,
    ["--pv-sidebar-primary" as never]: palette["sidebar-primary"],
  };
  return (
    <div
      style={style}
      className="overflow-hidden rounded-xl border border-[var(--ms-border)] bg-white"
    >
      <div className="flex">
        {/* mock sidebar */}
        <div
          className="hidden w-40 shrink-0 flex-col gap-1.5 p-3 text-white sm:flex"
          style={{ background: "var(--pv-sidebar)" }}
        >
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider opacity-70">Menu</div>
          <div
            className="rounded-lg px-3 py-2 text-[13px] font-medium"
            style={{ background: "var(--pv-sidebar-primary)" }}
          >
            Dashboard
          </div>
          <div className="rounded-lg px-3 py-2 text-[13px] opacity-90 hover:opacity-100">Pedidos</div>
          <div className="rounded-lg px-3 py-2 text-[13px] opacity-90">Produtos</div>
          <div className="rounded-lg px-3 py-2 text-[13px] opacity-90">Config.</div>
        </div>
        {/* main */}
        <div className="min-w-0 flex-1 space-y-3 p-4">
          {/* navbar */}
          <div className="flex items-center justify-between rounded-lg border border-[var(--ms-border)] bg-white px-3 py-2">
            <div className="text-[13px] font-semibold text-[#0f172a]">Prévia</div>
            <button
              className="rounded-md px-3 py-1 text-[12px] font-medium text-white"
              style={{ background: "var(--pv-primary)" }}
            >
              Ação
            </button>
          </div>
          {/* cards row */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-[var(--ms-border)] bg-white p-3">
                <div className="text-[10px] uppercase tracking-wide text-[#6b7280]">Card {i}</div>
                <div className="mt-1 text-[16px] font-semibold text-[#0f172a]">R$ {i * 120},00</div>
                <div
                  className="mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ background: "var(--pv-accent)" }}
                >
                  Novo
                </div>
              </div>
            ))}
          </div>
          {/* input + buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              placeholder="Buscar…"
              className="h-9 flex-1 min-w-[160px] rounded-md border border-[var(--ms-border)] bg-white px-3 text-[13px] outline-none focus:border-[color:var(--pv-primary)]"
            />
            <button
              className="h-9 rounded-md px-3 text-[13px] font-medium text-white"
              style={{ background: "var(--pv-primary)" }}
            >
              Primário
            </button>
            <button
              className="h-9 rounded-md border border-[var(--ms-border)] bg-white px-3 text-[13px] font-medium text-[#0f172a] hover:bg-[var(--ms-hover)]"
            >
              Secundário
            </button>
          </div>
          {/* table */}
          <div className="overflow-hidden rounded-lg border border-[var(--ms-border)]">
            <div className="grid grid-cols-3 bg-[#fafbfc] px-3 py-2 text-[11px] font-medium text-[#6b7280]">
              <div>Cliente</div><div>Status</div><div className="text-right">Total</div>
            </div>
            <div className="grid grid-cols-3 border-t border-[var(--ms-border)] px-3 py-2 text-[13px]">
              <div>Loja Central</div>
              <div>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                  style={{ background: "var(--pv-primary)" }}
                >
                  Ativo
                </span>
              </div>
              <div className="text-right font-medium">R$ 349,90</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Page ------------------------------------------------------------------
function PaletasPage() {
  const stored = loadStored();
  const [activePreset, setActivePreset] = useState<string>(stored.preset ?? "profissional");
  const [custom, setCustom] = useState<Palette>(() => {
    const preset = PRESETS[stored.preset ?? "profissional"] ?? PRESETS.profissional;
    const resolved = resolveMode(stored.mode);
    return { ...preset[resolved], ...(stored.palette ?? {}) } as Palette;
  });
  const [mode] = useState<"light" | "dark">(resolveMode(stored.mode));

  // Sync custom fields when a preset is selected
  function pickPreset(key: string) {
    setActivePreset(key);
    const preset = PRESETS[key];
    if (preset) setCustom({ ...preset[mode] });
  }

  function activatePreset(key: string) {
    const next = { ...loadStored(), preset: key, palette: undefined };
    saveStored(next);
    applyTheme(next);
    setActivePreset(key);
    setCustom({ ...PRESETS[key][mode] });
    toast.success(`Paleta “${PRESETS[key].label}” ativada`);
  }

  function saveCustom() {
    const next = { ...loadStored(), preset: activePreset, palette: custom };
    saveStored(next);
    applyTheme(next);
    toast.success("Paleta personalizada salva e aplicada");
  }

  function resetCustom() {
    const preset = PRESETS[activePreset] ?? PRESETS.profissional;
    setCustom({ ...preset[mode] });
    const next = { ...loadStored(), preset: activePreset, palette: undefined };
    saveStored(next);
    applyTheme(next);
    toast.success("Paleta restaurada ao preset");
  }

  // Contrast checks (primary/white, sidebar/white text, accent/white)
  const checks = useMemo(() => {
    return [
      { label: "Texto branco em Primário", ratio: contrast(custom.primary, "#ffffff") },
      { label: "Texto branco em Sidebar", ratio: contrast(custom.sidebar, "#ffffff") },
      { label: "Texto branco em Accent", ratio: contrast(custom.accent, "#ffffff") },
      { label: "Texto branco em Sidebar Ativo", ratio: contrast(custom["sidebar-primary"], "#ffffff") },
    ];
  }, [custom]);

  // Keep the live preview reflecting the working `custom` values on this page only,
  // without persisting until user clicks Save/Activate.
  useEffect(() => {
    // no-op — preview uses local CSS vars; global theme only changes on activate/save.
  }, [custom]);

  const insufficient = checks.some((c) => c.ratio < 3);

  return (
    <div className="master-saas space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#0f172a]">Paletas de Cores</h1>
          <p className="mt-1 text-[13px] text-[#6b7280]">
            Escolha um preset ou personalize as cores globais do sistema. As mudanças aplicam em todas as áreas.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ms-border)] bg-white px-3 py-1.5 text-[12px] text-[#4b5563]">
          <PaletteIcon className="h-3.5 w-3.5" />
          Modo atual: {mode === "dark" ? "Escuro" : "Claro"}
        </div>
      </div>

      {/* Presets grid */}
      <section className="ms-card p-5">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[#0f172a]">
          <Sparkles className="h-4 w-4 text-[#2563eb]" /> Presets prontos
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.entries(PRESETS).map(([key, p]) => {
            const pal = p[mode];
            const isActive = activePreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => pickPreset(key)}
                onDoubleClick={() => activatePreset(key)}
                className={
                  "group relative overflow-hidden rounded-xl border bg-white p-3 text-left transition " +
                  (isActive
                    ? "border-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                    : "border-[var(--ms-border)] hover:border-[var(--ms-border-strong)]")
                }
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[13px] font-medium text-[#0f172a]">{p.label}</div>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-medium text-[#2563eb]">
                      <Check className="h-3 w-3" /> Selecionada
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {(["primary", "accent", "secondary", "sidebar", "sidebar-primary"] as (keyof Palette)[]).map((k) => (
                    <span
                      key={k}
                      title={k}
                      className="h-8 flex-1 rounded-md border border-black/5"
                      style={{ background: pal[k] }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <span
                    className="rounded-md px-2 py-1 text-[11px] font-medium text-white"
                    style={{ background: pal.primary }}
                  >
                    Primário
                  </span>
                  <span
                    className="rounded-md px-2 py-1 text-[11px] font-medium text-white"
                    style={{ background: pal.accent }}
                  >
                    Accent
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-end">
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); activatePreset(key); }}
                    className={
                      "inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium " +
                      (isActive
                        ? "bg-[#2563eb] text-white"
                        : "border border-[var(--ms-border)] text-[#0f172a] hover:bg-[var(--ms-hover)]")
                    }
                  >
                    {isActive ? "Ativa" : "Ativar"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Editor + preview */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="ms-card p-5">
          <div className="mb-3 text-[13px] font-semibold text-[#0f172a]">Personalizar</div>
          <div className="space-y-3">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="mb-1 flex items-center justify-between text-[12px] font-medium text-[#374151]">
                  <span>{f.label}</span>
                  <span className="text-[10px] text-[#9ca3af]">{f.key}</span>
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className="h-8 w-8 shrink-0 rounded-md border border-[var(--ms-border)]"
                    style={{ background: custom[f.key] }}
                  />
                  <input
                    value={custom[f.key]}
                    onChange={(e) => setCustom((c) => ({ ...c, [f.key]: e.target.value }))}
                    spellCheck={false}
                    className="h-9 w-full rounded-md border border-[var(--ms-border)] bg-white px-2 font-mono text-[12px] text-[#0f172a] outline-none focus:border-[#2563eb]"
                    placeholder="oklch(...) ou #hex"
                  />
                </div>
                {f.help && <div className="mt-1 text-[11px] text-[#9ca3af]">{f.help}</div>}
              </div>
            ))}
          </div>

          {/* Contrast */}
          <div className="mt-4 rounded-lg border border-[var(--ms-border)] bg-[#fafbfc] p-3">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#0f172a]">
              <AlertTriangle className={"h-3.5 w-3.5 " + (insufficient ? "text-[#dc2626]" : "text-[#059669]")} />
              Validação de contraste (WCAG)
            </div>
            <div className="space-y-1.5">
              {checks.map((c) => {
                const r = ratingFor(c.ratio);
                return (
                  <div key={c.label} className="flex items-center justify-between text-[12px]">
                    <span className="text-[#4b5563]">{c.label}</span>
                    <span
                      className={
                        "rounded-md px-2 py-0.5 text-[11px] font-medium " +
                        (r.tone === "ok"
                          ? "bg-[#ecfdf5] text-[#059669]"
                          : r.tone === "warn"
                          ? "bg-[#fffbeb] text-[#d97706]"
                          : "bg-[#fef2f2] text-[#dc2626]")
                      }
                    >
                      {c.ratio.toFixed(2)}:1 · {r.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {insufficient && (
              <div className="mt-2 text-[11px] text-[#dc2626]">
                Contraste insuficiente em alguma cor. Ajuste antes de aplicar.
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveCustom}
              disabled={insufficient}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#2563eb] px-3 text-[13px] font-medium text-white shadow-sm hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> Salvar e aplicar
            </button>
            <button
              type="button"
              onClick={resetCustom}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--ms-border)] bg-white px-3 text-[13px] font-medium text-[#0f172a] hover:bg-[var(--ms-hover)]"
            >
              <RotateCcw className="h-4 w-4" /> Restaurar preset
            </button>
          </div>
        </div>

        <div className="ms-card p-5">
          <div className="mb-3 text-[13px] font-semibold text-[#0f172a]">Pré-visualização em tempo real</div>
          <PalettePreview palette={custom} />
          <p className="mt-3 text-[11px] text-[#9ca3af]">
            A aplicação global só ocorre ao clicar em <strong>Ativar</strong> em um preset ou <strong>Salvar e aplicar</strong> na paleta personalizada.
          </p>
        </div>
      </section>
    </div>
  );
}
