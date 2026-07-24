import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMyRoles() {
  return useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [] as string[];
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      return (data ?? []).map((r) => r.role as string);
    },
    staleTime: 60_000,
  });
}

let rolesCache: { userId: string; roles: string[] } | null = null;

export function clearRolesCache() {
  rolesCache = null;
}

export async function fetchMyRoles(userId?: string): Promise<string[]> {
  let uid = userId;
  if (!uid) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return [];
    uid = u.user.id;
  }
  if (rolesCache && rolesCache.userId === uid) return rolesCache.roles;
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
  const roles = (data ?? []).map((r) => r.role as string);
  rolesCache = { userId: uid, roles };
  return roles;
}

export function isMaster(roles: string[]) {
  return roles.includes("master");
}

export function landingRouteFor(roles: string[]) {
  if (roles.includes("master")) return "/master" as const;
  return "/admin" as const;
}
