import { useSyncExternalStore, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, AlertTriangle, Info, HelpCircle } from "lucide-react";

type Variant = "confirm" | "success" | "error" | "warning" | "info" | "prompt";

type Req = {
  id: number;
  variant: Variant;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  defaultValue?: string;
  placeholder?: string;
  resolve: (val: any) => void;
};

let items: Req[] = [];
const listeners = new Set<() => void>();
let seq = 0;

function emit() {
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function getSnapshot() {
  return items;
}

function push(r: Omit<Req, "id" | "resolve">): Promise<any> {
  return new Promise((resolve) => {
    items = [...items, { ...r, id: ++seq, resolve } as Req];
    emit();
  });
}

function resolveTop(val: any) {
  const top = items[0];
  if (!top) return;
  items = items.slice(1);
  emit();
  top.resolve(val);
}

export const dialog = {
  confirm: (opts: {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
  }): Promise<boolean> => push({ variant: "confirm", ...opts }),
  success: (title: string, description?: string): Promise<boolean> =>
    push({ variant: "success", title, description }),
  error: (title: string, description?: string): Promise<boolean> =>
    push({ variant: "error", title, description }),
  warning: (title: string, description?: string): Promise<boolean> =>
    push({ variant: "warning", title, description }),
  info: (title: string, description?: string): Promise<boolean> =>
    push({ variant: "info", title, description }),
  alert: (opts: {
    title: string;
    description?: string;
    variant?: "info" | "success" | "warning" | "error";
    confirmText?: string;
  }): Promise<boolean> =>
    push({
      variant: opts.variant ?? "info",
      title: opts.title,
      description: opts.description,
      confirmText: opts.confirmText,
    }),
  prompt: (opts: {
    title: string;
    description?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<string | null> => push({ variant: "prompt", ...opts }),
};

const iconFor = {
  confirm: <HelpCircle className="h-5 w-5 text-primary" />,
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  error: <XCircle className="h-5 w-5 text-destructive" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" />,
  info: <Info className="h-5 w-5 text-primary" />,
  prompt: <HelpCircle className="h-5 w-5 text-primary" />,
} as const;

export function AppDialogHost() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const current = list[0];
  return current ? <Renderer key={current.id} req={current} /> : null;
}

function Renderer({ req }: { req: Req }) {
  const [value, setValue] = useState(req.defaultValue ?? "");
  const needsCancel = req.variant === "confirm" || req.variant === "prompt";
  const closeVal = req.variant === "prompt" ? null : req.variant === "confirm" ? false : true;
  const confirmVal = req.variant === "prompt" ? value : true;

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) resolveTop(closeVal);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {iconFor[req.variant]}
            <span>{req.title}</span>
          </DialogTitle>
          {req.description && <DialogDescription>{req.description}</DialogDescription>}
        </DialogHeader>
        {req.variant === "prompt" && (
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={req.placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                resolveTop(value);
              }
            }}
          />
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          {needsCancel && (
            <Button variant="outline" onClick={() => resolveTop(closeVal)}>
              {req.cancelText ?? "Cancelar"}
            </Button>
          )}
          <Button
            variant={req.destructive ? "destructive" : "default"}
            onClick={() => resolveTop(confirmVal)}
            autoFocus={!needsCancel}
          >
            {req.confirmText ?? (needsCancel ? "Confirmar" : "OK")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
