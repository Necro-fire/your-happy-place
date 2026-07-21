import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, Trash2, ArrowUp, ArrowDown, Plus, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DesignConfig, CarrosselItem } from "@/hooks/use-public-settings";
import { EMPTY_DESIGN } from "@/hooks/use-public-settings";
import { getMySettingsRow, updateMySettings, uploadTenantAsset, friendlyStorageError } from "@/lib/settings-io";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/design")({
  component: DesignPage,
});

const MAX_CARROSSEL = 5;
const MAX_GALERIA = 10;
const BUCKET = "logos";

function newId() {
  return (globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random()));
}

async function uploadImage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Arquivo precisa ser uma imagem");
  if (file.size > 5 * 1024 * 1024) throw new Error("Imagem muito grande (máx 5MB)");
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const { publicUrl } = await uploadTenantAsset(BUCKET, folder, file, ext);
  return publicUrl;
}

function DesignPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: getMySettingsRow,
  });

  const [design, setDesign] = useState<DesignConfig>(EMPTY_DESIGN);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (q.data) {
      const cfg = (q.data as any).config ?? {};
      const d: DesignConfig = { ...EMPTY_DESIGN, ...(cfg.design ?? {}) };
      if (!d.logo_url && (q.data as any).logo_url) d.logo_url = (q.data as any).logo_url;
      setDesign(d);
      setDirty(false);
    }
  }, [q.data]);

  function update(patch: Partial<DesignConfig>) {
    setDesign((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const currentCfg = ((q.data as any)?.config ?? {}) as Record<string, any>;
      const nextCfg = { ...currentCfg, design };
      await updateMySettings({ config: nextCfg, logo_url: design.logo_url ?? null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
      setDirty(false);
      toast.success("Design atualizado");
    },
    onError: (e: any) => toast.error(friendlyStorageError(e) || "Não foi possível atualizar as configurações da empresa."),
  });

  return (
    <div className="space-y-4 pb-24">
      {/* LOGO */}
      <SingleImageCard
        title="Logo da Empresa"
        desc="Aparece no cabeçalho do cardápio, autoatendimento, PDV e impressões."
        value={design.logo_url}
        folder="logo"
        aspect="square"
        onChange={(url) => update({ logo_url: url })}
      />

      {/* BANNER */}
      <SingleImageCard
        title="Banner Principal"
        desc="Destaque no topo da loja e cardápio digital. Recomendado 1600x600px."
        value={design.banner_url}
        folder="banner"
        aspect="wide"
        onChange={(url) => update({ banner_url: url })}
      />

      {/* CARROSSEL */}
      <Card className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Carrossel de Banners</h2>
            <p className="text-xs text-muted-foreground">Até {MAX_CARROSSEL} banners rotativos na página inicial. {design.carrossel.length}/{MAX_CARROSSEL}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={design.carrossel.length >= MAX_CARROSSEL}
            onClick={() => update({ carrossel: [...design.carrossel, { id: newId(), image_url: "", titulo: "", descricao: "", link: "", ativo: true }] })}
          >
            <Plus className="mr-1 h-4 w-4" /> Novo banner
          </Button>
        </div>
        {design.carrossel.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum banner ainda. Adicione o primeiro para começar.
          </div>
        )}
        <div className="space-y-3">
          {design.carrossel.map((item, idx) => (
            <CarrosselRow
              key={item.id}
              item={item}
              index={idx}
              total={design.carrossel.length}
              onChange={(patch) => {
                const next = design.carrossel.map((it, i) => i === idx ? { ...it, ...patch } : it);
                update({ carrossel: next });
              }}
              onRemove={() => update({ carrossel: design.carrossel.filter((_, i) => i !== idx) })}
              onMove={(dir) => {
                const next = [...design.carrossel];
                const target = dir === "up" ? idx - 1 : idx + 1;
                if (target < 0 || target >= next.length) return;
                [next[idx], next[target]] = [next[target], next[idx]];
                update({ carrossel: next });
              }}
            />
          ))}
        </div>
      </Card>

      {/* CAPA */}
      <SingleImageCard
        title="Imagem de Capa"
        desc="Usada em páginas institucionais e apresentação da empresa."
        value={design.cover_url}
        folder="capa"
        aspect="wide"
        onChange={(url) => update({ cover_url: url })}
      />

      {/* GALERIA */}
      <Card className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Galeria da Empresa</h2>
            <p className="text-xs text-muted-foreground">Até {MAX_GALERIA} imagens: ambiente, produtos, estrutura, equipe. {design.galeria.length}/{MAX_GALERIA}</p>
          </div>
          <label className={cn("inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent",
            design.galeria.length >= MAX_GALERIA && "pointer-events-none opacity-50")}>
            <Plus className="h-4 w-4" /> Adicionar
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                e.currentTarget.value = "";
                const remaining = MAX_GALERIA - design.galeria.length;
                for (const file of files.slice(0, remaining)) {
                  try {
                    const url = await uploadImage(file, "galeria");
                    setDesign((prev) => ({ ...prev, galeria: [...prev.galeria, url] }));
                    setDirty(true);
                  } catch (err: any) { toast.error(err.message); }
                }
              }}
            />
          </label>
        </div>
        {design.galeria.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhuma imagem na galeria.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {design.galeria.map((url, idx) => (
              <div key={url + idx} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                <img src={url} alt={`Galeria ${idx + 1}`} className="h-full w-full object-cover" />
                <div className="absolute inset-x-1 top-1 flex justify-between opacity-0 transition group-hover:opacity-100">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (idx === 0) return;
                        const next = [...design.galeria];
                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                        update({ galeria: next });
                      }}
                      className="rounded bg-background/80 p-1 hover:bg-background"
                      aria-label="Mover para trás"
                    >
                      <ArrowUp className="h-3.5 w-3.5 -rotate-90" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (idx === design.galeria.length - 1) return;
                        const next = [...design.galeria];
                        [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                        update({ galeria: next });
                      }}
                      className="rounded bg-background/80 p-1 hover:bg-background"
                      aria-label="Mover para frente"
                    >
                      <ArrowUp className="h-3.5 w-3.5 rotate-90" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => update({ galeria: design.galeria.filter((_, i) => i !== idx) })}
                    className="rounded bg-destructive/90 p-1 text-destructive-foreground hover:bg-destructive"
                    aria-label="Remover"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* SAVE BAR */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <p className="text-xs text-muted-foreground">
          {dirty ? "Alterações não salvas. Uploads já foram enviados." : "Todas as alterações salvas."}
        </p>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !dirty}>
          {save.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}

