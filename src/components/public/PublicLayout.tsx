import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShoppingBag, Store, Coffee, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useMesaSession } from "@/lib/mesa-session";
import { Badge } from "@/components/ui/badge";
import { usePublicSettings } from "@/hooks/use-public-settings";
import { useTenant, publicMenuHref } from "@/lib/tenant-session";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { count } = useCart();
  const { mesa, setMesa } = useMesaSession();
  const { data: settings } = usePublicSettings();
  const tenant = useTenant();
  const nome = settings?.nome ?? "";
  const logo = settings?.logo_url ?? null;
  const homeTo = publicMenuHref(tenant);


  useEffect(() => {
    if (nome && typeof document !== "undefined") {
      document.title = nome;
    }
  }, [nome]);

  return (
    <div className="min-h-screen bg-background">
      {mesa && (
        <div className="flex items-center justify-between gap-2 bg-primary px-4 py-1.5 text-xs text-primary-foreground">
          <span className="inline-flex items-center gap-1.5"><Coffee className="h-3 w-3" /> Você está na Mesa {mesa.numero}</span>
          <button onClick={() => setMesa(null)} className="inline-flex items-center gap-1 opacity-80 hover:opacity-100">
            <X className="h-3 w-3" /> Sair
          </button>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href={homeTo} className="flex items-center gap-2 min-w-0">
            {logo ? (
              <img
                src={logo}
                alt={nome}
                className="h-9 w-9 rounded-lg object-cover"
              />
            ) : (
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
                <Store className="h-5 w-5" />
              </div>
            )}
            <span className="font-display text-xl font-bold tracking-tight truncate">
              {nome || "\u00A0"}
            </span>
          </a>
          <nav className="flex items-center gap-2">
            <Link
              to="/carrinho"
              className="relative inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent/40"
            >
              <ShoppingBag className="h-4 w-4" />
              Carrinho
              {count > 0 && (
                <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full bg-primary p-0 px-1.5 text-[10px] text-primary-foreground">
                  {count}
                </Badge>
              )}
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-16 border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {nome} {settings?.cidade && settings?.estado ? `— ${settings.cidade}/${settings.estado}` : ""}
      </footer>
    </div>
  );
}
