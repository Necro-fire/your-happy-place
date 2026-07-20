import { Link, useRouterState } from "@tanstack/react-router";
import {
  Building2, Users, Package, ShoppingCart, Calculator, Coffee, Bike, Boxes, Wallet,
  CreditCard, BarChart3, Users2, Gift, Megaphone, Printer, Bell, Globe, QrCode,
  Store, Lock, ScrollText, Database, Palette, Languages, Info, Sparkles, Crown,
} from "lucide-react";

export type SettingsSection = {
  slug: string;
  title: string;
  desc: string;
  icon: typeof Building2;
  group: "Empresa" | "Operação" | "Financeiro" | "Clientes & Marketing" | "Comunicação" | "Sistema";
};

export const SECTIONS: SettingsSection[] = [
  { slug: "empresa", title: "Empresa", desc: "Dados, contato, endereço e horário", icon: Building2, group: "Empresa" },
  { slug: "assinatura", title: "Assinatura", desc: "Plano atual, upgrade e comparativo", icon: Crown, group: "Empresa" },
  { slug: "usuarios", title: "Usuários e Permissões", desc: "Perfis, acessos e papéis", icon: Users, group: "Empresa" },
  { slug: "aparencia", title: "Aparência", desc: "Logo, banner e cores da marca", icon: Palette, group: "Empresa" },

  { slug: "produtos", title: "Produtos", desc: "Catálogo, unidades e validade", icon: Package, group: "Operação" },
  { slug: "pedidos", title: "Pedidos", desc: "Tipos de pedido, status e tempo", icon: ShoppingCart, group: "Operação" },
  { slug: "pdv", title: "PDV", desc: "Pagamento, desconto e atalhos", icon: Calculator, group: "Operação" },
  { slug: "mesas", title: "Mesas", desc: "Setores, capacidade e QR", icon: Coffee, group: "Operação" },
  { slug: "delivery", title: "Delivery", desc: "Taxas, áreas e horários", icon: Bike, group: "Operação" },
  { slug: "estoque", title: "Estoque", desc: "Mínimo, alertas e receita", icon: Boxes, group: "Operação" },
  { slug: "impressoes", title: "Impressões", desc: "Impressoras e vias", icon: Printer, group: "Operação" },

  { slug: "caixa", title: "Caixa", desc: "Sangria, suprimento e fechamento", icon: Wallet, group: "Financeiro" },
  { slug: "financeiro", title: "Financeiro", desc: "Categorias e formas de pagamento", icon: CreditCard, group: "Financeiro" },
  { slug: "dashboard", title: "Dashboard", desc: "Indicadores e metas", icon: BarChart3, group: "Financeiro" },

  { slug: "clientes", title: "Clientes", desc: "Cadastro e histórico", icon: Users2, group: "Clientes & Marketing" },
  { slug: "fidelidade", title: "Fidelidade", desc: "Pontos, cashback e cupons", icon: Gift, group: "Clientes & Marketing" },
  { slug: "marketing", title: "Marketing", desc: "Campanhas e mensagens", icon: Megaphone, group: "Clientes & Marketing" },

  { slug: "notificacoes", title: "Notificações", desc: "Alertas e canais", icon: Bell, group: "Comunicação" },
  { slug: "area-publica", title: "Área Pública", desc: "Cardápio digital", icon: Globe, group: "Comunicação" },
  { slug: "qrcodes", title: "QR Codes", desc: "Mesas e cardápio", icon: QrCode, group: "Comunicação" },

  { slug: "filiais", title: "Filiais", desc: "Unidades do estabelecimento", icon: Store, group: "Sistema" },
  { slug: "seguranca", title: "Segurança", desc: "Sessões e bloqueios", icon: Lock, group: "Sistema" },
  { slug: "auditoria", title: "Auditoria", desc: "Histórico de alterações", icon: ScrollText, group: "Sistema" },
  { slug: "backup", title: "Backup", desc: "Exportações e restaurações", icon: Database, group: "Sistema" },
  { slug: "regiao", title: "Região", desc: "Fuso, moeda e idioma", icon: Languages, group: "Sistema" },
  { slug: "sistema", title: "Sistema", desc: "Versão e informações", icon: Info, group: "Sistema" },
];

const groupOrder: SettingsSection["group"][] = [
  "Empresa", "Operação", "Financeiro", "Clientes & Marketing", "Comunicação", "Sistema",
];

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
      <p className="mt-4 text-xs text-muted-foreground">
        Estrutura pronta — em breve as opções detalhadas ficam disponíveis nesta seção.
      </p>
    </div>
  );
}
