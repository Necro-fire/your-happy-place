import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { dialog } from "@/components/ui/app-dialog";
import { logMaster } from "@/lib/master-log";
import { fmtDate, fmtMoney } from "@/lib/format";
import {
  Plus, Pencil, Ban, RotateCw, Trash2, CheckCircle2, PauseCircle, Search, Eye,
  Copy, KeyRound, Sparkles, Heart,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/master/licencas")({
  component: LicencasMaster,
});

type License = {
  id: string; codigo: string; tenant_id: string | null; plano: string; tipo: string;
  situacao: string; emitida_em: string; vence_em: string | null; valor: number | null;
  observacoes: string | null;
};
type TenantLite = { id: string; codigo: string; nome: string; empresa: string | null };

const SIT_STYLES: Record<string, string> = {
  ativa: "border-emerald-600 bg-emerald-100 text-emerald-700",
  pendente: "border-yellow-600 bg-yellow-100 text-yellow-700",
  expirada: "border-slate-500 bg-slate-100 text-slate-600",
  cancelada: "border-purple-600 bg-purple-100 text-purple-700",
  bloqueada: "border-red-600 bg-red-100 text-red-700",
  suspensa: "border-orange-600 bg-orange-100 text-orange-700",
};
const SIT_DOT: Record<string, string> = {
  ativa: "bg-emerald-600",
  pendente: "bg-yellow-500",
  expirada: "bg-slate-400",
  cancelada: "bg-purple-600",
  bloqueada: "bg-red-600",
  suspensa: "bg-orange-500",
};

