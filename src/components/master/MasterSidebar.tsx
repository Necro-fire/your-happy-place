import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Building2, KeyRound, ScrollText, LogOut,
  Receipt, CreditCard, BarChart3, Users, Settings, ShieldCheck, Box, Menu,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";


type Item = { title: string; url?: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean; soon?: boolean };

const items: Item[] = [
  { title: "Dashboard", url: "/master", icon: LayoutDashboard, exact: true },
  { title: "Empresas", url: "/master/clientes", icon: Building2 },
  { title: "Licenças", url: "/master/licencas", icon: KeyRound },
  { title: "Assinaturas", icon: Receipt, soon: true },
  { title: "Pagamentos", icon: CreditCard, soon: true },
  { title: "Usuários", icon: Users, soon: true },
  { title: "Relatórios", icon: BarChart3, soon: true },
  { title: "Logs", url: "/master/logs", icon: ScrollText },
  { title: "Segurança", icon: ShieldCheck, soon: true },
  { title: "Configurações", url: "/master/configuracoes", icon: Settings },
];


function useMasterNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const me = useQuery({
    queryKey: ["master-me"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: p } = await supabase.from("profiles").select("nome, email").eq("user_id", user.id).maybeSingle();
      return { nome: p?.nome ?? user.email ?? "Desenvolvedor", email: p?.email ?? user.email ?? "" };
    },
    staleTime: 60_000,
  });

  const isActive = (url?: string, exact?: boolean) => {
    if (!url) return false;
    return exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");
  };

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return { me, isActive, signOut };
}

function NavBody({ onNavigate }: { onNavigate?: () => void }) {
  const { me, isActive, signOut } = useMasterNav();
  const initials = (me.data?.nome ?? "D").slice(0, 1).toUpperCase();

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--ms-surface)", color: "var(--ms-text)" }}>
      {/* Brand */}
      <div
        className="flex h-16 items-center gap-2.5 border-b px-5"
        style={{ borderColor: "var(--ms-border)" }}
      >
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
          style={{ background: "var(--ms-primary)", color: "var(--ms-primary-fg)" }}
        >
          <Box className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold" style={{ color: "var(--ms-text)" }}>SaborSys</div>
          <div className="truncate text-[11px]" style={{ color: "var(--ms-text-muted)" }}>Painel Master</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div
          className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "var(--ms-text-subtle)" }}
        >
          Menu principal
        </div>
        <div className="space-y-1">
          {items.map((item) => {
            const active = isActive(item.url, item.exact);
            const content = (
              <div className={cn("ms-nav-item", active && "is-active")}>
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1 truncate">{item.title}</span>
                {item.soon && (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide"
                    style={{ background: "var(--ms-hover)", color: "var(--ms-text-subtle)" }}
                  >
                    breve
                  </span>
                )}
              </div>
            );
            if (item.url) {
              return (
                <Link key={item.title} to={item.url} className="block" onClick={onNavigate}>
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => { toast.info(`${item.title} em breve`); onNavigate?.(); }}
                className="block w-full text-left"
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="border-t p-3" style={{ borderColor: "var(--ms-border)" }}>
        <div className="flex items-center gap-3 rounded-xl p-2">
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold"
            style={{ background: "var(--ms-primary-soft)", color: "var(--ms-primary)" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-medium" style={{ color: "var(--ms-text)" }}>Desenvolvedor</div>
            <div className="truncate text-[11px]" style={{ color: "var(--ms-text-muted)" }}>{me.data?.email ?? "—"}</div>
          </div>
          <button
            onClick={signOut}
            title="Sair"
            className="grid h-9 w-9 place-items-center rounded-lg transition-colors hover:text-[#ef4444]"
            style={{ color: "var(--ms-text-muted)" }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function MasterSidebar() {
  return (
    <aside
      className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r lg:block"
      style={{ borderColor: "var(--ms-border)", background: "var(--ms-surface)" }}
    >
      <NavBody />
    </aside>
  );
}

export function MasterMobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border shadow-sm lg:hidden"
        style={{
          borderColor: "var(--ms-border-strong)",
          background: "var(--ms-surface)",
          color: "var(--ms-text)",
        }}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="master-saas w-72 border-r p-0 shadow-xl"
        style={{
          borderColor: "var(--ms-border)",
          background: "var(--ms-surface)",
          color: "var(--ms-text)",
        }}
      >
        <SheetTitle className="sr-only">Menu do Painel Master</SheetTitle>
        <NavBody onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
