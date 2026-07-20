import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Star, Trash2, X, Save, Search } from "lucide-react";
import type { FilterSections, FiltersState } from "./types";
import { PERIOD_LABEL } from "./useFilters";

type Props = {
  sections: FilterSections;
  state: FiltersState;
  setState: (updater: (s: FiltersState) => FiltersState) => void;
  reset: () => void;
  presets: Array<{ id: string; name: string }>;
  onSavePreset: (name: string) => void;
  onApplyPreset: (id: string) => void;
  onRemovePreset: (id: string) => void;
  activeCount: number;
  extras?: React.ReactNode;
};

export function FiltersButton({ activeCount, onClick }: { activeCount: number; onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick} className="gap-2">
      <Filter className="h-4 w-4" />
      Filtros
      {activeCount > 0 && <Badge className="h-5 px-1.5">{activeCount}</Badge>}
    </Button>
  );
}

export function FiltersDrawer({
  sections, state, setState, reset, presets, onSavePreset, onApplyPreset, onRemovePreset, activeCount, extras,
}: Props) {
  const [open, setOpen] = useState(false);
  const [presetName, setPresetName] = useState("");

  const update = <K extends keyof FiltersState>(key: K, v: FiltersState[K]) => setState((s) => ({ ...s, [key]: v }));
  const toggleArr = (key: "status" | "categories", value: string) =>
    setState((s) => ({ ...s, [key]: s[key].includes(value) ? s[key].filter((x) => x !== value) : [...s[key], value] }));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {activeCount > 0 && <Badge className="h-5 px-1.5">{activeCount}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2"><Filter className="h-4 w-4" />Filtros</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {presets.length > 0 && (
            <section>
              <Label className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                <Star className="h-3 w-3" />Filtros salvos
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <span key={p.id} className="group inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-1 text-xs">
                    <button className="hover:underline" onClick={() => onApplyPreset(p.id)}>{p.name}</button>
                    <button className="opacity-40 hover:opacity-100" onClick={() => onRemovePreset(p.id)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              <Separator className="mt-4" />
            </section>
          )}

          {sections.search && (
            <section>
              <Label className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Pesquisa geral</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Nome, código, telefone, produto…" value={state.q} onChange={(e) => update("q", e.target.value)} />
              </div>
            </section>
          )}

          {sections.period && (
            <section>
              <Label className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Período</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(PERIOD_LABEL) as Array<keyof typeof PERIOD_LABEL>).filter((k) => k !== "todos").map((k) => (
                  <Button key={k} size="sm" variant={state.period === k ? "default" : "outline"} className="h-8 text-xs" onClick={() => update("period", k)}>
                    {PERIOD_LABEL[k]}
                  </Button>
                ))}
              </div>
              {state.period === "personalizado" && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input type="date" value={state.dateFrom ?? ""} onChange={(e) => update("dateFrom", e.target.value)} />
                  <Input type="date" value={state.dateTo ?? ""} onChange={(e) => update("dateTo", e.target.value)} />
                </div>
              )}
            </section>
          )}

          {sections.status && sections.status.length > 0 && (
            <section>
              <Label className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Status</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {sections.status.map((o) => (
                  <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent/40">
                    <Checkbox checked={state.status.includes(o.value)} onCheckedChange={() => toggleArr("status", o.value)} />
                    <span className="truncate">{o.label}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {sections.categories && sections.categories.length > 0 && (
            <section>
              <Label className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Categorias</Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {sections.categories.map((o) => (
                  <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent/40">
                    <Checkbox checked={state.categories.includes(o.value)} onCheckedChange={() => toggleArr("categories", o.value)} />
                    <span className="truncate">{o.label}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {sections.valueRange && (
            <section>
              <Label className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Faixa de valores</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Mínimo" value={state.valueMin ?? ""} onChange={(e) => update("valueMin", e.target.value ? Number(e.target.value) : undefined)} />
                <Input type="number" placeholder="Máximo" value={state.valueMax ?? ""} onChange={(e) => update("valueMax", e.target.value ? Number(e.target.value) : undefined)} />
              </div>
            </section>
          )}

          {extras}

          {sections.sort && sections.sort.length > 0 && (
            <section>
              <Label className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Ordenação</Label>
              <Select value={state.sort} onValueChange={(v) => update("sort", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sections.sort.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </section>
          )}

          <Separator />

          <section>
            <Label className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Salvar filtro atual</Label>
            <div className="flex gap-2">
              <Input placeholder="Ex: Vendas de hoje" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
              <Button size="sm" disabled={!presetName.trim()} onClick={() => { onSavePreset(presetName.trim()); setPresetName(""); }}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-2 border-t bg-background px-5 py-3">
          <Button variant="ghost" size="sm" onClick={reset}><Trash2 className="h-4 w-4" />Limpar</Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Fechar</Button>
            <Button size="sm" onClick={() => setOpen(false)}>Aplicar</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function FilterChips({ chips, onClearAll }: { chips: Array<{ key: string; label: string; onRemove: () => void }>; onClearAll: () => void }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <Badge key={c.key} variant="secondary" className="gap-1 pr-1">
          {c.label}
          <button className="rounded-full p-0.5 hover:bg-background/60" onClick={c.onRemove}><X className="h-3 w-3" /></button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClearAll}>Limpar todos</Button>
    </div>
  );
}
