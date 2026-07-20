import { useEffect, useState } from "react";
import { Bell, Search, Plus } from "lucide-react";
import { MasterMobileNav } from "@/components/master/MasterSidebar";

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function MasterTopbar() {
  const now = useNow();
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b border-[#e5e7eb] bg-white/95 px-3 backdrop-blur sm:gap-3 sm:px-6 lg:px-8">
      <MasterMobileNav />
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
        <input
          placeholder="Buscar empresas, usuários, licenças..."
          className="ms-input"
        />
      </div>
      <div className="flex-1 md:hidden" />
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button className="ms-btn ms-btn--primary ms-btn--sm hidden sm:inline-flex">
          <Plus className="h-4 w-4" /> Ação rápida
        </button>
        <button className="relative grid h-9 w-9 place-items-center rounded-lg border border-[#e5e7eb] bg-white text-[#4b5563] hover:bg-[#f9fafb]">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
        </button>
        <div className="hidden rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-right sm:block">
          <div className="text-[13px] font-medium leading-tight text-[#0f172a]">
            {now ? now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "--/--/----"}
          </div>
          <div className="text-[11px] leading-tight text-[#6b7280]">
            {now ? now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
          </div>
        </div>
      </div>
    </header>
  );
}
