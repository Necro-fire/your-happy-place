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
import { Plus, Pencil, Ban, CheckCircle2, Trash2, RotateCw, Search, Sparkles } from "lucide-react";

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

const STATUS_STYLES: Record<string, string> = {
  ativo: "border-emerald-600 bg-emerald-100 text-emerald-700",
  teste: "border-yellow-600 bg-yellow-100 text-yellow-700",
  bloqueado: "border-red-600 bg-red-100 text-red-700",
  cancelado: "border-purple-600 bg-purple-100 text-purple-700",
};
const STATUS_DOT: Record<string, string> = {
  ativo: "bg-emerald-600", teste: "bg-yellow-500", bloqueado: "bg-red-600", cancelado: "bg-purple-600",
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

  return (
    <div className="space-y-6">
      <div className="relative flex flex-wrap items-end justify-between gap-3 pt-2">
        <Sparkles className="doodle-scribble -top-2 left-52 h-6 w-6 text-yellow-400 doodle-wiggle" />
        <div>
          <h1 className="text-3xl font-bold">Empresas Cadastradas 🏢</h1>
          <p className="mt-1 text-slate-500 underline decoration-orange-300 decoration-wavy underline-offset-4">
            Cadastro, planos, status e ciclo de vida das empresas contratantes.
          </p>
        </div>
        <button
          onClick={() => setEditing({ status: "ativo", plano: "basico" })}
          className="doodle-btn doodle-btn--primary flex items-center gap-2 rounded-full px-5 py-2.5"
        >
          <Plus className="h-4 w-4" /> Nova empresa
        </button>
      </div>

      <div className="doodle-card rounded-[22px_16px_26px_14px] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, nome, empresa, email..." className="doodle-input w-full pl-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            {["todos", "ativo", "teste", "bloqueado", "cancelado"].map((k) => (
              <button
                key={k}
                onClick={() => setStatusFilter(k)}
                className={`doodle-btn rounded-full px-3 py-1.5 text-xs uppercase ${statusFilter === k ? "doodle-btn--primary" : ""}`}
              >
                {k === "todos" ? "Todos" : k}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="doodle-card doodle-card--lg overflow-hidden rounded-[24px_36px_16px_28px] p-6">
        <div className="overflow-x-auto">
          <table className="doodle-table w-full text-sm">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Contato</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Vence</th>
                <th>Último acesso</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">Nenhuma empresa cadastrada.</td></tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-slate-900 bg-orange-100 text-lg font-bold">
                        {(t.empresa ?? t.nome).slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-bold">{t.empresa || t.nome}</div>
                        <div className="truncate font-mono text-[11px] text-slate-400">{t.codigo}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-slate-600">
                    <div className="truncate">{t.email ?? "—"}</div>
                    <div className="truncate text-xs text-slate-400">{t.telefone ?? ""}</div>
                  </td>
                  <td><span className="doodle-badge border-purple-400 bg-purple-100 text-purple-700 capitalize">{t.plano}</span></td>
                  <td>
                    <span className={`doodle-badge capitalize ${STATUS_STYLES[t.status] ?? "border-slate-400 bg-slate-100 text-slate-600"}`}>
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[t.status] ?? "bg-slate-400"}`} />
                      {t.status}
                    </span>
                  </td>
                  <td className="font-bold">{t.vence_em ? fmtDate(t.vence_em) : "—"}</td>
                  <td className="text-slate-500">{t.ultimo_acesso ? fmtDate(t.ultimo_acesso) : "—"}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1.5">
                      <button title="Editar" onClick={() => setEditing(t)} className="doodle-btn doodle-btn--icon"><Pencil className="h-3.5 w-3.5" /></button>
                      {t.status !== "bloqueado" ? (
                        <button title="Bloquear" onClick={async () => {
                          const ok = await dialog.confirm({ title: "Bloquear empresa?", description: `${t.empresa || t.nome} não poderá mais acessar.`, confirmText: "Bloquear", destructive: true });
                          if (ok) changeStatus.mutate({ id: t.id, status: "bloqueado" });
                        }} className="doodle-btn doodle-btn--icon bg-red-100">
                          <Ban className="h-3.5 w-3.5 text-red-700" />
                        </button>
                      ) : (
                        <button title="Reativar" onClick={() => changeStatus.mutate({ id: t.id, status: "ativo" })} className="doodle-btn doodle-btn--icon bg-emerald-100">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                        </button>
                      )}
                      <button title="Renovar (+30d)" onClick={async () => {
                        const vence = new Date(); vence.setDate(vence.getDate() + 30);
                        await supabase.from("tenants").update({ vence_em: vence.toISOString(), status: "ativo" }).eq("id", t.id);
                        await logMaster("tenant.renew", "tenant", t.id, { dias: 30 });
                        qc.invalidateQueries({ queryKey: ["master-tenants"] });
                        toast.success("Renovado por 30 dias");
                      }} className="doodle-btn doodle-btn--icon bg-blue-100">
                        <RotateCw className="h-3.5 w-3.5 text-blue-700" />
                      </button>
                      <button title="Excluir" onClick={async () => {
                        const ok = await dialog.confirm({ title: "Excluir empresa?", description: "Ação irreversível. Todas as licenças da empresa também serão removidas.", confirmText: "Excluir", destructive: true });
                        if (ok) remove.mutate(t.id);
                      }} className="doodle-btn doodle-btn--icon bg-red-50">
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
