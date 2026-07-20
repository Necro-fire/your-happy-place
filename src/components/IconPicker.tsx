import { useMemo, useState } from "react";
import * as LucideIcons from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export type IconName = string;

// Convert kebab-case name to PascalCase (lucide-react export naming).
function pascal(name: string) {
  return name
    .split("-")
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : ""))
    .join("");
}

function getIcon(name?: string | null) {
  if (!name) return null;
  const key = pascal(name);
  const Comp = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[key];
  return Comp ?? null;
}

// Curated set of common lucide icons grouped by category.
const GROUPS: Record<string, IconName[]> = {
  "Alimentos": ["pizza", "sandwich", "hamburger", "salad", "soup", "utensils", "utensils-crossed", "cookie", "cake", "ice-cream", "ice-cream-cone", "croissant", "egg", "egg-fried", "beef", "fish", "ham", "carrot", "apple", "banana", "cherry", "grape", "citrus", "wheat", "popcorn", "candy", "donut", "dessert"],
  "Bebidas": ["coffee", "cup-soda", "wine", "beer", "beer-off", "martini", "milk", "glass-water", "bottle-wine"],
  "Comércio": ["shopping-cart", "shopping-bag", "store", "package", "tag", "tags", "gift", "credit-card", "wallet", "receipt", "banknote", "coins", "percent", "truck", "package-check"],
  "Interface": ["home", "star", "heart", "bookmark", "flag", "bell", "settings", "user", "users", "grid-2x2", "list", "layout-grid", "layers", "folder", "folders", "archive", "boxes", "box"],
  "Objetos": ["book", "camera", "music", "film", "gamepad-2", "phone", "laptop", "printer", "key", "lock", "map-pin", "map", "calendar", "clock", "briefcase"],
  "Natureza": ["sun", "moon", "cloud", "leaf", "tree-pine", "flower", "flame", "droplet", "sparkles", "snowflake"],
  "Símbolos": ["check", "x", "plus", "minus", "circle", "square", "triangle", "diamond", "hexagon", "zap", "trophy", "medal", "award"],
};

const ALL = Array.from(new Set(Object.values(GROUPS).flat())).filter((n) => getIcon(n));

interface Props {
  open: boolean;
  value?: string | null;
  onClose: () => void;
  onSelect: (icon: IconName) => void;
}

function RenderIcon({ name, className }: { name: string; className?: string }) {
  const Comp = getIcon(name);
  if (!Comp) return null;
  return <Comp className={className ?? "h-5 w-5"} />;
}

export function IconPicker({ open, value, onClose, onSelect }: Props) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<string>("Todos");
  const [preview, setPreview] = useState<IconName | null>(value ?? null);

  const list = useMemo(() => {
    const base = tab === "Todos" ? ALL : (GROUPS[tab] ?? []).filter((n) => getIcon(n));
    if (!q.trim()) return base;
    const needle = q.toLowerCase();
    return base.filter((n) => n.includes(needle));
  }, [q, tab]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Escolher ícone</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar ícone…" className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-1">
            {["Todos", ...Object.keys(GROUPS)].map((g) => (
              <Button key={g} size="sm" variant={tab === g ? "default" : "outline"} onClick={() => setTab(g)} className="h-7 text-xs">{g}</Button>
            ))}
          </div>
          <div className="grid max-h-[320px] grid-cols-6 gap-2 overflow-y-auto rounded-lg border p-2 sm:grid-cols-8">
            {list.map((name) => {
              const active = preview === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setPreview(name)}
                  onDoubleClick={() => { onSelect(name); onClose(); }}
                  className={`flex aspect-square items-center justify-center rounded-md border transition hover:bg-accent ${active ? "border-primary bg-accent" : "border-transparent"}`}
                  title={name}
                >
                  <RenderIcon name={name} className="h-5 w-5" />
                </button>
              );
            })}
            {list.length === 0 && <div className="col-span-full py-6 text-center text-sm text-muted-foreground">Nenhum ícone</div>}
          </div>
          {preview && (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-accent">
                <RenderIcon name={preview} className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Selecionado</div>
                <div className="truncate font-mono text-sm">{preview}</div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!preview} onClick={() => { if (preview) { onSelect(preview); onClose(); } }}>Selecionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const safe = (name && /^[a-z0-9-]+$/.test(name)) ? name : "tag";
  const Comp = getIcon(safe) ?? getIcon("tag");
  if (!Comp) return null;
  return <Comp className={className ?? "h-5 w-5"} />;
}
