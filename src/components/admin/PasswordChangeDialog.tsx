import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Loader2, Lock, Mail, ShieldCheck, X, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { allRequirementsMet, evaluatePassword, passwordStrength } from "@/lib/password-policy";
import { cn } from "@/lib/utils";

type Step = "confirm" | "code" | "password" | "done";

const RESEND_COOLDOWN = 60;

async function logAudit(acao: string, detalhes: Record<string, unknown> = {}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    // Descobre tenant_id do usuário via user_roles.
    const { data: tRow } = await supabase
      .from("user_roles")
      .select("tenant_id")
      .eq("user_id", u.user.id)
      .not("tenant_id", "is", null)
      .limit(1)
      .maybeSingle();
    const tenantId = (tRow as any)?.tenant_id;
    if (!tenantId) return;
    await (supabase.from("audit_logs") as any).insert({
      tenant_id: tenantId,
      user_id: u.user.id,
      user_email: u.user.email ?? null,
      acao,
      entidade: "auth",
      entidade_id: u.user.id,
      detalhes: detalhes as any,
    });
  } catch {
    /* auditoria não deve bloquear o fluxo */
  }
}

async function isSameAsCurrentPassword(email: string, newPwd: string): Promise<boolean> {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const probe = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { error } = await probe.auth.signInWithPassword({ email, password: newPwd });
  // Se logou com a nova senha, é igual à atual.
  return !error;
}

