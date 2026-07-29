import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { dialog } from "@/components/ui/app-dialog";
import { logMaster } from "@/lib/master-log";
import { fmtDate, fmtMoney } from "@/lib/format";
import {
  Eye, Ban, RotateCw, Trash2, CheckCircle2, PauseCircle, Search,
  Copy, KeyRound, ExternalLink,
} from "lucide-react";
import { LicenseDetailsDialog } from "@/components/master/LicenseDetailsDialog";

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
                        <button title="Ver detalhes" onClick={() => setEditing(l)}
                          className="ms-hover-icon grid h-8 w-8 place-items-center rounded-lg text-[#2563eb] hover:bg-[#eff6ff]">
                          <Eye className="h-4 w-4" />
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
        <LicenseDetailsDialog licenseId={editing.id} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
