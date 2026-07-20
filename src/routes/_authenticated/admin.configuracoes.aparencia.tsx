import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sun, Moon, MonitorSmartphone, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRESETS,
  applyTheme,
  loadStored,
  resolveMode,
  saveStored,
  type Palette,
  type ThemeMode,
} from "@/lib/theme";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/aparencia")({
  component: AparenciaPage,
});

const PALETTE_FIELDS: { key: keyof Palette; label: string }[] = [
  { key: "primary", label: "Cor primária" },
  { key: "secondary", label: "Cor secundária" },
  { key: "accent", label: "Cor de destaque" },
  { key: "ring", label: "Cor dos elementos selecionados" },
  { key: "sidebar", label: "Cor do menu lateral" },
  { key: "sidebar-primary", label: "Cor dos detalhes do menu" },
];

// Converts an "oklch(L C H)" string to a hex approximation via canvas
function oklchToHex(v: string): string {
  if (typeof document === "undefined") return "#888888";
  const el = document.createElement("div");
  el.style.color = v;
  document.body.appendChild(el);
  const rgb = getComputedStyle(el).color;
  document.body.removeChild(el);
  const m = rgb.match(/rgba?\(([^)]+)\)/);
  if (!m) return "#888888";
  const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
  const hex = parts.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");
  return `#${hex}`;
}

function hexToOklch(hex: string): string {
  if (typeof document === "undefined") return hex;
  const el = document.createElement("div");
  el.style.color = hex;
  document.body.appendChild(el);
  const rgb = getComputedStyle(el).color;
  document.body.removeChild(el);
  const m = rgb.match(/rgba?\(([^)]+)\)/);
  if (!m) return hex;
  const [r, g, b] = m[1].split(",").map((s) => parseFloat(s.trim()) / 255);
  // sRGB → linear
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const R = lin(r), G = lin(g), B = lin(b);
  // Linear sRGB → OKLab
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m2 = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s2 = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.7936177850 * m2 - 0.0040720468 * s2;
  const A = 1.9779984951 * l - 2.4285922050 * m2 + 0.4505937099 * s2;
  const Bb = 0.0259040371 * l + 0.7827717662 * m2 - 0.8086757660 * s2;
  const C = Math.sqrt(A * A + Bb * Bb);
  let H = (Math.atan2(Bb, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}

function AparenciaPage() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [presetKey, setPresetKey] = useState<string>("profissional");
  const [palette, setPalette] = useState<Partial<Palette>>({});

  useEffect(() => {
    const s = loadStored();
    setMode(s.mode);
    setPresetKey(s.preset || "profissional");
    setPalette(s.palette || {});
  }, []);

  // Live preview: apply on every change
  useEffect(() => {
    applyTheme({ mode, preset: presetKey, palette });
  }, [mode, presetKey, palette]);

  const resolved = resolveMode(mode);
  const effective = useMemo(() => {
    const base = PRESETS[presetKey]?.[resolved] ?? PRESETS.profissional[resolved];
    return { ...base, ...palette };
  }, [presetKey, palette, resolved]);

  function save() {
    saveStored({ mode, preset: presetKey, palette });
    toast.success("Aparência salva");
  }
  function reset() {
    setMode("light");
    setPresetKey("profissional");
    setPalette({});
    saveStored({ mode: "light", preset: "profissional", palette: {} });
    toast.success("Padrão restaurado");
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <Card className="p-5">
        <div className="mb-3">
          <h2 className="font-display text-lg font-semibold">Modo de visualização</h2>
          <p className="text-sm text-muted-foreground">Alterne entre claro, escuro ou automático (segue o sistema).</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          {[
            { v: "light" as ThemeMode, label: "Claro", Icon: Sun },
            { v: "dark" as ThemeMode, label: "Escuro", Icon: Moon },
            { v: "auto" as ThemeMode, label: "Auto", Icon: MonitorSmartphone },
          ].map(({ v, label, Icon }) => {
            const active = mode === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setMode(v)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition",
                  active
                    ? "border-primary bg-primary/10 text-foreground shadow-soft"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-primary")} />
                <span className="font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Presets */}
      <Card className="p-5">
        <div className="mb-3">
          <h2 className="font-display text-lg font-semibold">Temas prontos</h2>
          <p className="text-sm text-muted-foreground">Escolha uma paleta base — você pode personalizar depois.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(PRESETS).map(([key, p]) => {
            const active = presetKey === key;
            const colors = p[resolved];
            return (
              <button
                key={key}
                type="button"
                onClick={() => { setPresetKey(key); setPalette({}); }}
                className={cn(
                  "rounded-lg border p-3 text-left transition",
                  active ? "border-primary shadow-soft" : "border-border hover:border-primary/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.label}</span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </div>
                <div className="mt-2 flex gap-1">
                  {(["primary", "accent", "sidebar", "ring"] as (keyof Palette)[]).map((k) => (
                    <span key={k} className="h-6 w-6 rounded-md border border-border" style={{ background: colors[k] }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Custom palette */}
      <Card className="p-5">
        <div className="mb-3">
          <h2 className="font-display text-lg font-semibold">Paleta personalizada</h2>
          <p className="text-sm text-muted-foreground">Ajuste cores específicas. As alterações aparecem em tempo real.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {PALETTE_FIELDS.map(({ key, label }) => {
            const current = effective[key];
            const hex = oklchToHex(current);
            return (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    type="color"
                    value={hex}
                    onChange={(e) => setPalette((p) => ({ ...p, [key]: hexToOklch(e.target.value) }))}
                    className="h-10 w-14 shrink-0 cursor-pointer p-1"
                  />
                  <Input
                    value={current}
                    onChange={(e) => setPalette((p) => ({ ...p, [key]: e.target.value }))}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-5">
        <div className="mb-3">
          <h2 className="font-display text-lg font-semibold">Prévia</h2>
          <p className="text-sm text-muted-foreground">Componentes de exemplo com a paleta atual.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Card</div>
            <div className="font-display text-lg font-semibold text-foreground">Título de exemplo</div>
            <p className="text-sm text-muted-foreground">Texto secundário para pré-visualização de contraste.</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm">Ação primária</Button>
              <Button size="sm" variant="secondary">Secundária</Button>
              <Button size="sm" variant="outline">Outline</Button>
            </div>
          </div>
          <div className="rounded-lg border border-sidebar-border bg-sidebar p-4 text-sidebar-foreground">
            <div className="mb-2 text-xs uppercase tracking-wider opacity-70">Menu lateral</div>
            <div className="space-y-1">
              <div className="rounded-md bg-sidebar-primary/20 px-2 py-1.5 text-sm text-sidebar-primary-foreground">
                <span className="text-sidebar-primary">●</span> Item ativo
              </div>
              <div className="px-2 py-1.5 text-sm opacity-80">Outro item</div>
              <div className="px-2 py-1.5 text-sm opacity-80">Mais um item</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={reset}>
          <RotateCcw className="mr-1 h-4 w-4" /> Restaurar padrão
        </Button>
        <Button onClick={save}>Salvar aparência</Button>
      </div>
    </div>
  );
}
