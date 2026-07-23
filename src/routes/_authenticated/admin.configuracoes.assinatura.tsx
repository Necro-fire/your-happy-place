import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Check, X, Crown, Zap, MessageCircle, ArrowUpRight, ShieldCheck,
  Star, TrendingUp, Package, CreditCard, Calendar, History, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { dialog } from "@/components/ui/app-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/assinatura")({
  component: AssinaturaPage,
});

type Cycle = "mes" | "tri" | "ano";
type PlanId = "basico" | "plus";

const PRICES: Record<PlanId, Record<Cycle, number>> = {
  basico: { mes: 97, tri: 267, ano: 947 },
  plus: { mes: 157, tri: 437, ano: 1497 },
};

const CYCLE_LABEL: Record<Cycle, string> = { mes: "mês", tri: "trimestre", ano: "ano" };
const CYCLE_MONTHS: Record<Cycle, number> = { mes: 1, tri: 3, ano: 12 };

const BASICO_FEATURES = [
  "Gestão completa de produtos",
  "Cardápio digital público",
  "Página pública personalizada da empresa",
  "Gerenciamento de pedidos em tempo real",
  "PDV completo (delivery, mesa, balcão, retirada)",
  "Controle de mesas",
  "Delivery e retirada no balcão",
  "Cadastro de clientes",
  "Usuários e permissões",
  "Personalização visual da empresa",
  "Logo, banners e carrossel de imagens",
  "Configurações completas do sistema",
  "Atualizações em tempo real",
  "Acesso administrativo completo",
  "Suporte oficial da plataforma",
  "Responsividade em celular, tablet e computador",
];

const PLUS_EXTRAS: string[] = [
  "Recursos avançados em desenvolvimento",
];

const COMPARE: { label: string; basico: boolean; plus: boolean }[] =
  BASICO_FEATURES.map((f) => ({ label: f, basico: true, plus: true }));


const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function savingsPct(planId: PlanId, cycle: Cycle) {
  if (cycle === "mes") return 0;
  const monthly = PRICES[planId].mes * CYCLE_MONTHS[cycle];
  const price = PRICES[planId][cycle];
  return Math.round(((monthly - price) / monthly) * 100);
}

