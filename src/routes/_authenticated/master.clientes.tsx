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
import { fmtDate } from "@/lib/format";
import { maskPhone, maskCPFOrCNPJ } from "@/lib/masks";
import { Plus, Pencil, Ban, CheckCircle2, Trash2, RotateCw, Search, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/master/clientes")({
  component: ClientesMaster,
});

type Tenant = {
  id: string; codigo: string; nome: string; empresa: string | null; documento: string | null;
  email: string | null; telefone: string | null; whatsapp: string | null; cidade: string | null;
  estado: string | null; segmento: string | null; plano: string; status: string;
  versao_instalada: string | null; ultimo_acesso: string | null; ultima_sync: string | null;
  ativado_em: string | null; vence_em: string | null; observacoes: string | null;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  ativo:      { bg: "bg-[#ecfdf5]", text: "text-[#059669]", dot: "bg-[#10b981]", label: "Ativo" },
  teste:      { bg: "bg-[#fffbeb]", text: "text-[#d97706]", dot: "bg-[#f59e0b]", label: "Em teste" },
  bloqueado:  { bg: "bg-[#fef2f2]", text: "text-[#dc2626]", dot: "bg-[#ef4444]", label: "Bloqueado" },
  cancelado:  { bg: "bg-[#f5f3ff]", text: "text-[#7c3aed]", dot: "bg-[#8b5cf6]", label: "Cancelado" },
};

const PLAN_STYLES: Record<string, string> = {
  basico:       "bg-[#f1f5f9] text-[#475569]",
  profissional: "bg-[#eff6ff] text-[#2563eb]",
  enterprise:   "bg-[#f5f3ff] text-[#7c3aed]",
  demo:         "bg-[#fffbeb] text-[#d97706]",
};

