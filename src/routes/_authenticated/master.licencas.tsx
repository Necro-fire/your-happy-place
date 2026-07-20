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
  Copy, KeyRound, Download, Filter, ExternalLink, MoreHorizontal,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/master/licencas")({
  component: LicencasMaster,
});

type License = {
  id: string; codigo: string; tenant_id: string | null; plano: string; tipo: string;
  situacao: string; emitida_em: string; vence_em: string | null; valor: number | null;
  observacoes: string | null;
};
type TenantLite = { id: string; codigo: string; nome: string; empresa: string | null; slug?: string | null; public_codigo?: string | null };

const SIT_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  ativa:     { bg: "bg-[#ecfdf5]", text: "text-[#059669]", dot: "bg-[#10b981]", label: "Ativa" },
  pendente:  { bg: "bg-[#fffbeb]", text: "text-[#d97706]", dot: "bg-[#f59e0b]", label: "Pendente" },
  expirada:  { bg: "bg-[#f1f5f9]", text: "text-[#475569]", dot: "bg-[#94a3b8]", label: "Expirada" },
  cancelada: { bg: "bg-[#f5f3ff]", text: "text-[#7c3aed]", dot: "bg-[#8b5cf6]", label: "Cancelada" },
  bloqueada: { bg: "bg-[#fef2f2]", text: "text-[#dc2626]", dot: "bg-[#ef4444]", label: "Bloqueada" },
  suspensa:  { bg: "bg-[#fff7ed]", text: "text-[#c2410c]", dot: "bg-[#f97316]", label: "Suspensa" },
};

