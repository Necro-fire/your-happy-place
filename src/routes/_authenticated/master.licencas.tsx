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
import { fmtDate, fmtMoney } from "@/lib/format";
import { Plus, Pencil, Ban, RotateCw, Trash2, CheckCircle2, PauseCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/master/licencas")({
  component: LicencasMaster,
});

type License = {
  id: string; codigo: string; tenant_id: string | null; plano: string; tipo: string;
  situacao: string; emitida_em: string; vence_em: string | null; valor: number | null;
  observacoes: string | null;
};
type TenantLite = { id: string; codigo: string; nome: string; empresa: string | null };

const SIT_COLORS: Record<string, string> = {
  ativa: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  pendente: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  expirada: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  cancelada: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  bloqueada: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  suspensa: "bg-amber-500/20 text-amber-300 border-amber-500/40",
};

function LicencasMaster() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<License> | null>(null);

  const { data: licenses = [] } = useQuery({
    queryKey: ["master-licenses"],
    queryFn: async () => (await supabase.from("licenses").select("*").order("created_at", { ascending: false })).data as License[] ?? [],
  });
  const { data: tenants = [] } = useQuery({
    queryKey: ["master-tenants-lite"],
    queryFn: async () => (await supabase.from("tenants").select("id, codigo, nome, empresa").order("nome")).data as TenantLite[] ?? [],
  });

  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  const save = useMutation({
    mutationFn: async (l: Partial<License>) => {
      if (l.id) {
        const { id, codigo: _c, ...rest } = l;
        void _c;
        const { error } = await supabase.from("licenses").update(rest).eq("id", id);
        if (error) throw error;
        await logMaster("license.update", "license", id, {});
      } else {
        const { id: _i, codigo: _c, ...rest } = l;
        void _i; void _c;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50">Controle de Licenças</h1>
          <p className="text-sm text-slate-400">Emissão, renovação, cancelamento e transferência.</p>
        </div>
        <Button onClick={() => setEditing({ tipo: "mensal", situacao: "ativa", plano: "basico" })} className="bg-indigo-600 hover:bg-indigo-500">
          <Plus className="mr-2 h-4 w-4" />Nova licença
        </Button>
      </div>

      <Card className="border-slate-800 bg-slate-900 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Empresa</th>
                <th className="px-3 py-2 text-left">Plano</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Situação</th>
                <th className="px-3 py-2 text-left">Emissão</th>
                <th className="px-3 py-2 text-left">Vencimento</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {licenses.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500">Nenhuma licença emitida.</td></tr>
              )}
              {licenses.map((l) => {
                const t = l.tenant_id ? tenantMap.get(l.tenant_id) : null;
                return (
                  <tr key={l.id} className="hover:bg-slate-800/40">
                    <td className="px-3 py-2 font-mono text-xs text-indigo-300">{l.codigo}</td>
                    <td className="px-3 py-2 text-slate-100">{t ? `${t.empresa || t.nome} (${t.codigo})` : <span className="text-slate-500">—</span>}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="border-slate-700 text-slate-200">{l.plano}</Badge></td>
                    <td className="px-3 py-2 text-slate-300">{l.tipo}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className={SIT_COLORS[l.situacao] ?? "border-slate-700"}>{l.situacao}</Badge></td>
                    <td className="px-3 py-2 text-slate-400">{fmtDate(l.emitida_em)}</td>
                    <td className="px-3 py-2 text-slate-300">{l.vence_em ? fmtDate(l.vence_em) : "—"}</td>
                    <td className="px-3 py-2 text-right text-slate-200">{fmtMoney(Number(l.valor ?? 0))}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {l.situacao !== "ativa" && (
                          <Button size="icon" variant="ghost" title="Liberar licença" onClick={() => changeSit.mutate({ id: l.id, situacao: "ativa" })}>
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          </Button>
                        )}
                        {l.situacao === "ativa" && (
                          <Button size="icon" variant="ghost" title="Suspender" onClick={() => changeSit.mutate({ id: l.id, situacao: "suspensa" })}>
                            <PauseCircle className="h-4 w-4 text-amber-400" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => setEditing(l)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => renew.mutate(l)} title="Renovar"><RotateCw className="h-4 w-4 text-indigo-300" /></Button>
                        {l.situacao !== "bloqueada" ? (
                          <Button size="icon" variant="ghost" title="Bloquear" onClick={async () => {
                            const ok = await dialog.confirm({ title: "Bloquear licença?", destructive: true, confirmText: "Bloquear" });
                            if (ok) changeSit.mutate({ id: l.id, situacao: "bloqueada" });
                          }}><Ban className="h-4 w-4 text-rose-400" /></Button>
                        ) : (
                          <Button size="icon" variant="ghost" title="Reativar" onClick={() => changeSit.mutate({ id: l.id, situacao: "ativa" })}>
                            <RotateCw className="h-4 w-4 text-emerald-400" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" title="Excluir" onClick={async () => {
                          const ok = await dialog.confirm({ title: "Excluir licença?", destructive: true, confirmText: "Excluir" });
                          if (ok) remove.mutate(l.id);
                        }}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

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
