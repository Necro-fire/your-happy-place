import { useMemo, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard, ShoppingCart, Package, ClipboardList, Calculator, Coffee, Wallet,
  Settings, LogOut, Croissant, LifeBuoy, ChefHat, Users, QrCode, Search,
  DollarSign, Boxes, Building2, BarChart3, ConciergeBell, Globe,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type Item = { title: string; url: string; icon: any; exact?: boolean; external?: boolean };
type Group = { id: string; label: string; icon: any; items: Item[] };

const groups: Group[] = [
  {
    id: "vendas", label: "Vendas", icon: ShoppingCart,
    items: [
      { title: "PDV", url: "/admin/pdv", icon: Calculator },
      { title: "Pedidos", url: "/admin/pedidos", icon: ClipboardList },
      { title: "Mesas", url: "/admin/mesas", icon: Coffee },
      { title: "Histórico de vendas", url: "/admin/vendas", icon: BarChart3 },
      { title: "Cardápio Público", url: "/", icon: Globe, external: true },
    ],
  },
  {
    id: "financeiro", label: "Financeiro", icon: DollarSign,
    items: [
      { title: "Caixa", url: "/admin/caixa", icon: Wallet },
      { title: "Métodos de pagamento", url: "/admin/configuracoes/pdv", icon: DollarSign },
    ],
  },
  {
    id: "estoque", label: "Estoque", icon: Boxes,
    items: [
      { title: "Produtos e Categorias", url: "/admin/catalogo", icon: Package },
      { title: "Regras de estoque", url: "/admin/configuracoes/estoque", icon: Boxes },
    ],
  },
  {
    id: "atendimento", label: "Atendimento", icon: ConciergeBell,
    items: [
      { title: "KDS Cozinha", url: "/admin/kds", icon: ChefHat },
      { title: "QR Codes", url: "/admin/qrcodes", icon: QrCode },
    ],
  },
  {
    id: "gestao", label: "Gestão", icon: Building2,
    items: [
      { title: "Usuários", url: "/admin/usuarios", icon: Users },
      { title: "Permissões", url: "/admin/configuracoes/usuarios", icon: Users },
      { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
      { title: "Suporte", url: "/admin/suporte", icon: LifeBuoy },
    ],
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((i) => i.title.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [query]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gradient-primary text-primary-foreground">
            <Croissant className="h-4 w-4" />
          </div>
          {!collapsed && <span className="font-display text-base font-bold text-sidebar-foreground">Padaria</span>}
        </div>
        {!collapsed && (
          <div className="px-2 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin", true)} tooltip="Dashboard">
                  <Link to="/admin" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filtered.map((g) => (
          <SidebarGroup key={g.id} className="p-0 px-2 pt-1">
            {!collapsed ? (
              <SidebarGroupLabel
                className={cn(
                  "pointer-events-none select-none h-5 px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70",
                )}
              >
                <g.icon className="mr-1.5 h-3 w-3 opacity-70" aria-hidden />
                <span>{g.label}</span>
              </SidebarGroupLabel>
            ) : (
              <div className="mx-2 my-0.5 h-px bg-sidebar-border/60" aria-hidden />
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url + item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)} tooltip={item.title}>
                      {item.external ? (
                        <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </a>
                      ) : (
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