export function PasswordChangeDialog({
  open,
  onOpenChange,
  email,
  nome,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  email: string;
  nome?: string;
}) {
  const [step, setStep] = useState<Step>("confirm");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const cooldownRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      // reset completo ao fechar
      setStep("confirm");
      setOtp("");
      setPwd("");
      setPwd2("");
      setShowPwd(false);
      setCooldown(0);
      setLoading(false);
      setSending(false);
      if (cooldownRef.current) window.clearInterval(cooldownRef.current);
    }
  }, [open]);

  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = window.setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (cooldownRef.current) window.clearInterval(cooldownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (cooldownRef.current) window.clearInterval(cooldownRef.current);
    };
  }, [cooldown]);

  const reqs = useMemo(() => evaluatePassword(pwd, { email, nome }), [pwd, email, nome]);
  const strength = useMemo(() => passwordStrength(pwd), [pwd]);
  const policyOk = allRequirementsMet(pwd, { email, nome });
  const match = pwd.length > 0 && pwd === pwd2;

  async function sendCode(initial = false) {
    setSending(true);
    try {
      const { error } = await supabase.auth.reauthenticate();
      if (error) throw error;
      await logAudit(initial ? "password_change_requested" : "password_change_code_resent");
      toast.success(`Código enviado para ${email}`);
      setCooldown(RESEND_COOLDOWN);
      setStep("code");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível enviar o código.");
    } finally {
      setSending(false);
    }
  }

  async function submitNewPassword() {
    if (!policyOk) {
      toast.error("Sua senha ainda não atende a todos os requisitos.");
      return;
    }
    if (!match) {
      toast.error("A confirmação não confere com a nova senha.");
      return;
    }
    setLoading(true);
    try {
      // 1) impedir reutilização da senha atual
      const same = await isSameAsCurrentPassword(email, pwd);
      if (same) {
        await logAudit("password_change_failed", { reason: "same_as_current" });
        toast.error("A nova senha não pode ser igual à senha atual.");
        setLoading(false);
        return;
      }

      // 2) atualizar senha usando o nonce enviado por e-mail (Supabase valida no servidor)
      const { error } = await supabase.auth.updateUser({
        password: pwd,
        nonce: otp,
      });
      if (error) {
        await logAudit("password_change_failed", { reason: error.message });
        // Mensagens genéricas para evitar enumeração
        if (/nonce|otp|token|code/i.test(error.message)) {
          toast.error("Código inválido ou expirado. Solicite um novo.");
        } else {
          toast.error(error.message ?? "Não foi possível alterar a senha.");
        }
        setLoading(false);
        return;
      }

      await logAudit("password_changed");

      // 3) revogar todas as sessões (nova senha exige novo login em todos os dispositivos)
      try {
        await supabase.auth.signOut({ scope: "global" });
      } catch {
        await supabase.auth.signOut();
      }

      setStep("done");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro inesperado ao alterar senha.");
    } finally {
      setLoading(false);
    }
  }

  const maskedEmail = email.replace(/^(.).+(.@.+)$/, "$1•••$2");
  const strengthColor = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"][strength.score];

  return (
    <Dialog open={open} onOpenChange={(v) => (!loading ? onOpenChange(v) : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            {step === "done" ? "Senha alterada" : "Alterar senha"}
          </DialogTitle>
          <DialogDescription>
            {step === "confirm" && "Por segurança, enviaremos um código para o e-mail da sua conta."}
            {step === "code" && `Digite o código de 6 dígitos enviado para ${maskedEmail}.`}
            {step === "password" && "Defina uma nova senha que atenda a todos os requisitos."}
            {step === "done" && "Sua senha foi atualizada e todas as sessões foram encerradas."}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        {step !== "done" && (
          <div className="flex items-center gap-2 py-1">
            {(["confirm", "code", "password"] as Step[]).map((s, i) => {
              const active = step === s;
              const done = ["confirm", "code", "password"].indexOf(step) > i;
              return (
                <div key={s} className="flex flex-1 items-center gap-2">
                  <div
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-full border text-[11px] font-semibold",
                      done && "border-emerald-600 bg-emerald-600 text-white",
                      active && "border-primary bg-primary text-primary-foreground",
                      !active && !done && "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  {i < 2 && <div className={cn("h-px flex-1", done ? "bg-emerald-600" : "bg-border")} />}
                </div>
              );
            })}
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
              <Mail className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="font-medium">Verificação por e-mail</p>
                <p className="text-muted-foreground">
                  Enviaremos um código de 6 dígitos para <strong>{maskedEmail}</strong>. Válido por
                  10 minutos.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === "code" && (
          <div className="space-y-3">
            <div className="flex justify-center py-2">
              <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Não recebeu? Verifique sua caixa de spam.</span>
              <button
                type="button"
                className="text-primary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                onClick={() => sendCode(false)}
                disabled={cooldown > 0 || sending}
              >
                {sending ? "Enviando..." : cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
              </button>
            </div>
          </div>
        )}

        {step === "password" && (
          <div className="space-y-3">
            <div>
              <Label>Nova senha</Label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground hover:text-foreground"
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Strength meter */}
            <div className="space-y-1">
              <div className="flex h-1.5 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 rounded",
                      i < strength.score ? strengthColor : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">Força: {strength.label}</p>
            </div>

            <div>
              <Label>Confirmar nova senha</Label>
              <Input
                type={showPwd ? "text" : "password"}
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                autoComplete="new-password"
              />
              {pwd2.length > 0 && !match && (
                <p className="mt-1 text-[11px] text-destructive">As senhas não conferem.</p>
              )}
            </div>

            <ul className="grid gap-1 rounded-md border border-border bg-muted/30 p-2 text-xs">
              {reqs.map((r) => (
                <li key={r.id} className="flex items-center gap-1.5">
                  {r.ok ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={cn(r.ok ? "text-foreground" : "text-muted-foreground")}>
                    {r.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2 rounded-md border border-emerald-600/40 bg-emerald-600/10 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
              <div>
                <p className="font-medium">Senha alterada com sucesso</p>
                <p className="text-muted-foreground">
                  Todos os dispositivos foram desconectados. Faça login novamente com sua nova senha.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
              <p className="text-muted-foreground">
                Não foi você quem alterou? Entre em contato imediatamente com o suporte.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {step === "confirm" && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
                Cancelar
              </Button>
              <Button onClick={() => sendCode(true)} disabled={sending}>
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Enviar código
              </Button>
            </>
          )}
          {step === "code" && (
            <>
              <Button variant="ghost" onClick={() => setStep("confirm")} disabled={loading}>
                Voltar
              </Button>
              <Button
                onClick={() => {
                  if (otp.length !== 6) {
                    toast.error("Digite os 6 dígitos do código.");
                    return;
                  }
                  setStep("password");
                }}
                disabled={otp.length !== 6}
              >
                Continuar
              </Button>
            </>
          )}
          {step === "password" && (
            <>
              <Button variant="ghost" onClick={() => setStep("code")} disabled={loading}>
                Voltar
              </Button>
              <Button onClick={submitNewPassword} disabled={loading || !policyOk || !match}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Alterar senha
              </Button>
            </>
          )}
          {step === "done" && (
            <Button
              onClick={() => {
                onOpenChange(false);
                // força redirecionamento para login
                window.location.href = "/auth";
              }}
            >
              Ir para login
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