/* --------------------- Reusable subcomponents --------------------- */

function SingleImageCard({
  title, desc, value, folder, aspect, onChange,
}: {
  title: string;
  desc: string;
  value: string | null;
  folder: string;
  aspect: "square" | "wide";
  onChange: (url: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className={cn(
          "grid shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted",
          aspect === "square" ? "h-28 w-28" : "aspect-[16/6] w-full max-w-sm",
        )}>
          {value ? (
            <img src={value} alt={title} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {value ? "Substituir" : "Enviar imagem"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.currentTarget.value = "";
                if (!file) return;
                setBusy(true);
                try {
                  const url = await uploadImage(file, folder);
                  onChange(url);
                  toast.success("Imagem enviada");
                } catch (err: any) { toast.error(err.message); }
                finally { setBusy(false); }
              }}
            />
          </label>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <Trash2 className="mr-1 h-4 w-4" /> Remover
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function CarrosselRow({
  item, index, total, onChange, onRemove, onMove,
}: {
  item: CarrosselItem;
  index: number;
  total: number;
  onChange: (patch: Partial<CarrosselItem>) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className={cn("rounded-lg border p-3", item.ativo ? "border-primary/40 bg-primary/[0.03]" : "border-border opacity-70")}>
      <div className="grid gap-3 sm:grid-cols-[140px,1fr,auto]">
        <div className="grid aspect-[16/9] place-items-center overflow-hidden rounded-md border border-border bg-muted">
          {item.image_url ? (
            <img src={item.image_url} alt="Banner" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
          )}
        </div>
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Título (opcional)</Label>
              <Input value={item.titulo ?? ""} onChange={(e) => onChange({ titulo: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Link ou ação (opcional)</Label>
              <Input placeholder="/categoria/promocoes" value={item.link ?? ""} onChange={(e) => onChange({ link: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Descrição (opcional)</Label>
            <Textarea rows={2} value={item.descricao ?? ""} onChange={(e) => onChange({ descricao: e.target.value })} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {item.image_url ? "Trocar imagem" : "Enviar imagem"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.currentTarget.value = "";
                  if (!file) return;
                  setBusy(true);
                  try { onChange({ image_url: await uploadImage(file, "carrossel") }); }
                  catch (err: any) { toast.error(err.message); }
                  finally { setBusy(false); }
                }}
              />
            </label>
            <div className="ml-auto flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs">
                <Switch checked={item.ativo} onCheckedChange={(v) => onChange({ ativo: v })} />
                {item.ativo ? "Ativo" : "Inativo"}
              </label>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Button type="button" variant="outline" size="icon" disabled={index === 0} onClick={() => onMove("up")} aria-label="Subir"><ArrowUp className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="icon" disabled={index === total - 1} onClick={() => onMove("down")} aria-label="Descer"><ArrowDown className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Remover"><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>
    </div>
  );
}