const PLAN_STYLES: Record<string, string> = {
  basico:       "bg-[#f1f5f9] text-[#475569]",
  profissional: "bg-[#eff6ff] text-[#2563eb]",
  enterprise:   "bg-[#f5f3ff] text-[#7c3aed]",
  demo:         "bg-[#fffbeb] text-[#d97706]",
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
    queryFn: async () => (await supabase.from("tenants").select("id, codigo, nome, empresa, slug, public_codigo").order("nome")).data as TenantLite[] ?? [],
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

  async function copyText(text: string, label = "Copiado") {
    try { await navigator.clipboard.writeText(text); toast.success(label); }
    catch { toast.error("Não foi possível copiar"); }
  }

  const filterChips = [
    { k: "todos", label: "Todas", count: licenses.length },
    { k: "ativa", label: "Ativas", count: licenses.filter(l => l.situacao === "ativa").length },
    { k: "pendente", label: "Pendentes", count: licenses.filter(l => l.situacao === "pendente").length },
    { k: "bloqueada", label: "Bloqueadas", count: licenses.filter(l => l.situacao === "bloqueada").length },
    { k: "expirada", label: "Expiradas", count: licenses.filter(l => l.situacao === "expirada").length },
    { k: "cancelada", label: "Canceladas", count: licenses.filter(l => l.situacao === "cancelada").length },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-[#0f172a]">Empresas e Licenças</h1>
          <p className="mt-1 text-[14px] text-[#6b7280]">Emissão, renovação, bloqueio e histórico de licenças.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="ms-btn ms-btn--sm">
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button
            onClick={() => setEditing({ tipo: "mensal", situacao: "ativa", plano: "basico" })}
            className="ms-btn ms-btn--primary ms-btn--sm"
          >
            <Plus className="h-4 w-4" /> Nova licença
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="ms-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar empresa, código ou responsável..."
              className="ms-input"
            />
          </div>
          <button className="ms-btn ms-btn--sm">
            <Filter className="h-4 w-4" /> Filtros
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[#e5e7eb] pt-3">
          {filterChips.map((c) => {
            const active = filter === c.k;
            return (
              <button
                key={c.k}
                onClick={() => setFilter(c.k)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                  active ? "bg-[#0f172a] text-white" : "bg-[#f1f5f9] text-[#4b5563] hover:bg-[#e5e7eb]"
                }`}
              >
                {c.label}
                <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/20" : "bg-white text-[#6b7280]"}`}>
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="ms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ms-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Validade</th>
                <th>Chave</th>
                <th>Valor</th>
                <th className="!text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="!py-16 text-center text-[13px] text-[#9ca3af]">Nenhuma licença encontrada.</td></tr>
              )}
              {filtered.map((l) => {
                const t = l.tenant_id ? tenantMap.get(l.tenant_id) : null;
                const sit = SIT_STYLES[l.situacao] ?? SIT_STYLES.expirada;
                const initial = (t?.empresa ?? t?.nome ?? "?").slice(0, 1).toUpperCase();
                const menuUrl = t?.slug ? `/cardapio/${t.slug}` : t?.public_codigo ? `/c/${t.public_codigo}` : null;
                return (
                  <tr key={l.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eff6ff] text-[13px] font-semibold text-[#2563eb]">
                          {initial}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-medium text-[#0f172a]">
                            {t ? (t.empresa || t.nome) : "—"}
                          </div>
                          <div className="truncate text-[12px] text-[#9ca3af]">
                            ID: {t?.codigo ?? "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`ms-badge capitalize ${PLAN_STYLES[l.plano] ?? "bg-[#f1f5f9] text-[#475569]"}`}>
                        {l.plano}
                      </span>
                    </td>
                    <td>
                      <span className={`ms-badge ${sit.bg} ${sit.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${sit.dot}`} />
                        {sit.label}
                      </span>
                    </td>
                    <td className="text-[13px] text-[#4b5563]">
                      {l.vence_em ? fmtDate(l.vence_em) : "—"}
                    </td>
                    <td>
                      <button
                        onClick={() => copyText(l.codigo, "Chave copiada")}
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[12px] text-[#4b5563] hover:bg-[#f9fafb]"
                        title="Copiar chave"
                      >
                        {l.codigo}
                        <Copy className="h-3 w-3 text-[#9ca3af]" />
                      </button>
                    </td>
                    <td className="text-[13px] font-medium text-[#0f172a]">
                      {fmtMoney(Number(l.valor ?? 0))}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {menuUrl && (
                          <a
                            href={menuUrl} target="_blank" rel="noreferrer"
                            title="Abrir cardápio público"
                            className="grid h-8 w-8 place-items-center rounded-lg text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <button title="Editar" onClick={() => setEditing(l)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0f172a]">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button title="Editar" onClick={() => setEditing(l)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0f172a]">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {l.situacao !== "ativa" && (
                          <button title="Liberar" onClick={() => changeSit.mutate({ id: l.id, situacao: "ativa" })}
                            className="grid h-8 w-8 place-items-center rounded-lg text-[#059669] hover:bg-[#ecfdf5]">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {l.situacao === "ativa" && (
                          <button title="Suspender" onClick={() => changeSit.mutate({ id: l.id, situacao: "suspensa" })}
                            className="grid h-8 w-8 place-items-center rounded-lg text-[#d97706] hover:bg-[#fffbeb]">
                            <PauseCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button title="Renovar" onClick={() => renew.mutate(l)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[#2563eb] hover:bg-[#eff6ff]">
                          <RotateCw className="h-4 w-4" />
                        </button>
                        {l.situacao !== "bloqueada" && (
                          <button title="Bloquear" onClick={async () => {
                            const ok = await dialog.confirm({ title: "Bloquear licença?", destructive: true, confirmText: "Bloquear" });
                            if (ok) changeSit.mutate({ id: l.id, situacao: "bloqueada" });
                          }} className="grid h-8 w-8 place-items-center rounded-lg text-[#dc2626] hover:bg-[#fef2f2]">
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        <button title="Excluir" onClick={async () => {
                          const ok = await dialog.confirm({ title: "Excluir licença?", destructive: true, confirmText: "Excluir" });
                          if (ok) remove.mutate(l.id);
                        }} className="grid h-8 w-8 place-items-center rounded-lg text-[#9ca3af] hover:bg-[#fef2f2] hover:text-[#dc2626]">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button title="Mais opções" className="grid h-8 w-8 place-items-center rounded-lg text-[#9ca3af] hover:bg-[#f1f5f9] hover:text-[#0f172a]">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#e5e7eb] px-6 py-3 text-[12px] text-[#6b7280]">
            <span>Mostrando <b className="text-[#0f172a]">{filtered.length}</b> de <b className="text-[#0f172a]">{licenses.length}</b> licenças</span>
            <span className="inline-flex items-center gap-1">
              <KeyRound className="h-3.5 w-3.5" /> Chaves geradas automaticamente
            </span>
          </div>
        )}
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
