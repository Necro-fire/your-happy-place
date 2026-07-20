import { Link, useRouterState } from "@tanstack/react-router";
import {
  Building2, Users, Palette, Calculator, Boxes, CreditCard, Wallet, Printer,
  Bell, Lock, Database, Plug, LifeBuoy, Crown, Sparkles,
} from "lucide-react";

export type SettingsSection = {
  slug: string;
  title: string;
  desc: string;
  icon: typeof Building2;
  group: "Empresa" | "Operação" | "Financeiro" | "Sistema" | "Ajuda";
};

export const SECTIONS: SettingsSection[] = [
  { slug: "empresa", title: "Empresa", desc: "Dados comerciais, contato, endereço e logo", icon: Building2, group: "Empresa" },
  { slug: "usuarios", title: "Usuários e Permissões", desc: "Cargos, acessos e controle de perfis", icon: Users, group: "Empresa" },
  { slug: "aparencia", title: "Aparência", desc: "Tema claro/escuro e paleta de cores", icon: Palette, group: "Empresa" },
  { slug: "assinatura", title: "Assinatura", desc: "Plano atual e upgrade", icon: Crown, group: "Empresa" },

  { slug: "pdv", title: "PDV", desc: "Comportamento das vendas e finalização", icon: Calculator, group: "Operação" },
  { slug: "estoque", title: "Estoque", desc: "Controle, mínimo e regras de venda", icon: Boxes, group: "Operação" },
  { slug: "impressoes", title: "Impressões", desc: "Comprovantes, cabeçalho e rodapé", icon: Printer, group: "Operação" },

  { slug: "financeiro", title: "Financeiro", desc: "Moeda, formatação e categorias", icon: CreditCard, group: "Financeiro" },
  { slug: "pagamentos", title: "Formas de pagamento", desc: "Métodos aceitos no PDV", icon: Wallet, group: "Financeiro" },

  { slug: "notificacoes", title: "Notificações", desc: "Alertas do sistema e canais", icon: Bell, group: "Sistema" },
  { slug: "seguranca", title: "Segurança", desc: "Sessões, senhas e auditoria", icon: Lock, group: "Sistema" },
  { slug: "backup", title: "Dados e Backup", desc: "Exportações e histórico", icon: Database, group: "Sistema" },
  { slug: "integracoes", title: "Integrações", desc: "Impressoras, WhatsApp e webhooks", icon: Plug, group: "Sistema" },

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
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
      <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
