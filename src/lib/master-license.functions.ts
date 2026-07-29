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

    let profile: {
      nome: string | null;
      email: string | null;
      telefone: string | null;
      avatar_url: string | null;
      created_at: string | null;
    } | null = null;
    let authUser: {
      id: string;
      email: string | null;
      phone: string | null;
      created_at: string | null;
      last_sign_in_at: string | null;
      email_confirmed_at: string | null;
      providers: string[];
      banned_until: string | null;
    } | null = null;
    if (ownerId) {
      const [profRes, authRes] = await Promise.all([
        supabaseAdmin.from("profiles").select("nome, email, telefone, avatar_url, created_at").eq("user_id", ownerId).maybeSingle(),
        supabaseAdmin.auth.admin.getUserById(ownerId),
      ]);
      profile = profRes.data ?? null;
      if (authRes.data?.user) {
        const u = authRes.data.user;
        const meta = (u.app_metadata ?? {}) as { providers?: string[]; provider?: string };
        authUser = {
          id: u.id,
          email: u.email ?? null,
          phone: u.phone ?? null,
          created_at: u.created_at ?? null,
          last_sign_in_at: u.last_sign_in_at ?? null,
          email_confirmed_at: u.email_confirmed_at ?? null,
          providers: meta.providers ?? (meta.provider ? [meta.provider] : []),
          banned_until: (u as { banned_until?: string }).banned_until ?? null,
        };
      }
    }

    // Counts
    type CountableTable =
      | "employees" | "products" | "categories" | "complements"
      | "orders" | "customers" | "restaurant_tables";
    const countOf = async (table: CountableTable) => {
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
