import { supabase } from "@/integrations/supabase/client";

export async function logMaster(action: string, entity?: string, entity_id?: string, detalhes: Record<string, unknown> = {}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("master_logs").insert({
    actor_user_id: u.user.id,
    actor_email: u.user.email ?? null,
    action,
    entity: entity ?? null,
    entity_id: entity_id ?? null,
    detalhes,
  });
}
