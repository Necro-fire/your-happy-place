import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Building2, KeyRound, ScrollText, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const items = [
  { title: "Dashboard", url: "/master", icon: LayoutDashboard, exact: true },
  { title: "Empresas Clientes", url: "/master/clientes", icon: Building2 },
  { title: "Licenças", url: "/master/licencas", icon: KeyRound },
  { title: "Logs & Auditoria", url: "/master/logs", icon: ScrollText },
];

export function MasterSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon" className="bg-slate-950 text-slate-100 border-r border-slate-800">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-display text-sm font-bold text-slate-50">Painel Master</div>
              <div className="text-[10px] uppercase tracking-wider text-indigo-300">Plataforma</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400">Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)} className="text-slate-200 hover:bg-slate-800 data-[active=true]:bg-indigo-600 data-[active=true]:text-white">
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="text-slate-200 hover:bg-slate-800">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
