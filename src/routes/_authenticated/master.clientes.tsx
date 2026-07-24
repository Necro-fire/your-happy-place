import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtDate } from "@/lib/format";
import { Search, Eye, ExternalLink, Copy, Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/master/clientes")({
  component: ClientesMaster,
});

type Tenant = {
  id: string; codigo: string; nome: string; empresa: string | null; documento: string | null;
  email: string | null; telefone: string | null; whatsapp: string | null; cidade: string | null;
  estado: string | null; segmento: string | null; plano: string; status: string;
  ultimo_acesso: string | null; ativado_em: string | null; vence_em: string | null;
  observacoes: string | null; slug: string; menu_codigo: string | null;
  public_codigo: string | null; owner_user_id: string | null; created_at: string;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  ativo:      { bg: "bg-[#ecfdf5]", text: "text-[#059669]", dot: "bg-[#10b981]", label: "Ativo" },
  teste:      { bg: "bg-[#fffbeb]", text: "text-[#d97706]", dot: "bg-[#f59e0b]", label: "Em teste" },
  bloqueado:  { bg: "bg-[#fef2f2]", text: "text-[#dc2626]", dot: "bg-[#ef4444]", label: "Bloqueado" },
  cancelado:  { bg: "bg-[#f5f3ff]", text: "text-[#7c3aed]", dot: "bg-[#8b5cf6]", label: "Cancelado" },
};

function ClientesMaster() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [viewing, setViewing] = useState<Tenant | null>(null);

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
          <p className="mt-1 text-[14px] text-[#6b7280]">Painel de consulta somente-leitura. Para editar dados de uma empresa, use o módulo <b>Licenças</b>.</p>
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
                <th>Cadastro</th>
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
                  <tr key={t.id} className="ms-hover-row">
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
                    <td><span className="ms-badge capitalize bg-[#eff6ff] text-[#2563eb]">{t.plano}</span></td>
                    <td>
                      <span className={`ms-badge ${st.bg} ${st.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </td>
                    <td className="text-[13px] text-[#4b5563]">{fmtDate(t.created_at)}</td>
                    <td className="text-[13px] text-[#6b7280]">{t.ultimo_acesso ? fmtDate(t.ultimo_acesso) : "—"}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button title="Ver detalhes" onClick={() => setViewing(t)}
                          className="ms-hover-icon grid h-8 w-8 place-items-center rounded-lg text-[#2563eb] hover:bg-[#eff6ff]">
                          <Eye className="h-4 w-4" />
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

      <TenantDetailsDialog tenant={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function TenantDetailsDialog({ tenant, onClose }: { tenant: Tenant | null; onClose: () => void }) {
  const { data: extra } = useQuery({
    enabled: !!tenant,
    queryKey: ["master-tenant-details", tenant?.id],
    queryFn: async () => {
      if (!tenant) return null;
      const [emp, prod, ord, lic, profile] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("licenses").select("plano, situacao, vence_em, tipo").eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        tenant.owner_user_id
          ? supabase.from("profiles").select("nome, email, telefone").eq("user_id", tenant.owner_user_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        employees: emp.count ?? 0,
        products: prod.count ?? 0,
        orders: ord.count ?? 0,
        license: lic.data,
        owner: profile.data,
      };
    },
  });

  if (!tenant) return null;

  const menuUrl = tenant.slug
    ? `${window.location.origin}/cardapio/${tenant.slug}`
    : tenant.public_codigo ? `${window.location.origin}/menu/${tenant.public_codigo}` : null;

  const diasRest = tenant.vence_em
    ? Math.ceil((new Date(tenant.vence_em).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <Dialog open={!!tenant} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-4 w-4 text-[#2563eb]" />
            Detalhes da Empresa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <Section title="Dados da empresa">
            <Field label="Nome da empresa" value={tenant.empresa || tenant.nome} />
            <Field label="Proprietário" value={extra?.owner?.nome ?? tenant.nome} />
            <Field label="E-mail" value={extra?.owner?.email ?? tenant.email ?? "—"} />
            <Field label="Telefone" value={extra?.owner?.telefone ?? tenant.telefone ?? "—"} />
            <Field label="WhatsApp" value={tenant.whatsapp ?? "—"} />
            <Field label="Documento (CNPJ/CPF)" value={tenant.documento ?? "—"} />
            <Field label="Cidade" value={tenant.cidade ?? "—"} />
            <Field label="Estado" value={tenant.estado ?? "—"} />
            <Field label="Segmento" value={tenant.segmento ?? "—"} />
          </Section>

          <Section title="Assinatura">
            <Field label="Plano atual" value={<span className="capitalize">{extra?.license?.plano ?? tenant.plano}</span>} />
            <Field label="Situação" value={<span className="capitalize">{extra?.license?.situacao ?? tenant.status}</span>} />
            <Field label="Tipo" value={extra?.license?.tipo ?? "—"} />
            <Field label="Data de cadastro" value={fmtDate(tenant.created_at)} />
            <Field label="Ativado em" value={tenant.ativado_em ? fmtDate(tenant.ativado_em) : "—"} />
            <Field label="Vence em" value={tenant.vence_em ? fmtDate(tenant.vence_em) : "Sem expiração"} />
            <Field label="Dias restantes" value={diasRest !== null ? `${diasRest} dia(s)` : "—"} />
            <Field label="Último acesso" value={tenant.ultimo_acesso ? fmtDate(tenant.ultimo_acesso) : "—"} />
          </Section>

          <Section title="Uso do sistema">
            <Field label="Funcionários" value={String(extra?.employees ?? 0)} />
            <Field label="Produtos" value={String(extra?.products ?? 0)} />
            <Field label="Pedidos" value={String(extra?.orders ?? 0)} />
          </Section>

          <Section title="Cardápio público">
            <Field label="Slug" value={tenant.slug || "—"} />
            <Field label="Código do cardápio" value={tenant.menu_codigo ?? "—"} />
            <Field label="Código público" value={tenant.public_codigo ?? "—"} />
            <div className="md:col-span-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-[#9ca3af]">Link público</div>
              {menuUrl ? (
                <div className="mt-1 flex items-center gap-2">
                  <a href={menuUrl} target="_blank" rel="noreferrer" className="ms-hover-icon inline-flex items-center gap-1 text-[13px] text-[#2563eb] hover:underline">
                    {menuUrl} <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    onClick={() => { navigator.clipboard.writeText(menuUrl); toast.success("Link copiado"); }}
                    className="ms-hover-icon rounded p-1 text-[#9ca3af] hover:bg-[#f1f5f9] hover:text-[#0f172a]">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : <div className="text-[13px] text-[#9ca3af]">—</div>}
            </div>
          </Section>

          {tenant.observacoes && (
            <Section title="Observações internas">
              <div className="md:col-span-3 whitespace-pre-line text-[13px] text-[#4b5563]">{tenant.observacoes}</div>
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e5e7eb] p-4">
      <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">{title}</div>
      <div className="grid gap-3 md:grid-cols-3">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-[#9ca3af]">{label}</div>
      <div className="mt-1 text-[13px] text-[#0f172a] break-words">{value}</div>
    </div>
  );
}
