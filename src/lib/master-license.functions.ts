import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ licenseId: z.string().uuid() });

export const getLicenseDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Master gate
    const { data: isMaster } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "master",
    });
    if (!isMaster) throw new Error("Forbidden: master only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: license } = await supabaseAdmin
      .from("licenses")
      .select("*")
      .eq("id", data.licenseId)
      .maybeSingle();
    if (!license) throw new Error("Licença não encontrada");

    const tenantId = license.tenant_id;

    const [tenantRes, settingsRes] = await Promise.all([
      tenantId
        ? supabaseAdmin.from("tenants").select("*").eq("id", tenantId).maybeSingle()
        : Promise.resolve({ data: null } as { data: null }),
      tenantId
        ? supabaseAdmin.from("settings").select("*").eq("tenant_id", tenantId).maybeSingle()
        : Promise.resolve({ data: null } as { data: null }),
    ]);
    const tenant = tenantRes.data;
    const settings = settingsRes.data;

    const ownerId = tenant?.owner_user_id ?? null;

    let profile: Record<string, unknown> | null = null;
    let authUser: Record<string, unknown> | null = null;
    if (ownerId) {
      const [profRes, authRes] = await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("user_id", ownerId).maybeSingle(),
        supabaseAdmin.auth.admin.getUserById(ownerId),
      ]);
      profile = profRes.data as Record<string, unknown> | null;
      if (authRes.data?.user) {
        const u = authRes.data.user;
        authUser = {
          id: u.id,
          email: u.email,
          phone: u.phone,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at,
          providers: u.app_metadata?.providers ?? [u.app_metadata?.provider].filter(Boolean),
          banned_until: (u as { banned_until?: string }).banned_until ?? null,
        };
      }
    }

    // Counts
    const countOf = async (table: string) => {
      if (!tenantId) return 0;
      const { count } = await supabaseAdmin
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      return count ?? 0;
    };
    const todayIso = new Date();
    todayIso.setHours(0, 0, 0, 0);
    const ordersTodayPromise = tenantId
      ? supabaseAdmin
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte("created_at", todayIso.toISOString())
      : Promise.resolve({ count: 0 } as { count: number });

    const [
      employees,
      products,
      categories,
      complements,
      orders,
      customers,
      tables,
      users,
      ordersTodayRes,
    ] = await Promise.all([
      countOf("employees"),
      countOf("products"),
      countOf("categories"),
      countOf("complements"),
      countOf("orders"),
      countOf("customers"),
      countOf("restaurant_tables"),
      tenantId
        ? supabaseAdmin
            .from("user_roles")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .then((r) => r.count ?? 0)
        : Promise.resolve(0),
      ordersTodayPromise,
    ]);

    // License history from master_logs
    const { data: history } = await supabaseAdmin
      .from("master_logs")
      .select("id, action, detalhes, created_at, actor_email")
      .eq("entity", "license")
      .eq("entity_id", data.licenseId)
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      license,
      tenant,
      settings,
      profile,
      authUser,
      usage: {
        employees,
        products,
        categories,
        complements,
        orders,
        ordersToday: ordersTodayRes.count ?? 0,
        customers,
        tables,
        users,
      },
      history: history ?? [],
    };
  });
