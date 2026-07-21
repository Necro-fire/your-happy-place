import { supabase } from "@/integrations/supabase/client";

const isDev = import.meta.env.DEV;
function log(...args: any[]) { if (isDev) console.log("[settings-io]", ...args); }

/** Fetch this tenant's settings row (RLS scopes to current tenant). */
export async function getMySettingsRow(): Promise<any | null> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) { log("read error", error); throw error; }
  return data;
}

/** Update this tenant's settings row. Ensures the row exists first. */
export async function updateMySettings(patch: Record<string, any>): Promise<void> {
  const row = await getMySettingsRow();
  if (!row?.id) {
    throw new Error("Não foi possível atualizar as configurações da empresa.");
  }
  const { error } = await (supabase.from("settings") as any).update(patch).eq("id", row.id);
  if (error) { log("update error", error); throw error; }
}

/**
 * Upload an asset into a per-user folder so the storage RLS policy
 * `(storage.foldername(name))[1] = auth.uid()` is satisfied.
 * Returns { path, publicUrl }.
 */
export async function uploadTenantAsset(
  bucket: string,
  folder: string,
  file: Blob,
  ext = "png",
): Promise<{ path: string; publicUrl: string }> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) throw new Error("Sessão expirada. Faça login novamente.");
  const uid = userData.user.id;
  const cleanExt = ext.replace(/^\.+/, "").toLowerCase() || "png";
  const path = `${uid}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${cleanExt}`;
  const contentType = (file as File).type || `image/${cleanExt === "jpg" ? "jpeg" : cleanExt}`;
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType,
    cacheControl: "31536000",
  });
  if (upErr) { log("upload error", { bucket, path, upErr }); throw upErr; }
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  log("uploaded", { bucket, path, publicUrl: pub.publicUrl });
  return { path, publicUrl: pub.publicUrl };
}

export function friendlyStorageError(e: any): string {
  const msg = String(e?.message ?? e ?? "");
  if (/row-level security|not authorized|permission/i.test(msg)) {
    return "Você não possui permissão para esta operação.";
  }
  if (/too large|exceeded|size/i.test(msg)) return "Imagem muito grande. Tente uma menor.";
  if (/network|fetch/i.test(msg)) return "Falha de conexão. Tente novamente.";
  return "Não foi possível salvar a imagem. Tente novamente.";
}