function ClientesMaster() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [editing, setEditing] = useState<Partial<Tenant> | null>(null);

  const { data: tenants = [] } = useQuery({
    queryKey: ["master-tenants"],
    queryFn: async () => (await supabase.from("tenants").select("*").order("created_at", { ascending: false })).data as Tenant[] ?? [],
  });

  const filtered = useMemo(() => tenants.filter((t) => {
    if (statusFilter !== "todos" && t.status !== statusFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (t.nome + " " + (t.empresa ?? "") + " " + t.codigo + " " + (t.email ?? "") + " " + (t.documento ?? "")).toLowerCase().includes(s);
  }), [tenants, statusFilter, q]);

  const save = useMutation({
    mutationFn: async (t: Partial<Tenant>) => {
      if (t.id) {
        const { id, codigo: _c, ...rest } = t; void _c;
        const { error } = await supabase.from("tenants").update(rest).eq("id", id);
        if (error) throw error;
        await logMaster("tenant.update", "tenant", id, { nome: t.nome });
      } else {
        const { id: _i, codigo: _c, ...rest } = t; void _i; void _c;
        const { data, error } = await supabase.from("tenants").insert(rest as never).select().single();
        if (error) throw error;
        await logMaster("tenant.create", "tenant", data.id, { nome: data.nome, codigo: data.codigo });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-tenants"] }); qc.invalidateQueries({ queryKey: ["master-dashboard"] }); setEditing(null); toast.success("Empresa salva"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tenants").update({ status }).eq("id", id);
      if (error) throw error;
      await logMaster("tenant.status", "tenant", id, { status });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-tenants"] }); qc.invalidateQueries({ queryKey: ["master-dashboard"] }); toast.success("Status atualizado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
      await logMaster("tenant.delete", "tenant", id, {});
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-tenants"] }); qc.invalidateQueries({ queryKey: ["master-dashboard"] }); toast.success("Empresa excluída"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const chips = [
    { k: "todos", label: "Todas", count: tenants.length },
    { k: "ativo", label: "Ativas", count: tenants.filter(t => t.status === "ativo").length },
    { k: "teste", label: "Em teste", count: tenants.filter(t => t.status === "teste").length },
    { k: "bloqueado", label: "Bloqueadas", count: tenants.filter(t => t.status === "bloqueado").length },
    { k: "cancelado", label: "Canceladas", count: tenants.filter(t => t.status === "cancelado").length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-[#0f172a]">Empresas</h1>
          <p className="mt-1 text-[14px] text-[#6b7280]">Cadastro, planos, status e ciclo de vida das empresas contratantes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="ms-btn ms-btn--sm"><Download className="h-4 w-4" /> Exportar</button>
          <button onClick={() => setEditing({ status: "ativo", plano: "basico" })} className="ms-btn ms-btn--primary ms-btn--sm">
            <Plus className="h-4 w-4" /> Nova empresa
          </button>
        </div>
      </div>

      <div className="ms-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, nome, empresa, email..." className="ms-input" />
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[#e5e7eb] pt-3">
          {chips.map((c) => {
            const active = statusFilter === c.k;
            return (
              <button key={c.k} onClick={() => setStatusFilter(c.k)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                  active ? "bg-[#0f172a] text-white" : "bg-[#f1f5f9] text-[#4b5563] hover:bg-[#e5e7eb]"
                }`}>
                {c.label}
                <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/20" : "bg-white text-[#6b7280]"}`}>{c.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="ms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ms-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Contato</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Vencimento</th>
                <th>Último acesso</th>
                <th className="!text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="!py-16 text-center text-[13px] text-[#9ca3af]">Nenhuma empresa cadastrada.</td></tr>
              )}
              {filtered.map((t) => {
                const st = STATUS_STYLES[t.status] ?? STATUS_STYLES.ativo;
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eff6ff] text-[13px] font-semibold text-[#2563eb]">
                          {(t.empresa ?? t.nome).slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-medium text-[#0f172a]">{t.empresa || t.nome}</div>
                          <div className="truncate text-[12px] text-[#9ca3af]">ID: {t.codigo}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-[13px] text-[#0f172a]">{t.nome}</div>
                      <div className="text-[12px] text-[#6b7280]">{t.email ?? "—"}</div>
                    </td>
                    <td><span className={`ms-badge capitalize ${PLAN_STYLES[t.plano] ?? "bg-[#f1f5f9] text-[#475569]"}`}>{t.plano}</span></td>
                    <td>
                      <span className={`ms-badge ${st.bg} ${st.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </td>
                    <td className="text-[13px] text-[#4b5563]">{t.vence_em ? fmtDate(t.vence_em) : "—"}</td>
                    <td className="text-[13px] text-[#6b7280]">{t.ultimo_acesso ? fmtDate(t.ultimo_acesso) : "—"}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button title="Editar" onClick={() => setEditing(t)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0f172a]">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {t.status !== "bloqueado" ? (
                          <button title="Bloquear" onClick={async () => {
                            const ok = await dialog.confirm({ title: "Bloquear empresa?", description: `${t.empresa || t.nome} não poderá mais acessar.`, confirmText: "Bloquear", destructive: true });
                            if (ok) changeStatus.mutate({ id: t.id, status: "bloqueado" });
                          }} className="grid h-8 w-8 place-items-center rounded-lg text-[#dc2626] hover:bg-[#fef2f2]">
                            <Ban className="h-4 w-4" />
                          </button>
                        ) : (
                          <button title="Reativar" onClick={() => changeStatus.mutate({ id: t.id, status: "ativo" })}
                            className="grid h-8 w-8 place-items-center rounded-lg text-[#059669] hover:bg-[#ecfdf5]">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        <button title="Renovar (+30d)" onClick={async () => {
                          const vence = new Date(); vence.setDate(vence.getDate() + 30);
                          await supabase.from("tenants").update({ vence_em: vence.toISOString(), status: "ativo" }).eq("id", t.id);
                          await logMaster("tenant.renew", "tenant", t.id, { dias: 30 });
                          qc.invalidateQueries({ queryKey: ["master-tenants"] });
                          toast.success("Renovado por 30 dias");
                        }} className="grid h-8 w-8 place-items-center rounded-lg text-[#2563eb] hover:bg-[#eff6ff]">
                          <RotateCw className="h-4 w-4" />
                        </button>
                        <button title="Excluir" onClick={async () => {
                          const ok = await dialog.confirm({ title: "Excluir empresa?", description: "Ação irreversível. Todas as licenças da empresa também serão removidas.", confirmText: "Excluir", destructive: true });
                          if (ok) remove.mutate(t.id);
                        }} className="grid h-8 w-8 place-items-center rounded-lg text-[#9ca3af] hover:bg-[#fef2f2] hover:text-[#dc2626]">
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar empresa" : "Nova empresa"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2"><Label>Nome do responsável *</Label><Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
              <div><Label>Empresa</Label><Input value={editing.empresa ?? ""} onChange={(e) => setEditing({ ...editing, empresa: e.target.value })} /></div>
              <div><Label>Documento (CPF/CNPJ)</Label><Input value={editing.documento ?? ""} onChange={(e) => setEditing({ ...editing, documento: maskCPFOrCNPJ(e.target.value) })} /></div>
              <div><Label>Email</Label><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={editing.telefone ?? ""} onChange={(e) => setEditing({ ...editing, telefone: maskPhone(e.target.value) })} /></div>
              <div><Label>WhatsApp</Label><Input value={editing.whatsapp ?? ""} onChange={(e) => setEditing({ ...editing, whatsapp: maskPhone(e.target.value) })} /></div>
              <div><Label>Segmento</Label><Input value={editing.segmento ?? ""} onChange={(e) => setEditing({ ...editing, segmento: e.target.value })} /></div>
              <div><Label>Cidade</Label><Input value={editing.cidade ?? ""} onChange={(e) => setEditing({ ...editing, cidade: e.target.value })} /></div>
              <div><Label>Estado (UF)</Label><Input maxLength={2} value={editing.estado ?? ""} onChange={(e) => setEditing({ ...editing, estado: e.target.value.toUpperCase() })} /></div>
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
                <Label>Status</Label>
                <Select value={editing.status ?? "ativo"} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="teste">Em teste</SelectItem>
                    <SelectItem value="bloqueado">Bloqueado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Versão instalada</Label><Input value={editing.versao_instalada ?? ""} onChange={(e) => setEditing({ ...editing, versao_instalada: e.target.value })} /></div>
              <div><Label>Vencimento</Label><Input type="date" value={editing.vence_em?.slice(0, 10) ?? ""} onChange={(e) => setEditing({ ...editing, vence_em: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
              <div className="md:col-span-2"><Label>Observações</Label><Input value={editing.observacoes ?? ""} onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button disabled={!editing?.nome} onClick={() => editing && save.mutate(editing)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
