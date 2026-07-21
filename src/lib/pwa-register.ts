// Guarded PWA service worker registration.
// - Never registers in dev, iframe, Lovable preview hosts, or when ?sw=off.
// - Uses workbox-window to expose an update-available signal.
import { Workbox } from "workbox-window";

const SW_URL = "/sw.js";

type UpdateHandler = () => void;
let wb: Workbox | null = null;
let updateHandler: UpdateHandler | null = null;

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.top !== window.self) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  if (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  ) {
    return true;
  }
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(SW_URL);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* noop */
  }
}

export function onPwaUpdateAvailable(handler: UpdateHandler) {
  updateHandler = handler;
}

export function applyPwaUpdate() {
  if (!wb) {
    window.location.reload();
    return;
  }
  wb.addEventListener("controlling", () => window.location.reload());
  wb.messageSkipWaiting();
}

export async function registerPwa() {
  if (isRefusedContext()) {
    await unregisterMatching();
    return;
  }
  if (!("serviceWorker" in navigator)) return;
  try {
    wb = new Workbox(SW_URL);
    wb.addEventListener("waiting", () => {
      updateHandler?.();
    });
    await wb.register();
  } catch (err) {
    console.warn("[pwa] register failed", err);
  }
}
