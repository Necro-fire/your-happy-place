import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { dialog } from "@/components/ui/app-dialog";
import { logMaster } from "@/lib/master-log";
import { fmtDate, fmtMoney } from "@/lib/format";
import { maskPhone } from "@/lib/masks";
import {
  Pencil, Ban, RotateCw, Trash2, CheckCircle2, PauseCircle, Search,
  Copy, KeyRound, ExternalLink,
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

function LicencasMaster() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<License | null>(null);
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

  const changeSit = useMutation({
    mutationFn: async ({ id, situacao }: { id: string; situacao: string }) => {
      const { error } = await supabase.from("licenses").update({ situacao }).eq("id", id);
      if (error) throw error;
      await logMaster("license.status", "license", id, { situacao });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-licenses"] }); toast.success("Situação atualizada"); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("licenses").delete().eq("id", id);
      if (error) throw error;
      await logMaster("license.delete", "license", id, {});
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-licenses"] }); toast.success("Licença excluída"); },
  });

  const renew = useMutation({
    mutationFn: async (l: License) => {
      const base = l.vence_em ? new Date(l.vence_em) : new Date();
      base.setDate(base.getDate() + 30);
      const { error } = await supabase.from("licenses").update({ vence_em: base.toISOString(), situacao: "ativa" }).eq("id", l.id);
      if (error) throw error;
      await logMaster("license.renew", "license", l.id, { dias: 30 });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-licenses"] }); toast.success("Renovado +30 dias"); },
  });

  const copyText = (t: string, msg: string) => { navigator.clipboard.writeText(t); toast.success(msg); };

  const totals = {
    total: licenses.length,
    ativas: licenses.filter(l => l.situacao === "ativa").length,
    pendentes: licenses.filter(l => l.situacao === "pendente").length,
    bloqueadas: licenses.filter(l => l.situacao === "bloqueada").length,
    receita: licenses.filter(l => l.situacao === "ativa").reduce((s, l) => s + Number(l.valor ?? 0), 0),
  };

  const chips = [
    { k: "todos", label: "Todas", count: totals.total },
    { k: "ativa", label: "Ativas", count: totals.ativas },
    { k: "pendente", label: "Pendentes", count: totals.pendentes },
    { k: "bloqueada", label: "Bloqueadas", count: totals.bloqueadas },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-[#0f172a]">Licenças</h1>
          <p className="mt-1 text-[14px] text-[#6b7280]">Gerencie chaves, edite dados das empresas e controle o ciclo de assinaturas.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Licenças ativas", value: String(totals.ativas), tint: "text-[#059669]" },
          { label: "Pendentes", value: String(totals.pendentes), tint: "text-[#d97706]" },
          { label: "Bloqueadas", value: String(totals.bloqueadas), tint: "text-[#dc2626]" },
          { label: "Receita/ciclo", value: fmtMoney(totals.receita), tint: "text-[#2563eb]" },
        ].map((k) => (
          <div key={k.label} className="ms-card ms-hover-lift p-4">
            <div className="text-[12px] text-[#6b7280]">{k.label}</div>
            <div className={`mt-2 text-[24px] font-semibold ${k.tint}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="ms-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por chave, empresa..." className="ms-input" />
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[#e5e7eb] pt-3">
          {chips.map((c) => {
            const active = filter === c.k;
            return (
              <button key={c.k} onClick={() => setFilter(c.k)}
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
                <th>Plano / Tipo</th>
                <th>Situação</th>
                <th>Vencimento</th>
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
                const st = SIT_STYLES[l.situacao] ?? SIT_STYLES.ativa;
                const menuUrl = t?.slug ? `${window.location.origin}/cardapio/${t.slug}` : t?.public_codigo ? `${window.location.origin}/menu/${t.public_codigo}` : null;
                return (
                  <tr key={l.id} className="ms-hover-row">
                    <td>
                      <div className="text-[14px] font-medium text-[#0f172a]">{t?.empresa || t?.nome || "—"}</div>
                      <div className="text-[12px] text-[#9ca3af]">{t?.codigo ?? "sem empresa"}</div>
                    </td>
                    <td>
                      <div className="text-[13px] capitalize text-[#0f172a]">{l.plano}</div>
                      <div className="text-[12px] capitalize text-[#6b7280]">{l.tipo}</div>
                    </td>
                    <td>
                      <span className={`ms-badge ${st.bg} ${st.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </td>
                    <td className="text-[13px] text-[#4b5563]">{l.vence_em ? fmtDate(l.vence_em) : "—"}</td>
                    <td>
                      <button onClick={() => copyText(l.codigo, "Chave copiada")}
                        className="ms-hover-icon inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[12px] text-[#4b5563] hover:bg-[#f9fafb]"
                        title="Copiar chave">
                        {l.codigo}
                        <Copy className="h-3 w-3 text-[#9ca3af]" />
                      </button>
                    </td>
                    <td className="text-[13px] font-medium text-[#0f172a]">{fmtMoney(Number(l.valor ?? 0))}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {menuUrl && (
                          <a href={menuUrl} target="_blank" rel="noreferrer" title="Abrir cardápio público"
                            className="ms-hover-icon grid h-8 w-8 place-items-center rounded-lg text-[#6b7280] hover:bg-[#f1f5f9] hover:text-[#0f172a]">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <button title="Editar" onClick={() => setEditing(l)}
                          className="ms-hover-icon grid h-8 w-8 place-items-center rounded-lg text-[#2563eb] hover:bg-[#eff6ff]">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {l.situacao !== "ativa" && (
                          <button title="Liberar" onClick={() => changeSit.mutate({ id: l.id, situacao: "ativa" })}
                            className="ms-hover-icon grid h-8 w-8 place-items-center rounded-lg text-[#059669] hover:bg-[#ecfdf5]">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {l.situacao === "ativa" && (
                          <button title="Suspender" onClick={() => changeSit.mutate({ id: l.id, situacao: "suspensa" })}
                            className="ms-hover-icon grid h-8 w-8 place-items-center rounded-lg text-[#d97706] hover:bg-[#fffbeb]">
                            <PauseCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button title="Renovar" onClick={() => renew.mutate(l)}
                          className="ms-hover-icon grid h-8 w-8 place-items-center rounded-lg text-[#2563eb] hover:bg-[#eff6ff]">
                          <RotateCw className="h-4 w-4" />
                        </button>
                        {l.situacao !== "bloqueada" && (
                          <button title="Bloquear" onClick={async () => {
                            const ok = await dialog.confirm({ title: "Bloquear licença?", destructive: true, confirmText: "Bloquear" });
                            if (ok) changeSit.mutate({ id: l.id, situacao: "bloqueada" });
                          }} className="ms-hover-icon grid h-8 w-8 place-items-center rounded-lg text-[#dc2626] hover:bg-[#fef2f2]">
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        <button title="Excluir" onClick={async () => {
                          const ok = await dialog.confirm({ title: "Excluir licença?", destructive: true, confirmText: "Excluir" });
                          if (ok) remove.mutate(l.id);
                        }} className="ms-hover-icon grid h-8 w-8 place-items-center rounded-lg text-[#9ca3af] hover:bg-[#fef2f2] hover:text-[#dc2626]">
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
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#e5e7eb] px-6 py-3 text-[12px] text-[#6b7280]">
            <span>Mostrando <b className="text-[#0f172a]">{filtered.length}</b> de <b className="text-[#0f172a]">{licenses.length}</b> licenças</span>
            <span className="inline-flex items-center gap-1">
              <KeyRound className="h-3.5 w-3.5" /> Chaves geradas automaticamente
            </span>
          </div>
        )}
      </div>

      {editing && (
        <LicenseEditorDialog license={editing} tenant={editing.tenant_id ? tenantMap.get(editing.tenant_id) ?? null : null} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

/* ─────────────── Editor Dialog (Empresa + Design + Assinatura) ─────────────── */

type SettingsRow = {
  tenant_id: string;
  nome_estabelecimento: string;
  nome_fantasia: string | null;
  descricao: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  horario_funcionamento: string | null;
  taxa_entrega: number;
  aceita_pedidos_online: boolean;
  logo_url: string | null;
  banner_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
};

function LicenseEditorDialog({
  license, tenant, onClose,
}: { license: License; tenant: TenantLite | null; onClose: () => void }) {
  const qc = useQueryClient();
  const tenantId = license.tenant_id;

  const { data: tenantFull } = useQuery({
    enabled: !!tenantId,
    queryKey: ["master-tenant-full", tenantId],
    queryFn: async () => (await supabase.from("tenants").select("*").eq("id", tenantId!).maybeSingle()).data,
  });
  const { data: settingsRow } = useQuery({
    enabled: !!tenantId,
    queryKey: ["master-tenant-settings", tenantId],
    queryFn: async () => (await supabase.from("settings").select("*").eq("tenant_id", tenantId!).maybeSingle()).data as SettingsRow | null,
  });

  const [tForm, setTForm] = useState<Partial<Record<string, unknown>>>({});
  const [sForm, setSForm] = useState<Partial<SettingsRow>>({});
  const [lForm, setLForm] = useState<Partial<License>>({});

  useEffect(() => { if (tenantFull) setTForm(tenantFull as Record<string, unknown>); }, [tenantFull]);
  useEffect(() => { if (settingsRow) setSForm(settingsRow); }, [settingsRow]);
  useEffect(() => { setLForm(license); }, [license]);

  const saveAll = useMutation({
    mutationFn: async () => {
      if (tenantId) {
        const tenantPatch: Record<string, string | null> = {
          nome: (tForm.nome as string) ?? "",
          empresa: (tForm.empresa as string | null) ?? null,
          documento: (tForm.documento as string | null) ?? null,
          email: (tForm.email as string | null) ?? null,
          telefone: (tForm.telefone as string | null) ?? null,
          whatsapp: (tForm.whatsapp as string | null) ?? null,
          cidade: (tForm.cidade as string | null) ?? null,
          estado: (tForm.estado as string | null) ?? null,
          segmento: (tForm.segmento as string | null) ?? null,
          observacoes: (tForm.observacoes as string | null) ?? null,
        };
        const { error: e1 } = await supabase.from("tenants").update(tenantPatch as never).eq("id", tenantId);
        if (e1) throw e1;

        if (settingsRow) {
          const { tenant_id: _tid, ...settingsPatch } = sForm as SettingsRow;
          void _tid;
          const { error: e2 } = await supabase.from("settings").update(settingsPatch).eq("tenant_id", tenantId);
          if (e2) throw e2;
        }
      }
      const licensePatch = {
        plano: lForm.plano, tipo: lForm.tipo, situacao: lForm.situacao,
        valor: lForm.valor, vence_em: lForm.vence_em, observacoes: lForm.observacoes,
      };
      const { error: e3 } = await supabase.from("licenses").update(licensePatch).eq("id", license.id);
      if (e3) throw e3;

      await logMaster("license.edit-full", "license", license.id, { tenantId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master-licenses"] });
      qc.invalidateQueries({ queryKey: ["master-tenants"] });
      qc.invalidateQueries({ queryKey: ["master-tenants-lite"] });
      toast.success("Alterações salvas");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar licença — {tenant?.empresa || tenant?.nome || license.codigo}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="empresa" className="mt-2">
          <TabsList className="mb-4 flex flex-wrap">
            <TabsTrigger value="empresa">Empresa</TabsTrigger>
            <TabsTrigger value="cardapio">Cardápio & Contato</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="operacao">Operação</TabsTrigger>
            <TabsTrigger value="assinatura">Assinatura</TabsTrigger>
          </TabsList>

          <TabsContent value="empresa" className="grid gap-3 md:grid-cols-2">
            <div><Label>Nome do proprietário</Label><Input value={String(tForm.nome ?? "")} onChange={(e) => setTForm({ ...tForm, nome: e.target.value })} /></div>
            <div><Label>Nome da empresa</Label><Input value={String(tForm.empresa ?? "")} onChange={(e) => setTForm({ ...tForm, empresa: e.target.value })} /></div>
            <div><Label>Documento (CPF/CNPJ)</Label><Input value={String(tForm.documento ?? "")} onChange={(e) => setTForm({ ...tForm, documento: e.target.value })} /></div>
            <div><Label>E-mail</Label><Input value={String(tForm.email ?? "")} onChange={(e) => setTForm({ ...tForm, email: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={String(tForm.telefone ?? "")} onChange={(e) => setTForm({ ...tForm, telefone: maskPhone(e.target.value) })} /></div>
            <div><Label>WhatsApp</Label><Input value={String(tForm.whatsapp ?? "")} onChange={(e) => setTForm({ ...tForm, whatsapp: maskPhone(e.target.value) })} /></div>
            <div><Label>Cidade</Label><Input value={String(tForm.cidade ?? "")} onChange={(e) => setTForm({ ...tForm, cidade: e.target.value })} /></div>
            <div><Label>Estado (UF)</Label><Input maxLength={2} value={String(tForm.estado ?? "")} onChange={(e) => setTForm({ ...tForm, estado: e.target.value.toUpperCase() })} /></div>
            <div><Label>Segmento</Label><Input value={String(tForm.segmento ?? "")} onChange={(e) => setTForm({ ...tForm, segmento: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Observações (internas)</Label><Textarea rows={2} value={String(tForm.observacoes ?? "")} onChange={(e) => setTForm({ ...tForm, observacoes: e.target.value })} /></div>
          </TabsContent>

          <TabsContent value="cardapio" className="grid gap-3 md:grid-cols-2">
            <div><Label>Nome do estabelecimento</Label><Input value={sForm.nome_estabelecimento ?? ""} onChange={(e) => setSForm({ ...sForm, nome_estabelecimento: e.target.value })} /></div>
            <div><Label>Nome fantasia</Label><Input value={sForm.nome_fantasia ?? ""} onChange={(e) => setSForm({ ...sForm, nome_fantasia: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Descrição</Label><Textarea rows={2} value={sForm.descricao ?? ""} onChange={(e) => setSForm({ ...sForm, descricao: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={sForm.telefone ?? ""} onChange={(e) => setSForm({ ...sForm, telefone: maskPhone(e.target.value) })} /></div>
            <div><Label>WhatsApp</Label><Input value={sForm.whatsapp ?? ""} onChange={(e) => setSForm({ ...sForm, whatsapp: maskPhone(e.target.value) })} /></div>
            <div><Label>E-mail comercial</Label><Input value={sForm.email ?? ""} onChange={(e) => setSForm({ ...sForm, email: e.target.value })} /></div>
            <div><Label>CEP</Label><Input value={sForm.cep ?? ""} onChange={(e) => setSForm({ ...sForm, cep: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Endereço</Label><Input value={sForm.endereco ?? ""} onChange={(e) => setSForm({ ...sForm, endereco: e.target.value })} /></div>
            <div><Label>Cidade</Label><Input value={sForm.cidade ?? ""} onChange={(e) => setSForm({ ...sForm, cidade: e.target.value })} /></div>
            <div><Label>Estado</Label><Input maxLength={2} value={sForm.estado ?? ""} onChange={(e) => setSForm({ ...sForm, estado: e.target.value.toUpperCase() })} /></div>
            <div className="md:col-span-2"><Label>Horários de funcionamento</Label><Textarea rows={2} value={sForm.horario_funcionamento ?? ""} onChange={(e) => setSForm({ ...sForm, horario_funcionamento: e.target.value })} /></div>
          </TabsContent>

          <TabsContent value="design" className="grid gap-4 md:grid-cols-2">
            <div><Label>URL do logo</Label><Input value={sForm.logo_url ?? ""} onChange={(e) => setSForm({ ...sForm, logo_url: e.target.value })} />
              {sForm.logo_url && <img alt="logo" src={sForm.logo_url} className="mt-2 h-16 rounded border object-contain" />}
            </div>
            <div><Label>URL do banner</Label><Input value={sForm.banner_url ?? ""} onChange={(e) => setSForm({ ...sForm, banner_url: e.target.value })} />
              {sForm.banner_url && <img alt="banner" src={sForm.banner_url} className="mt-2 h-16 w-full rounded border object-cover" />}
            </div>
            <div><Label>Cor primária</Label>
              <div className="flex items-center gap-2">
                <Input type="color" value={sForm.cor_primaria ?? "#2563eb"} onChange={(e) => setSForm({ ...sForm, cor_primaria: e.target.value })} className="h-10 w-16 p-1" />
                <Input value={sForm.cor_primaria ?? ""} onChange={(e) => setSForm({ ...sForm, cor_primaria: e.target.value })} />
              </div>
            </div>
            <div><Label>Cor secundária</Label>
              <div className="flex items-center gap-2">
                <Input type="color" value={sForm.cor_secundaria ?? "#0ea5e9"} onChange={(e) => setSForm({ ...sForm, cor_secundaria: e.target.value })} className="h-10 w-16 p-1" />
                <Input value={sForm.cor_secundaria ?? ""} onChange={(e) => setSForm({ ...sForm, cor_secundaria: e.target.value })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="operacao" className="grid gap-3 md:grid-cols-2">
            <div><Label>Taxa de entrega padrão (R$)</Label><Input type="number" step="0.01" value={sForm.taxa_entrega ?? 0} onChange={(e) => setSForm({ ...sForm, taxa_entrega: Number(e.target.value) })} /></div>
            <div className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="text-[13px] font-medium">Aceita pedidos online</div>
                <div className="text-[12px] text-muted-foreground">Cardápio público recebe pedidos</div>
              </div>
              <Switch checked={!!sForm.aceita_pedidos_online} onCheckedChange={(v) => setSForm({ ...sForm, aceita_pedidos_online: v })} />
            </div>
            <div className="md:col-span-2 rounded border border-dashed p-3 text-[12px] text-muted-foreground">
              Categorias, produtos, complementos, usuários e permissões devem ser gerenciados pelo próprio usuário no painel Admin.
              Aqui você edita apenas dados globais e visuais.
            </div>
          </TabsContent>

          <TabsContent value="assinatura" className="grid gap-3 md:grid-cols-2">
            <div><Label>Plano</Label>
              <Select value={lForm.plano ?? "basico"} onValueChange={(v) => setLForm({ ...lForm, plano: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basico">Básico</SelectItem>
                  <SelectItem value="plus">Plus</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="demo">Demonstração</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tipo</Label>
              <Select value={lForm.tipo ?? "mensal"} onValueChange={(v) => setLForm({ ...lForm, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                  <SelectItem value="vitalicia">Vitalícia</SelectItem>
                  <SelectItem value="demonstracao">Demonstração</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Situação</Label>
              <Select value={lForm.situacao ?? "ativa"} onValueChange={(v) => setLForm({ ...lForm, situacao: v })}>
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
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={lForm.valor ?? 0} onChange={(e) => setLForm({ ...lForm, valor: Number(e.target.value) })} /></div>
            <div><Label>Vencimento</Label><Input type="date" value={lForm.vence_em?.slice(0, 10) ?? ""} onChange={(e) => setLForm({ ...lForm, vence_em: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
            <div><Label>Chave (somente leitura)</Label><Input value={license.codigo} disabled /></div>
            <div className="md:col-span-2"><Label>Observações da licença</Label><Textarea rows={2} value={lForm.observacoes ?? ""} onChange={(e) => setLForm({ ...lForm, observacoes: e.target.value })} /></div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => saveAll.mutate()} disabled={saveAll.isPending}>Salvar tudo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
