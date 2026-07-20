import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";
const cache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<string | null>>();

export function isStoragePath(v?: string | null): v is string {
  if (!v) return false;
  return !/^https?:\/\//i.test(v) && !v.startsWith("data:");
}

export async function getProductImageUrl(pathOrUrl?: string | null): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (!isStoragePath(pathOrUrl)) return pathOrUrl;

  const now = Date.now();
  const hit = cache.get(pathOrUrl);
  if (hit && hit.expires > now + 60_000) return hit.url;
  const pending = inflight.get(pathOrUrl);
  if (pending) return pending;

  const p = (async () => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(pathOrUrl, 60 * 60 * 24 * 7);
    if (!data?.signedUrl) return null;
    cache.set(pathOrUrl, { url: data.signedUrl, expires: now + 6 * 24 * 60 * 60 * 1000 });
    return data.signedUrl;
  })().finally(() => inflight.delete(pathOrUrl));
  inflight.set(pathOrUrl, p);
  return p;
}

export async function uploadProductImage(blob: Blob, ext = "webp"): Promise<string> {
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || `image/${ext}`,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function deleteProductImage(path?: string | null) {
  if (!path || !isStoragePath(path)) return;
  await supabase.storage.from(BUCKET).remove([path]);
  cache.delete(path);
}
