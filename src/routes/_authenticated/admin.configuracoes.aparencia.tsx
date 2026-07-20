import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

function AparenciaPage() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [presetKey, setPresetKey] = useState<string>("profissional");

  useEffect(() => {
    const s = loadStored();
    setMode(s.mode);
    setPresetKey(s.preset || "profissional");
  }, []);

  // Live preview: apply on every change
  useEffect(() => {
    applyTheme({ mode, preset: presetKey, palette: {} });
  }, [mode, presetKey]);

  const resolved = resolveMode(mode);

  function save() {
    saveStored({ mode, preset: presetKey, palette: {} });
    toast.success("Aparência salva");
  }
  function reset() {
    setMode("light");
    setPresetKey("profissional");
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
          <p className="text-sm text-muted-foreground">Escolha uma das paletas abaixo para aplicar em todo o sistema.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.entries(PRESETS).map(([key, p]) => {
            const active = presetKey === key;
            const colors = p[resolved];
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
