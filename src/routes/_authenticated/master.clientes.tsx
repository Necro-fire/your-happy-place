import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { dialog } from "@/components/ui/app-dialog";
import { logMaster } from "@/lib/master-log";
import { fmtDate } from "@/lib/format";
import { maskPhone, maskCPFCNPJ } from "@/lib/masks";
import { Plus, Pencil, Ban, CheckCircle2, Trash2, RotateCw, Search } from "lucide-react";

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

const STATUS_COLORS: Record<string, string> = {
  ativo: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  teste: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  bloqueado: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  cancelado: "bg-slate-500/20 text-slate-300 border-slate-500/40",
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

  const filtered = tenants.filter((t) => {
    if (statusFilter !== "todos" && t.status !== statusFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (t.nome + " " + (t.empresa ?? "") + " " + t.codigo + " " + (t.email ?? "") + " " + (t.documento ?? "")).toLowerCase().includes(s);
  });

  const save = useMutation({
    mutationFn: async (t: Partial<Tenant>) => {
      if (t.id) {
        const { id, codigo: _c, ...rest } = t;
        void _c;
        const { error } = await supabase.from("tenants").update(rest).eq("id", id);
        if (error) throw error;
        await logMaster("tenant.update", "tenant", id, { nome: t.nome });
      } else {
        const { id: _i, codigo: _c, ...rest } = t;
        void _i; void _c;
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50">Empresas Clientes</h1>
          <p className="text-sm text-slate-400">Cadastro, planos, status e ciclo de vida das empresas contratantes.</p>
        </div>
        <Button onClick={() => setEditing({ status: "ativo", plano: "basico" })} className="bg-indigo-600 hover:bg-indigo-500">
          <Plus className="mr-2 h-4 w-4" />Nova empresa
        </Button>
      </div>

      <Card className="border-slate-800 bg-slate-900 p-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, nome, empresa, email..." className="border-slate-700 bg-slate-950 pl-8 text-slate-100 placeholder:text-slate-500" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] border-slate-700 bg-slate-950 text-slate-100"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="teste">Em teste</SelectItem>
              <SelectItem value="bloqueado">Bloqueados</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="border-slate-800 bg-slate-900 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Empresa</th>
                <th className="px-3 py-2 text-left">Contato</th>
                <th className="px-3 py-2 text-left">Plano</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Vence</th>
                <th className="px-3 py-2 text-left">Último acesso</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">Nenhuma empresa cadastrada.</td></tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40">
                  <td className="px-3 py-2 font-mono text-xs text-indigo-300">{t.codigo}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-100">{t.empresa || t.nome}</div>
                    <div className="text-xs text-slate-500">{t.documento} · {t.cidade}{t.estado ? "/" + t.estado : ""}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    <div>{t.email}</div>
                    <div className="text-xs text-slate-500">{t.telefone}</div>
                  </td>
                  <td className="px-3 py-2"><Badge variant="outline" className="border-slate-700 text-slate-200">{t.plano}</Badge></td>
                  <td className="px-3 py-2"><Badge variant="outline" className={STATUS_COLORS[t.status] ?? "border-slate-700"}>{t.status}</Badge></td>
                  <td className="px-3 py-2 text-slate-300">{t.vence_em ? fmtDate(t.vence_em) : "—"}</td>
                  <td className="px-3 py-2 text-slate-400">{t.ultimo_acesso ? fmtDate(t.ultimo_acesso) : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(t)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                      {t.status !== "bloqueado" ? (
                        <Button size="icon" variant="ghost" title="Bloquear" onClick={async () => {
                          const ok = await dialog.confirm({ title: "Bloquear empresa?", description: `A empresa ${t.empresa || t.nome} não conseguirá mais acessar.`, confirmText: "Bloquear", variant: "warning" });
                          if (ok) changeStatus.mutate({ id: t.id, status: "bloqueado" });
                        }}><Ban className="h-4 w-4 text-rose-400" /></Button>
                      ) : (
                        <Button size="icon" variant="ghost" title="Reativar" onClick={() => changeStatus.mutate({ id: t.id, status: "ativo" })}>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" title="Renovar (marcar +30d)" onClick={async () => {
                        const vence = new Date(); vence.setDate(vence.getDate() + 30);
                        await supabase.from("tenants").update({ vence_em: vence.toISOString(), status: "ativo" }).eq("id", t.id);
                        await logMaster("tenant.renew", "tenant", t.id, { dias: 30 });
                        qc.invalidateQueries({ queryKey: ["master-tenants"] });
                        toast.success("Renovado por 30 dias");
                      }}><RotateCw className="h-4 w-4 text-indigo-300" /></Button>
                      <Button size="icon" variant="ghost" title="Excluir" onClick={async () => {
                        const ok = await dialog.confirm({ title: "Excluir empresa?", description: "Ação irreversível. Todas as licenças da empresa também serão removidas.", confirmText: "Excluir", variant: "danger" });
                        if (ok) remove.mutate(t.id);
                      }}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar empresa" : "Nova empresa"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2"><Label>Nome do responsável *</Label><Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
              <div><Label>Empresa</Label><Input value={editing.empresa ?? ""} onChange={(e) => setEditing({ ...editing, empresa: e.target.value })} /></div>
              <div><Label>Documento (CPF/CNPJ)</Label><Input value={editing.documento ?? ""} onChange={(e) => setEditing({ ...editing, documento: maskCPFCNPJ(e.target.value) })} /></div>
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
