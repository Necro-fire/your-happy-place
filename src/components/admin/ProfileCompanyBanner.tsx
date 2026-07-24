import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useMyProfile, isProfileComplete, isCompanyComplete } from "@/hooks/use-profile-status";
import { getMySettingsRow } from "@/lib/settings-io";

export function ProfileCompanyBanner() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { data: profile } = useMyProfile();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getMySettingsRow,
    staleTime: 60_000,
  });

  const missing: string[] = [];
  if (!isProfileComplete(profile ?? null)) missing.push("Dados Pessoais");
  if (!isCompanyComplete(settings)) missing.push("Dados da Empresa");
  if (missing.length === 0) return null;

  // Já está na Central de Configurações? Mantemos o aviso, mas com link mais discreto.
  const onSettings = pathname.startsWith("/admin/configuracoes");
  const target = missing[0] === "Dados Pessoais"
    ? "/admin/configuracoes/perfil"
    : "/admin/configuracoes/empresa";

  const label =
    missing.length === 2
      ? "Complete seus Dados Pessoais e os Dados da Empresa para utilizar todos os recursos do sistema."
      : `Complete ${missing[0]} para utilizar todos os recursos do sistema.`;

  return (
    <Link
      to={target}
      className="flex items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate font-medium">{label}</span>
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:bg-amber-100/10">
        {onSettings ? "Ir para pendências" : "Completar agora"} <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}
