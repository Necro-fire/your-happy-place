import { Link, useRouterState } from "@tanstack/react-router";
import {
  Building2, Users, Palette, Calculator, Boxes, CreditCard, Wallet,
  Bell, Lock, Database, Plug, LifeBuoy, Crown, Sparkles, Tag,
} from "lucide-react";

export type SettingsSection = {
  slug: string;
  title: string;
  desc: string;
  icon: typeof Building2;
  group: "Empresa" | "Operação" | "Financeiro" | "Sistema" | "Ajuda";
  comingSoon?: boolean;
};

export const SECTIONS: SettingsSection[] = [
  { slug: "empresa", title: "Empresa", desc: "Dados comerciais, contato, endereço e horários", icon: Building2, group: "Empresa" },
  { slug: "usuarios", title: "Usuários e Permissões", desc: "Cargos, acessos e controle de perfis", icon: Users, group: "Empresa" },
  { slug: "aparencia", title: "Aparência", desc: "Tema claro/escuro e paleta de cores", icon: Palette, group: "Empresa" },
  { slug: "assinatura", title: "Assinatura", desc: "Plano atual e upgrade", icon: Crown, group: "Empresa" },

  { slug: "pdv", title: "PDV", desc: "Tipos de venda e finalização", icon: Calculator, group: "Operação" },
  { slug: "estoque", title: "Estoque", desc: "Controle, mínimo e regras de venda", icon: Boxes, group: "Operação", comingSoon: true },

  { slug: "financeiro", title: "Financeiro", desc: "Moeda, formatação e categorias", icon: CreditCard, group: "Financeiro", comingSoon: true },
  { slug: "pagamentos", title: "Formas de pagamento", desc: "Métodos aceitos no sistema", icon: Wallet, group: "Financeiro" },
  { slug: "descontos", title: "Descontos", desc: "Regras, limites e permissões", icon: Tag, group: "Financeiro" },

  { slug: "notificacoes", title: "Notificações", desc: "Alertas do sistema e canais", icon: Bell, group: "Sistema", comingSoon: true },
  { slug: "seguranca", title: "Segurança", desc: "Sessões, senhas e auditoria", icon: Lock, group: "Sistema", comingSoon: true },
  { slug: "backup", title: "Dados e Backup", desc: "Exportações e histórico", icon: Database, group: "Sistema", comingSoon: true },
  { slug: "integracoes", title: "Integrações", desc: "WhatsApp e webhooks", icon: Plug, group: "Sistema", comingSoon: true },

  { slug: "suporte", title: "Suporte", desc: "Central de ajuda e atendimento", icon: LifeBuoy, group: "Ajuda" },
];

const groupOrder: SettingsSection["group"][] = ["Empresa", "Operação", "Financeiro", "Sistema", "Ajuda"];

export function SettingsSideNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const grouped = groupOrder.map((g) => ({ group: g, items: SECTIONS.filter((s) => s.group === g) }));
  return (
    <aside className="w-full shrink-0 md:w-64">
      <nav className="space-y-4">
        {grouped.map(({ group, items }) => (
          <div key={group}>
            <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</div>
            <ul className="space-y-0.5">
              {items.map((s) => {
                const href = `/admin/configuracoes/${s.slug}`;
                const active = pathname === href;
                return (
                  <li key={s.slug}>
                    <Link
                      to={href}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                      }`}
                    >
                      <s.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{s.title}</span>
                      {s.comingSoon && (
                        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Em breve
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
      <Sparkles className="mx-auto mb-3 h-10 w-10 text-primary" />
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        Em breve
      </div>
    </div>
  );
}
