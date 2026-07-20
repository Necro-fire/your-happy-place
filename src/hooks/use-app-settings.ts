import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles } from "@/hooks/use-role";

export type PayMethodEnum = "pix" | "dinheiro" | "credito" | "debito" | "vale" | "credito_cliente";
export type PaymentMethod = { id: string; label: string; ativo: boolean; tipo: PayMethodEnum | "outro" };

const DEFAULT_METHODS: PaymentMethod[] = [
  { id: "dinheiro", label: "Dinheiro", ativo: true, tipo: "dinheiro" },
  { id: "pix", label: "Pix", ativo: true, tipo: "pix" },
  { id: "debito", label: "Cartão de débito", ativo: true, tipo: "debito" },
  { id: "credito", label: "Cartão de crédito", ativo: true, tipo: "credito" },
];

export function useAppSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      return data as any;
    },
    staleTime: 30_000,
  });
}

export function useSettingsSection<T extends Record<string, any>>(section: string, defaults: T): T {
  const q = useAppSettings();
  const cfg = ((q.data?.config as any) ?? {})[section] ?? {};
  return { ...defaults, ...cfg } as T;
}

export function useActivePaymentMethods(): PaymentMethod[] {
  const cfg = useSettingsSection("pagamentos", { metodos: DEFAULT_METHODS });
  const list = Array.isArray(cfg.metodos) && cfg.metodos.length ? cfg.metodos : DEFAULT_METHODS;
  return list.filter((m: PaymentMethod) => m.ativo);
}

/** Resolves a custom tipo="outro" to a valid DB enum value (fallback: dinheiro). */
export function methodToDbEnum(tipo: PaymentMethod["tipo"]): PayMethodEnum {
  if (tipo === "outro") return "dinheiro";
  return tipo;
}

/* ------------------------ Permissions ------------------------ */
export type ModuleKey =
  | "dashboard" | "pdv" | "pedidos" | "mesas" | "caixa" | "vendas"
  | "catalogo" | "estoque" | "kds" | "qrcodes" | "usuarios"
  | "configuracoes" | "suporte";

export function usePermissions() {
  const roles = useMyRoles();
  const perms = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => (await supabase.from("role_permissions").select("role, module, can_view, can_edit")).data ?? [],
    staleTime: 60_000,
  });

  const myRoles = roles.data ?? [];
  // owner/admin/master bypass permission filtering
  const isPrivileged = myRoles.some((r) => ["owner", "admin", "master"].includes(r));

  const canView = (mod: ModuleKey): boolean => {
    if (isPrivileged) return true;
    if (!perms.data || perms.data.length === 0) return true; // no rules configured → open
    return perms.data.some((p: any) => myRoles.includes(p.role) && p.module === mod && p.can_view);
  };

  const canEdit = (mod: ModuleKey): boolean => {
    if (isPrivileged) return true;
    if (!perms.data || perms.data.length === 0) return true;
    return perms.data.some((p: any) => myRoles.includes(p.role) && p.module === mod && p.can_edit);
  };

  return { canView, canEdit, roles: myRoles, isPrivileged, loading: roles.isLoading || perms.isLoading };
}
