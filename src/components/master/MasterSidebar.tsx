import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Building2, KeyRound, ScrollText, LogOut,
  Receipt, CreditCard, BarChart3, Users, Settings, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Item = { title: string; url?: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean; soon?: boolean };

const items: Item[] = [
  { title: "Dashboard", url: "/master", icon: LayoutDashboard, exact: true },
  { title: "Empresas", url: "/master/clientes", icon: Building2 },
  { title: "Licenças", url: "/master/licencas", icon: KeyRound },
  { title: "Assinaturas", icon: Receipt, soon: true },
  { title: "Pagamentos", icon: CreditCard, soon: true },
  { title: "Relatórios", icon: BarChart3, soon: true },
  { title: "Usuários", icon: Users, soon: true },
  { title: "Logs", url: "/master/logs", icon: ScrollText },
  { title: "Configurações", icon: Settings, soon: true },
  { title: "Segurança", icon: ShieldCheck, soon: true },
];

export function MasterSidebar() {
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

  return (
    <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col gap-4 overflow-y-auto p-4 md:flex">
      {/* Brand */}
      <div className="doodle-card rounded-[28px_16px_32px_14px] p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 rotate-[-4deg] place-items-center rounded-2xl border-2 border-slate-900 bg-[#FF8A00] text-slate-900 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
            <span className="font-display text-xl font-bold">S</span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-2xl font-bold leading-none">SaborSys</div>
            <div className="mt-1 inline-flex rounded-full border-2 border-emerald-700 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Painel Master
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="doodle-card flex-1 rounded-[24px_18px_28px_16px] p-4">
        <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Menu</div>
        <div className="space-y-1.5">
          {items.map((item) => {
            const active = isActive(item.url, item.exact);
            const content = (
              <div className={cn("doodle-nav-item text-[15px] font-bold", active && "is-active")}>
                <span className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-xl border-2 border-slate-900",
                  active ? "bg-white" : "bg-[#fff7ec]",
                )}>
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 truncate">{item.title}</span>
                {item.soon && (
                  <span className="rounded-full border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                    em breve
                  </span>
                )}
              </div>
            );
            if (item.url) {
              return <Link key={item.title} to={item.url} className="block">{content}</Link>;
            }
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => toast.info(`${item.title} em breve`)}
                className="block w-full text-left"
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Profile */}
      <div className="doodle-card rounded-[20px_28px_16px_24px] p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-slate-900 bg-[#FF8A00]/20 text-slate-900">
            <span className="font-bold">
              {(me.data?.nome ?? "D").slice(0, 1).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-bold">Desenvolvedor Master</div>
            <div className="truncate text-[11px] text-slate-500">{me.data?.email ?? "—"}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="doodle-btn mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </aside>
  );
}
