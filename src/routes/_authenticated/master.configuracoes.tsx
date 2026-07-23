import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Palette as PaletteIcon, Sun, Moon, Settings as SettingsIcon } from "lucide-react";
import {
  PRESETS,
  applyTheme,
  loadStored,
  saveStored,
  type Palette,
  type ThemeMode,
} from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/master/configuracoes")({
  component: MasterConfiguracoesPage,
});


function ThemeSwatches({ palette }: { palette: Palette }) {
  const keys: (keyof Palette)[] = ["primary", "accent", "secondary", "sidebar", "sidebar-primary"];
  return (
    <div className="flex gap-1.5">
      {keys.map((k) => (
        <span
          key={k}
          title={k}
          className="h-8 flex-1 rounded-md border border-black/5"
          style={{ background: palette[k] }}
        />
      ))}
    </div>
  );
}

function MasterConfiguracoesPage() {
  const [stored, setStored] = useState(() => loadStored());
  const { mode, preset } = stored;

  // Ensure theme is applied on mount (in case storage was cleared).
  useEffect(() => {
    applyTheme(stored);
  }, [stored]);

  function chooseMode(next: ThemeMode) {
    if (next === mode) return;
    const updated = { ...stored, mode: next };
    setStored(updated);
    saveStored(updated);
    applyTheme(updated);
  }

  function choosePreset(key: string) {
    if (key === preset) return;
    const updated = { ...stored, preset: key };
    setStored(updated);
    saveStored(updated);
    applyTheme(updated);
  }


  return (
    <div className="master-saas space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight text-[#0f172a]">
            <SettingsIcon className="h-5 w-5 text-[var(--ms-primary)]" />
            Configurações
          </h1>
          <p className="mt-1 text-[13px] text-[#6b7280]">
            Ajuste o tema visual e o modo de exibição do painel do Desenvolvedor Master.
          </p>
        </div>
      </div>

      {/* Mode selector */}
      <section className="ms-card p-5">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[#0f172a]">
          <PaletteIcon className="h-4 w-4 text-[var(--ms-primary)]" /> Modo de exibição
        </div>
        <p className="mb-4 text-[12px] text-[#6b7280]">
          A alteração é aplicada instantaneamente e mantida entre sessões.
        </p>
        <div
          className="inline-flex rounded-lg border border-[var(--ms-border)] bg-white p-1"
          role="tablist"
          aria-label="Modo de exibição"
        >
          {[
            { key: "light" as ThemeMode, label: "Modo Claro", Icon: Sun },
            { key: "dark" as ThemeMode, label: "Modo Escuro", Icon: Moon },
          ].map(({ key, label, Icon }) => {
            const active = mode === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => chooseMode(key)}
                className={
                  "inline-flex h-9 items-center gap-2 rounded-md px-4 text-[13px] font-medium transition " +
                  (active
                    ? "bg-[var(--ms-primary)] text-white shadow-sm"
                    : "text-[#4b5563] hover:bg-[var(--ms-hover)]")
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Presets grid */}
      <section className="ms-card p-5">
        <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-[#0f172a]">
          Paleta de Cores
        </div>
        <p className="mb-4 text-[12px] text-[#6b7280]">
          Escolha um tema oficial. As cores serão aplicadas em toda a área do Desenvolvedor Master.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.entries(PRESETS).map(([key, p]) => {
            const pal = p[mode];
            const isActive = preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => choosePreset(key)}
                aria-pressed={isActive}
                className={
                  "group relative overflow-hidden rounded-xl border bg-white p-4 text-left transition " +
                  (isActive
                    ? "border-[var(--ms-primary)] shadow-[0_0_0_3px_var(--ms-ring)]"
                    : "border-[var(--ms-border)] hover:border-[var(--ms-border-strong)]")
                }
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[14px] font-medium text-[#0f172a]">{p.label}</div>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ms-primary-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--ms-primary)]">
                      <Check className="h-3 w-3" /> Ativo
                    </span>
                  )}
                </div>
                <ThemeSwatches palette={pal} />
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
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
