import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sun, Moon, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRESETS,
  applyTheme,
  loadStored,
  saveStored,
  type Palette,
  type ThemeMode,
} from "@/lib/theme";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/aparencia")({
  component: AparenciaPage,
});

const DEFAULT_PRESET = "azul";

function AparenciaPage() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [presetKey, setPresetKey] = useState<string>(DEFAULT_PRESET);

  useEffect(() => {
    const s = loadStored();
    setMode(s.mode);
    setPresetKey(PRESETS[s.preset] ? s.preset : DEFAULT_PRESET);
  }, []);

  // Live preview: apply on every change
  useEffect(() => {
    applyTheme({ mode, preset: presetKey });
  }, [mode, presetKey]);

  function save() {
    saveStored({ mode, preset: presetKey });
    toast.success("Aparência salva");
  }
  function reset() {
    setMode("light");
    setPresetKey(DEFAULT_PRESET);
    saveStored({ mode: "light", preset: DEFAULT_PRESET });
    applyTheme({ mode: "light", preset: DEFAULT_PRESET });
    toast.success("Padrão restaurado");
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <Card className="p-5">
        <div className="mb-3">
          <h2 className="font-display text-lg font-semibold">Modo de visualização</h2>
          <p className="text-sm text-muted-foreground">Alterne entre modo claro e escuro.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
          {[
            { v: "light" as ThemeMode, label: "Claro", Icon: Sun },
            { v: "dark" as ThemeMode, label: "Escuro", Icon: Moon },
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
          <h2 className="font-display text-lg font-semibold">Temas oficiais</h2>
          <p className="text-sm text-muted-foreground">Escolha uma das paletas oficiais para aplicar em todo o sistema.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.entries(PRESETS).map(([key, p]) => {
            const active = presetKey === key;
            const colors = p[mode];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPresetKey(key)}
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

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={reset}>
          <RotateCcw className="mr-1 h-4 w-4" /> Restaurar padrão
        </Button>
        <Button onClick={save}>Salvar aparência</Button>
      </div>
    </div>
  );
}