function LicencasMaster() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<License> | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("todos");

  const { data: licenses = [] } = useQuery({
    queryKey: ["master-licenses"],
    queryFn: async () => (await supabase.from("licenses").select("*").order("created_at", { ascending: false })).data as License[] ?? [],
  });
  const { data: tenants = [] } = useQuery({
    queryKey: ["master-tenants-lite"],
    queryFn: async () => (await supabase.from("tenants").select("id, codigo, nome, empresa").order("nome")).data as TenantLite[] ?? [],
  });

  const tenantMap = useMemo(() => new Map(tenants.map((t) => [t.id, t])), [tenants]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return licenses.filter((l) => {
      if (filter !== "todos" && l.situacao !== filter) return false;
      if (!s) return true;
      const t = l.tenant_id ? tenantMap.get(l.tenant_id) : null;
      return (
        l.codigo.toLowerCase().includes(s) ||
        (t?.nome ?? "").toLowerCase().includes(s) ||
        (t?.empresa ?? "").toLowerCase().includes(s)
      );
    });
  }, [licenses, filter, q, tenantMap]);

  const save = useMutation({
    mutationFn: async (l: Partial<License>) => {
      if (l.id) {
        const { id, codigo: _c, ...rest } = l; void _c;
        const { error } = await supabase.from("licenses").update(rest).eq("id", id);
        if (error) throw error;
        await logMaster("license.update", "license", id, {});
      } else {
        const { id: _i, codigo: _c, ...rest } = l; void _i; void _c;
        const { data, error } = await supabase.from("licenses").insert(rest as never).select().single();
        if (error) throw error;
        await logMaster("license.create", "license", data.id, { codigo: data.codigo });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-licenses"] }); qc.invalidateQueries({ queryKey: ["master-dashboard"] }); setEditing(null); toast.success("Licença salva"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeSit = useMutation({
    mutationFn: async ({ id, situacao }: { id: string; situacao: string }) => {
      const { error } = await supabase.from("licenses").update({ situacao }).eq("id", id);
      if (error) throw error;
      await logMaster("license.status", "license", id, { situacao });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-licenses"] }); qc.invalidateQueries({ queryKey: ["master-dashboard"] }); toast.success("Situação atualizada"); },
  });

  const renew = useMutation({
    mutationFn: async (l: License) => {
      const dias = l.tipo === "trimestral" ? 90 : l.tipo === "semestral" ? 180 : l.tipo === "anual" ? 365 : 30;
      const base = l.vence_em && new Date(l.vence_em) > new Date() ? new Date(l.vence_em) : new Date();
      base.setDate(base.getDate() + dias);
      const { error } = await supabase.from("licenses").update({ vence_em: base.toISOString(), situacao: "ativa" }).eq("id", l.id);
      if (error) throw error;
      await logMaster("license.renew", "license", l.id, { dias });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-licenses"] }); toast.success("Licença renovada"); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("licenses").delete().eq("id", id);
      if (error) throw error;
      await logMaster("license.delete", "license", id, {});
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-licenses"] }); toast.success("Licença excluída"); },
  });

  async function copyKey(codigo: string) {
    try { await navigator.clipboard.writeText(codigo); toast.success("Chave copiada"); }
    catch { toast.error("Não foi possível copiar"); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative flex flex-wrap items-end justify-between gap-3 pt-2">
        <Sparkles className="doodle-scribble -top-3 left-40 h-6 w-6 rotate-12 text-yellow-400 doodle-wiggle" />
        <div>
          <h1 className="text-3xl font-bold">Controle de Licenças <span className="inline-block">🔑</span></h1>
          <p className="mt-1 text-slate-500 underline decoration-orange-300 decoration-wavy underline-offset-4">
            Emissão, renovação, cancelamento e transferência de licenças.
          </p>
        </div>
        <button
          onClick={() => setEditing({ tipo: "mensal", situacao: "ativa", plano: "basico" })}
          className="doodle-btn doodle-btn--primary flex items-center gap-2 rounded-full px-5 py-2.5"
        >
          <Plus className="h-4 w-4" /> Nova licença
        </button>
      </div>

      {/* Filters */}
      <div className="doodle-card rounded-[22px_16px_26px_14px] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por código, empresa ou responsável..."
              className="doodle-input w-full pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["todos", "ativa", "pendente", "bloqueada", "expirada", "cancelada"].map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`doodle-btn rounded-full px-3 py-1.5 text-xs uppercase ${filter === k ? "doodle-btn--primary" : ""}`}
              >
                {k === "todos" ? "Todas" : k}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table + side panel */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="doodle-card doodle-card--lg relative overflow-hidden rounded-[24px_36px_16px_28px] p-6">
          <Heart className="doodle-scribble -bottom-2 -right-3 h-14 w-14 fill-orange-100 text-orange-200" />
          <div className="overflow-x-auto">
            <table className="doodle-table w-full text-sm">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Plano</th>
                  <th>Situação</th>
                  <th>Emissão</th>
                  <th>Vencimento</th>
                  <th className="text-right">Valor</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-400">Nenhuma licença encontrada.</td></tr>
                )}
                {filtered.map((l) => {
                  const t = l.tenant_id ? tenantMap.get(l.tenant_id) : null;
                  const sit = l.situacao;
                  return (
                    <tr key={l.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-slate-900 bg-orange-100 text-lg">
                            {(t?.empresa ?? t?.nome ?? "?").slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-bold">{t ? (t.empresa || t.nome) : "—"}</div>
                            <div className="truncate font-mono text-[11px] text-slate-400">{l.codigo}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="doodle-badge border-purple-400 bg-purple-100 text-purple-700 capitalize">{l.plano}</span>
                      </td>
                      <td>
                        <span className={`doodle-badge capitalize ${SIT_STYLES[sit] ?? "border-slate-400 bg-slate-100 text-slate-600"}`}>
                          <span className={`h-2 w-2 rounded-full ${SIT_DOT[sit] ?? "bg-slate-400"}`} />
                          {sit}
                        </span>
                      </td>
                      <td className="text-slate-500">{fmtDate(l.emitida_em)}</td>
                      <td className="font-bold">{l.vence_em ? fmtDate(l.vence_em) : "—"}</td>
                      <td className="text-right font-bold">{fmtMoney(Number(l.valor ?? 0))}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <button title="Copiar chave" onClick={() => copyKey(l.codigo)} className="doodle-btn doodle-btn--icon">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          {sit !== "ativa" && (
                            <button title="Liberar" onClick={() => changeSit.mutate({ id: l.id, situacao: "ativa" })} className="doodle-btn doodle-btn--icon bg-emerald-100">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                            </button>
                          )}
                          {sit === "ativa" && (
                            <button title="Suspender" onClick={() => changeSit.mutate({ id: l.id, situacao: "suspensa" })} className="doodle-btn doodle-btn--icon bg-yellow-100">
                              <PauseCircle className="h-3.5 w-3.5 text-yellow-700" />
                            </button>
                          )}
                          <button title="Renovar" onClick={() => renew.mutate(l)} className="doodle-btn doodle-btn--icon bg-blue-100">
                            <RotateCw className="h-3.5 w-3.5 text-blue-700" />
                          </button>
                          <button title="Editar" onClick={() => setEditing(l)} className="doodle-btn doodle-btn--icon">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button title="Visualizar" onClick={() => setEditing(l)} className="doodle-btn doodle-btn--icon">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {sit !== "bloqueada" ? (
                            <button title="Bloquear" onClick={async () => {
                              const ok = await dialog.confirm({ title: "Bloquear licença?", destructive: true, confirmText: "Bloquear" });
                              if (ok) changeSit.mutate({ id: l.id, situacao: "bloqueada" });
                            }} className="doodle-btn doodle-btn--icon bg-red-100">
                              <Ban className="h-3.5 w-3.5 text-red-700" />
                            </button>
                          ) : null}
                          <button title="Excluir" onClick={async () => {
                            const ok = await dialog.confirm({ title: "Excluir licença?", destructive: true, confirmText: "Excluir" });
                            if (ok) remove.mutate(l.id);
                          }} className="doodle-btn doodle-btn--icon bg-red-50">
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side panel */}
        <aside className="space-y-6">
          <div className="doodle-card relative rounded-[28px_14px_22px_18px] p-6">
            <Sparkles className="doodle-scribble -right-1 -top-2 h-6 w-6 text-yellow-400" />
            <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <KeyRound className="h-5 w-5 text-orange-500" /> Ações Rápidas
            </h3>
            <div className="space-y-2">
              <button onClick={() => setEditing({ tipo: "mensal", situacao: "ativa", plano: "basico" })} className="doodle-btn flex w-full items-center gap-3 rounded-2xl p-3 text-sm">
                <span className="grid h-8 w-8 place-items-center rounded-xl border-2 border-slate-900 bg-emerald-100"><Plus className="h-3.5 w-3.5 text-emerald-700" /></span>
                Nova Licença
              </button>
              <div className="doodle-btn flex w-full items-center gap-3 rounded-2xl p-3 text-sm">
                <span className="grid h-8 w-8 place-items-center rounded-xl border-2 border-slate-900 bg-blue-100"><RotateCw className="h-3.5 w-3.5 text-blue-700" /></span>
                Renovar em massa
                <span className="ml-auto rounded-full border border-slate-300 bg-slate-100 px-1.5 text-[9px] font-bold uppercase text-slate-500">em breve</span>
              </div>
              <div className="doodle-btn flex w-full items-center gap-3 rounded-2xl p-3 text-sm">
                <span className="grid h-8 w-8 place-items-center rounded-xl border-2 border-slate-900 bg-orange-100"><KeyRound className="h-3.5 w-3.5 text-orange-700" /></span>
                Gerar nova chave
                <span className="ml-auto rounded-full border border-slate-300 bg-slate-100 px-1.5 text-[9px] font-bold uppercase text-slate-500">em breve</span>
              </div>
            </div>
          </div>

          <div className="doodle-card relative rounded-[16px_28px_20px_24px] p-6">
            <h3 className="mb-4 text-xl font-bold">Resumo</h3>
            <ul className="space-y-2 text-sm font-bold">
              {(["ativa", "pendente", "bloqueada", "suspensa", "expirada", "cancelada"] as const).map((k) => {
                const n = licenses.filter((x) => x.situacao === k).length;
                return (
                  <li key={k} className="flex items-center justify-between capitalize">
                    <span className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full border border-slate-900 ${SIT_DOT[k]}`} /> {k}
                    </span>
                    <span>{n}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>

      {/* Editor dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar licença" : "Nova licença"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Empresa</Label>
                <Select value={editing.tenant_id ?? ""} onValueChange={(v) => setEditing({ ...editing, tenant_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.codigo} — {t.empresa || t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plano</Label>
                <Select value={editing.plano ?? "basico"} onValueChange={(v) => setEditing({ ...editing, plano: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basico">Básico</SelectItem>
                    <SelectItem value="profissional">Profissional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="demo">Demonstração</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={editing.tipo ?? "mensal"} onValueChange={(v) => setEditing({ ...editing, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                    <SelectItem value="vitalicia">Vitalícia</SelectItem>
                    <SelectItem value="demonstracao">Demonstração</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Situação</Label>
                <Select value={editing.situacao ?? "ativa"} onValueChange={(v) => setEditing({ ...editing, situacao: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="suspensa">Suspensa</SelectItem>
                    <SelectItem value="bloqueada">Bloqueada</SelectItem>
                    <SelectItem value="expirada">Expirada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={editing.valor ?? 0} onChange={(e) => setEditing({ ...editing, valor: Number(e.target.value) })} /></div>
              <div><Label>Vencimento</Label><Input type="date" value={editing.vence_em?.slice(0, 10) ?? ""} onChange={(e) => setEditing({ ...editing, vence_em: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
              <div className="md:col-span-2"><Label>Observações</Label><Input value={editing.observacoes ?? ""} onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button disabled={!editing?.tenant_id} onClick={() => editing && save.mutate(editing)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
