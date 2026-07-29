import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtMoney } from "@/lib/format";
import { getLicenseDetails } from "@/lib/master-license.functions";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = { licenseId: string; onClose: () => void };

const SIT_COLORS: Record<string, string> = {
  ativa: "bg-emerald-100 text-emerald-700",
  pendente: "bg-amber-100 text-amber-700",
  expirada: "bg-slate-100 text-slate-600",
  cancelada: "bg-violet-100 text-violet-700",
  bloqueada: "bg-red-100 text-red-700",
  suspensa: "bg-orange-100 text-orange-700",
};

function daysBetween(iso: string | null | undefined) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

function copy(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copiado");
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#f1f5f9] py-2 last:border-b-0">
      <span className="text-[12px] text-[#6b7280]">{label}</span>
      <span className={`text-right text-[13px] text-[#0f172a] ${mono ? "font-mono text-[12px]" : ""}`}>
        {value ?? <span className="text-[#cbd5e1]">—</span>}
      </span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white p-4">
      <h3 className="mb-2 text-[13px] font-semibold text-[#0f172a]">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function IdCopy({ id }: { id?: string | null }) {
  if (!id) return <span className="text-[#cbd5e1]">—</span>;
  return (
    <button onClick={() => copy(id)} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] text-[#475569] hover:bg-[#f1f5f9]">
      {id.slice(0, 8)}…<Copy className="h-3 w-3 text-[#94a3b8]" />
    </button>
  );
}

function Feature({ label, state }: { label: string; state: "ativo" | "inativo" | "bloqueado" | "em_breve" }) {
  const map = {
    ativo: "bg-emerald-100 text-emerald-700",
    inativo: "bg-slate-100 text-slate-500",
    bloqueado: "bg-red-100 text-red-700",
    em_breve: "bg-blue-100 text-blue-700",
  };
  const txt = { ativo: "Ativo", inativo: "Inativo", bloqueado: "Bloqueado pelo plano", em_breve: "Em breve" }[state];
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#f1f5f9] px-3 py-2">
      <span className="text-[13px] text-[#0f172a]">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${map[state]}`}>{txt}</span>
    </div>
  );
}

export function LicenseDetailsDialog({ licenseId, onClose }: Props) {
  const fetchDetails = useServerFn(getLicenseDetails);
  const { data, isLoading, error } = useQuery({
    queryKey: ["license-details", licenseId],
    queryFn: () => fetchDetails({ data: { licenseId } }),
    staleTime: 15_000,
  });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden p-0">
        <DialogHeader className="border-b border-[#e5e7eb] px-6 py-4">
          <DialogTitle className="text-[16px]">
            Detalhes da licença
            {data && (
              <span className="ml-2 font-mono text-[12px] text-[#6b7280]">{data.license.codigo}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="grid place-items-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[#94a3b8]" />
          </div>
        )}
        {error && (
          <div className="p-6 text-[13px] text-red-600">
            Erro ao carregar detalhes: {(error as Error).message}
          </div>
        )}

        {data && (
          <div className="max-h-[calc(88vh-64px)] overflow-y-auto px-6 py-4">
            <DetailsBody data={data} />
          </div>
        )}

        <div className="flex justify-end border-t border-[#e5e7eb] px-6 py-3">
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailsBody({ data }: { data: Awaited<ReturnType<typeof getLicenseDetails>> }) {
  const { license, tenant, settings, profile, authUser, usage, history } = data;
  const st = SIT_COLORS[license.situacao] ?? "bg-slate-100 text-slate-700";
  const dias = daysBetween(license.vence_em);
  const trial = license.tipo === "demonstracao" || license.tipo === "trial";
  const config = (settings?.config ?? {}) as Record<string, unknown>;
  const heroMode = String(config["hero_mode"] ?? "banner");
  const acceptsOnline = !!settings?.aceita_pedidos_online;
  const proximaRenov = dias !== null && dias <= 7 && dias >= 0;
  const vencida = license.situacao === "expirada" || (dias !== null && dias < 0);
  const provider = authUser?.providers?.[0] ?? "email";
  const verificado = !!authUser?.email_confirmed_at;

  return (
    <div>
      {/* Status ribbons */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${st}`}>{license.situacao}</span>
        {trial && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-medium text-blue-700">Teste gratuito</span>}
        {proximaRenov && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700">Renovação próxima ({dias}d)</span>}
        {vencida && <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-700">Licença vencida</span>}
        {license.situacao === "pendente" && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700">Pagamento pendente</span>}
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tenant?.status === "ativo" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          Empresa {tenant?.status ?? "—"}
        </span>
      </div>

      <Tabs defaultValue="conta" className="w-full">
        <TabsList className="mb-4 flex flex-wrap gap-1 bg-muted/60 p-1">
          {[
            ["conta", "Conta"],
            ["empresa", "Empresa"],
            ["assinatura", "Assinatura"],
            ["recursos", "Recursos"],
            ["utilizacao", "Utilização"],
            ["tecnico", "Técnico"],
          ].map(([v, label]) => (
            <TabsTrigger
              key={v}
              value={v}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* CONTA */}
        <TabsContent value="conta" className="grid gap-4 md:grid-cols-2">
          <Card title="Proprietário">
            <Row label="Nome" value={profile?.nome} />
            <Row label="E-mail" value={authUser?.email ?? profile?.email} />
            <Row label="Telefone" value={profile?.telefone ?? authUser?.phone} />
            <Row label="Status" value={authUser?.banned_until ? <Badge variant="destructive">Suspenso</Badge> : <Badge>Ativa</Badge>} />
            <Row label="Verificada" value={verificado ? "Sim" : "Não"} />
            <Row label="Método de login" value={provider === "google" ? "Google" : "E-mail"} />
          </Card>
          <Card title="Datas e IDs">
            <Row label="Criada em" value={authUser?.created_at ? fmtDate(authUser.created_at) : "—"} />
            <Row label="Último login" value={authUser?.last_sign_in_at ? fmtDate(authUser.last_sign_in_at) : "Nunca"} />
            <Row label="ID da conta" value={<IdCopy id={authUser?.id} />} />
          </Card>
        </TabsContent>

        {/* EMPRESA */}
        <TabsContent value="empresa" className="grid gap-4 md:grid-cols-2">
          <Card title="Identificação">
            <Row label="Nome" value={tenant?.nome} />
            <Row label="Nome fantasia" value={settings?.nome_fantasia ?? tenant?.empresa} />
            <Row label="Tipo/Segmento" value={tenant?.segmento} />
            <Row label="CNPJ" value={settings?.cnpj ?? tenant?.documento} />
            <Row label="Código" value={<span className="font-mono">{tenant?.codigo}</span>} />
            <Row label="Status" value={tenant?.status} />
          </Card>
          <Card title="Contato">
            <Row label="E-mail comercial" value={settings?.email ?? tenant?.email} />
            <Row label="Telefone" value={settings?.telefone ?? tenant?.telefone} />
            <Row label="WhatsApp" value={settings?.whatsapp ?? tenant?.whatsapp} />
          </Card>
          <Card title="Endereço">
            <Row label="Endereço" value={settings?.endereco} />
            <Row label="CEP" value={settings?.cep} />
            <Row label="Cidade" value={settings?.cidade ?? tenant?.cidade} />
            <Row label="Estado" value={settings?.estado ?? tenant?.estado} />
            <Row label="País" value="Brasil" />
          </Card>
          <Card title="Funcionamento">
            <Row label="Horário" value={settings?.horario_funcionamento} />
            <Row label="Dias" value={settings?.dias_funcionamento?.join(", ")} />
            <Row label="Aceita pedidos online" value={acceptsOnline ? "Sim" : "Não"} />
          </Card>
        </TabsContent>

        {/* ASSINATURA */}
        <TabsContent value="assinatura" className="grid gap-4 md:grid-cols-2">
          <Card title="Plano">
            <Row label="Plano atual" value={<span className="capitalize">{license.plano}</span>} />
            <Row label="Tipo" value={<span className="capitalize">{license.tipo}</span>} />
            <Row label="Situação" value={<span className={`rounded-full px-2 py-0.5 text-[11px] ${st}`}>{license.situacao}</span>} />
            <Row label="Renovação automática" value={license.tipo === "vitalicia" ? "N/A" : "Sim"} />
          </Card>
          <Card title="Ciclo">
            <Row label="Emitida em" value={fmtDate(license.emitida_em)} />
            <Row label="Vence em" value={license.vence_em ? fmtDate(license.vence_em) : "Sem vencimento"} />
            <Row label="Dias restantes" value={dias === null ? "—" : `${dias} dias`} />
            <Row label="Período de teste" value={trial ? "Sim" : "Não"} />
          </Card>
          <Card title="Financeiro">
            <Row label="Valor" value={fmtMoney(Number(license.valor ?? 0))} />
            <Row label="Desconto aplicado" value="—" />
            <Row label="Cupom utilizado" value="—" />
          </Card>
          <Card title="Histórico de alterações">
            {history.length === 0 ? (
              <div className="py-4 text-center text-[12px] text-[#94a3b8]">Sem alterações registradas.</div>
            ) : (
              <ul className="space-y-2">
                {history.map((h) => (
                  <li key={h.id} className="rounded-md border border-[#f1f5f9] px-2.5 py-2 text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#0f172a]">{h.action}</span>
                      <span className="text-[#94a3b8]">{fmtDate(h.created_at)}</span>
                    </div>
                    {h.actor_email && <div className="text-[11px] text-[#6b7280]">por {h.actor_email}</div>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        {/* RECURSOS */}
        <TabsContent value="recursos" className="grid gap-2 md:grid-cols-2">
          <Feature label="Cardápio público" state={tenant?.slug || tenant?.public_codigo ? "ativo" : "inativo"} />
          <Feature label="PDV" state="ativo" />
          <Feature label="Delivery" state={acceptsOnline ? "ativo" : "inativo"} />
          <Feature label="Retirada" state={acceptsOnline ? "ativo" : "inativo"} />
          <Feature label="Controle de mesas" state={usage.tables > 0 ? "ativo" : "inativo"} />
          <Feature label="Usuários e permissões" state="ativo" />
          <Feature label="Temas" state="ativo" />
          <Feature label="Banner" state={heroMode === "banner" ? "ativo" : "inativo"} />
          <Feature label="Carrossel" state={heroMode === "carousel" ? "ativo" : "inativo"} />
          <Feature label="Suporte" state="ativo" />
          <Feature label="Cupons" state="em_breve" />
          <Feature label="Descontos" state="em_breve" />
          <Feature label="KDS (Cozinha)" state="em_breve" />
          <Feature label="Backup automático" state="em_breve" />
        </TabsContent>

        {/* UTILIZAÇÃO */}
        <TabsContent value="utilizacao" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { l: "Usuários", v: usage.users },
            { l: "Funcionários", v: usage.employees },
            { l: "Produtos", v: usage.products },
            { l: "Categorias", v: usage.categories },
            { l: "Complementos", v: usage.complements },
            { l: "Pedidos totais", v: usage.orders },
            { l: "Pedidos hoje", v: usage.ordersToday },
            { l: "Clientes", v: usage.customers },
            { l: "Mesas", v: usage.tables },
            { l: "Empresas vinculadas", v: 1 },
          ].map((k) => (
            <div key={k.l} className="rounded-xl border border-[#e5e7eb] bg-white p-3">
              <div className="text-[11px] text-[#6b7280]">{k.l}</div>
              <div className="mt-1 text-[22px] font-semibold text-[#0f172a]">{k.v}</div>
            </div>
          ))}
        </TabsContent>

        {/* TÉCNICO */}
        <TabsContent value="tecnico" className="grid gap-4 md:grid-cols-2">
          <Card title="Identificadores">
            <Row label="ID da empresa" value={<IdCopy id={tenant?.id} />} />
            <Row label="ID da licença" value={<IdCopy id={license.id} />} />
            <Row label="ID do usuário" value={<IdCopy id={tenant?.owner_user_id} />} />
            <Row label="Slug público" value={tenant?.slug} mono />
            <Row label="Código público" value={tenant?.public_codigo} mono />
          </Card>
          <Card title="Sistema">
            <Row label="Cadastro da empresa" value={tenant?.created_at ? fmtDate(tenant.created_at) : "—"} />
            <Row label="Última atualização" value={tenant?.updated_at ? fmtDate(tenant.updated_at) : "—"} />
            <Row label="Última sincronização" value={tenant?.ultima_sync ? fmtDate(tenant.ultima_sync) : "—"} />
            <Row label="Último acesso" value={tenant?.ultimo_acesso ? fmtDate(tenant.ultimo_acesso) : "—"} />
            <Row label="Versão instalada" value={tenant?.versao_instalada ?? "SaborSys 1.0"} />
            <Row label="Ambiente" value="Produção" />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