function AssinaturaPage() {
  const [cycle, setCycle] = useState<Cycle>("mes");
  const [currentPlan, setCurrentPlan] = useState<PlanId>("basico");
  const [currentCycle, setCurrentCycle] = useState<Cycle>("mes");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("tenants")
        .select("plano")
        .eq("owner_user_id", user.id)
        .maybeSingle();
      const p = (data?.plano || "").toLowerCase();
      // Plus ainda não está disponível: qualquer plano existente é tratado como Básico.
      if (p === "basico" || p === "basic" || p === "plus" || p === "enterprise" || p === "pro") {
        setCurrentPlan("basico");
      }
    })();
  }, []);


  const contratacao = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d;
  }, []);
  const renovacao = useMemo(() => {
    const d = new Date(contratacao);
    d.setMonth(d.getMonth() + CYCLE_MONTHS[currentCycle]);
    return d;
  }, [contratacao, currentCycle]);

  async function requestChange(target: PlanId) {
    if (target === "plus") {
      toast.info("O Plano Plus estará disponível em breve.");
      return;
    }
    const isSame = target === currentPlan;
    const action = isSame ? "renovação" : "contratação";
    const ok = await dialog.confirm({
      title: `Solicitar ${action}`,
      description: `Deseja solicitar ${action} do Plano Básico (${CYCLE_LABEL[cycle]}) por ${BRL(PRICES[target][cycle])}?\n\nEsta é uma versão demonstrativa. Nossa equipe entrará em contato para finalizar.`,
      confirmText: "Solicitar",
    });
    if (!ok) return;
    setCurrentPlan(target);
    setCurrentCycle(cycle);
    toast.success(`Solicitação de ${action} registrada. Entraremos em contato em breve.`);
  }

  function contactSupport() {
    toast.info("Abra o menu Suporte para falar com nossa equipe sobre planos.");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Sua Assinatura</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Gerencie seu plano e acompanhe seus dados de assinatura.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1 py-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Plano atual: Básico
            </Badge>
            <Badge className="gap-1 bg-emerald-500/15 py-1 text-emerald-600 hover:bg-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Ativa
            </Badge>
          </div>
        </div>
      </Card>

      {/* Cycle switcher */}
      <div className="flex flex-col items-center gap-3">
        <Tabs value={cycle} onValueChange={(v) => setCycle(v as Cycle)}>
          <TabsList className="h-11">
            <TabsTrigger value="mes" className="px-5">Mensal</TabsTrigger>
            <TabsTrigger value="tri" className="gap-2 px-5">
              Trimestral
              <Badge variant="secondary" className="h-5 bg-emerald-500/15 text-[10px] text-emerald-600">
                −{savingsPct("basico", "tri")}%
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ano" className="gap-2 px-5">
              Anual
              <Badge variant="secondary" className="h-5 bg-emerald-500/15 text-[10px] text-emerald-600">
                −{savingsPct("basico", "ano")}%
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-xs text-muted-foreground">Economize contratando trimestralmente ou anualmente.</p>
      </div>

      {/* Plans */}
      <div className="grid gap-5 md:grid-cols-2">
        <PlanCard
          id="basico"
          name="Básico"
          tagline="Tudo o que você precisa para operar seu negócio."
          icon={<Package className="h-5 w-5" />}
          price={PRICES.basico[cycle]}
          cycle={cycle}
          features={BASICO_FEATURES}
          current={currentPlan === "basico"}
          onSelect={() => requestChange("basico")}
        />
        <PlanCard
          id="plus"
          name="Plus"
          tagline="Recursos avançados para escalar o negócio."
          icon={<Crown className="h-5 w-5" />}
          price={PRICES.plus[cycle]}
          cycle={cycle}
          features={[...BASICO_FEATURES.slice(0, 6), ...PLUS_EXTRAS]}
          comingSoon
          onSelect={() => requestChange("plus")}
        />
      </div>

      {/* Current subscription */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">Informações da Assinatura Atual</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem icon={<Crown className="h-4 w-4" />} label="Plano" value="Básico" />
          <InfoItem icon={<TrendingUp className="h-4 w-4" />} label="Valor" value={`${BRL(PRICES.basico[currentCycle])} / ${CYCLE_LABEL[currentCycle]}`} />
          <InfoItem
            icon={<span className="grid h-4 w-4 place-items-center"><span className="h-2 w-2 rounded-full bg-emerald-500" /></span>}
            label="Situação"
            value={<span className="text-emerald-600">Ativa</span>}
          />
          <InfoItem icon={<Calendar className="h-4 w-4" />} label="Contratação" value={contratacao.toLocaleDateString("pt-BR")} />
          <InfoItem icon={<Calendar className="h-4 w-4" />} label="Renovação" value={renovacao.toLocaleDateString("pt-BR")} />
          <InfoItem icon={<Calendar className="h-4 w-4" />} label="Próxima cobrança" value={renovacao.toLocaleDateString("pt-BR")} />
          <InfoItem icon={<CreditCard className="h-4 w-4" />} label="Forma de pagamento" value={<span className="text-muted-foreground">A configurar</span>} />
        </div>
        <Separator className="my-5" />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => requestChange("basico")} variant="outline">
            <Zap className="mr-2 h-4 w-4" /> Renovar assinatura
          </Button>
          <Button variant="outline" disabled className="gap-2">
            <ArrowUpRight className="h-4 w-4" /> Upgrade para Plus
            <Badge variant="secondary" className="ml-1 gap-1">
              <Clock className="h-3 w-3" /> Em breve
            </Badge>
          </Button>
          <Button variant="ghost" onClick={contactSupport}>
            <MessageCircle className="mr-2 h-4 w-4" /> Falar com suporte
          </Button>
        </div>
      </Card>

      {/* Comparison table */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border p-5">
          <h3 className="font-display text-lg font-semibold">Comparativo dos Planos</h3>
          <p className="mt-1 text-sm text-muted-foreground">Veja em detalhes o que cada plano oferece.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Recurso</th>
                <th className="px-5 py-3 text-center font-semibold">Básico</th>
                <th className="px-5 py-3 text-center font-semibold">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    Plus
                    <Badge variant="secondary" className="ml-1 gap-1 py-0 text-[10px]">
                      <Clock className="h-2.5 w-2.5" /> Em breve
                    </Badge>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row, i) => (
                <tr key={row.label} className={cn("border-t border-border", i % 2 && "bg-muted/20")}>
                  <td className="px-5 py-3">{row.label}</td>
                  <td className="px-5 py-3 text-center">
                    {row.basico ? <Check className="mx-auto h-4 w-4 text-emerald-500" /> : <X className="mx-auto h-4 w-4 text-muted-foreground/40" />}
                  </td>
                  <td className="px-5 py-3 text-center text-muted-foreground/60">
                    <Check className="mx-auto h-4 w-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* History */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">Histórico de Alterações</h3>
        </div>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
            <div>
              <div className="font-medium">Assinatura iniciada — Plano Básico</div>
              <div className="text-xs text-muted-foreground">{contratacao.toLocaleDateString("pt-BR")}</div>
            </div>
          </li>
          <li className="flex items-start gap-3 text-muted-foreground">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
            <div>
              <div>Aguardando novas movimentações</div>
              <div className="text-xs">O histórico completo aparecerá aqui.</div>
            </div>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function PlanCard({
  id, name, tagline, icon, price, cycle, features, highlighted, current, comingSoon, onSelect,
}: {
  id: PlanId;
  name: string;
  tagline: string;
  icon: React.ReactNode;
  price: number;
  cycle: Cycle;
  features: string[];
  highlighted?: boolean;
  current?: boolean;
  comingSoon?: boolean;
  onSelect: () => void;
}) {
  const saving = savingsPct(id, cycle);
  const monthlyEq = price / CYCLE_MONTHS[cycle];
  return (
    <Card
      className={cn(
        "relative flex flex-col overflow-hidden p-6 transition-all duration-300",
        comingSoon
          ? "border-dashed border-border/70 bg-muted/20 opacity-90"
          : "hover:-translate-y-0.5 hover:shadow-xl",
        highlighted && !comingSoon
          ? "border-primary/60 bg-gradient-to-br from-primary/10 via-background to-background shadow-lg ring-1 ring-primary/20"
          : "border-border",
      )}
    >
      {comingSoon && (
        <Badge variant="secondary" className="absolute right-4 top-4 gap-1">
          <Clock className="h-3 w-3" /> Em breve
        </Badge>
      )}
      {highlighted && !comingSoon && (
        <Badge className="absolute right-4 top-4 gap-1 bg-primary text-primary-foreground">
          <Star className="h-3 w-3 fill-current" /> Mais Popular
        </Badge>
      )}
      {current && !comingSoon && (
        <Badge className="absolute left-4 top-4 gap-1 bg-emerald-500 text-white hover:bg-emerald-500">
          <ShieldCheck className="h-3 w-3" /> Plano Atual
        </Badge>
      )}

      <div className={cn("mt-8 flex items-center gap-2", (highlighted || current || comingSoon) && "mt-10")}>
        <div className={cn(
          "grid h-10 w-10 place-items-center rounded-lg",
          comingSoon ? "bg-muted text-muted-foreground" :
            highlighted ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
        )}>
          {icon}
        </div>
        <div>
          <h3 className="font-display text-xl font-bold">{name}</h3>
          <p className="text-xs text-muted-foreground">{tagline}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline gap-1">
          <span className={cn(
            "font-display text-4xl font-bold tracking-tight",
            comingSoon && "text-muted-foreground",
          )}>{BRL(price)}</span>
          <span className="text-sm text-muted-foreground">/ {CYCLE_LABEL[cycle]}</span>
        </div>
        {cycle !== "mes" && !comingSoon && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Equivale a {BRL(monthlyEq)}/mês</span>
            {saving > 0 && (
              <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600">
                Economize {saving}%
              </Badge>
            )}
          </div>
        )}
        {comingSoon && (
          <p className="mt-2 text-xs text-muted-foreground">
            Este plano será disponibilizado em breve. Aguarde novidades.
          </p>
        )}
      </div>

      <Separator className="my-5" />

      <ul className="flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <span className={cn(
              "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full",
              comingSoon ? "bg-muted text-muted-foreground" :
                highlighted ? "bg-primary/15 text-primary" : "bg-emerald-500/15 text-emerald-600",
            )}>
              <Check className="h-3 w-3" />
            </span>
            <span className={cn(comingSoon && "text-muted-foreground")}>{f}</span>
          </li>
        ))}
      </ul>

      {comingSoon ? (
        <Button
          disabled
          variant="outline"
          size="lg"
          className="mt-6 w-full gap-2"
        >
          <Clock className="h-4 w-4" /> Em breve
        </Button>
      ) : (
        <Button
          onClick={onSelect}
          disabled={current}
          className={cn("mt-6 w-full", highlighted && !current && "bg-primary hover:bg-primary/90")}
          variant={current ? "outline" : highlighted ? "default" : "default"}
          size="lg"
        >
          {current ? "Plano atual" : "Contratar plano"}
        </Button>
      )}
    </Card>
  );
}
