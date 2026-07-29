import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  X,
} from "lucide-react";
import { allRequirementsMet, evaluatePassword, passwordStrength } from "@/lib/password-policy";
import { cn } from "@/lib/utils";

type Step = "email" | "code" | "password" | "done";

const RESEND_COOLDOWN = 60;
const MAX_ATTEMPTS = 5;

export function ForgotPasswordFlow({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const cooldownRef = useRef<number | null>(null);

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

  const reqs = useMemo(() => evaluatePassword(pwd, { email }), [pwd, email]);
  const strength = useMemo(() => passwordStrength(pwd), [pwd]);
  const policyOk = allRequirementsMet(pwd, { email });
  const match = pwd.length > 0 && pwd === pwd2;
  const maskedEmail = email.replace(/^(.).+(.@.+)$/, "$1•••$2");

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email) return;
    setSending(true);
    // Neutral message — never reveals whether the email exists
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth",
      });
    } catch {
      /* swallow — neutral response */
    }
    setSending(false);
    setCooldown(RESEND_COOLDOWN);
    setAttempts(0);
    setStep("code");
    toast.success("Se existir uma conta vinculada a este e-mail, um código será enviado.");
  }

  async function resendCode() {
    if (cooldown > 0) return;
    setSending(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth",
      });
    } catch {
      /* neutral */
    }
    setSending(false);
    setCooldown(RESEND_COOLDOWN);
    toast.success("Novo código enviado, se o e-mail estiver cadastrado.");
  }

  async function verifyCode() {
    if (otp.length !== 6) {
      toast.error("Digite os 6 dígitos do código.");
      return;
    }
    if (attempts >= MAX_ATTEMPTS) {
      toast.error("Muitas tentativas. Solicite um novo código.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "recovery",
    });
    setLoading(false);
    if (error) {
      setAttempts((n) => n + 1);
      const remaining = MAX_ATTEMPTS - attempts - 1;
      toast.error(
        remaining > 0
          ? `Código inválido ou expirado. Tentativas restantes: ${remaining}.`
          : "Muitas tentativas. Solicite um novo código.",
      );
      return;
    }
    setStep("password");
  }

  async function submitNewPassword() {
    if (!policyOk) {
      toast.error("A senha ainda não atende a todos os requisitos.");
      return;
    }
    if (!match) {
      toast.error("A confirmação não confere com a nova senha.");
      return;
    }
    setLoading(true);
    // Prevent reusing the same password
    const { error: sameErr } = await supabase.auth.updateUser({ password: pwd });
    if (sameErr) {
      setLoading(false);
      if (/same.*password|different/i.test(sameErr.message)) {
        toast.error("A nova senha não pode ser igual à senha anterior.");
      } else {
        toast.error(sameErr.message || "Não foi possível alterar a senha.");
      }
      return;
    }
    // Revoke all sessions
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      await supabase.auth.signOut();
    }
    setLoading(false);
    setStep("done");
  }

  return (
    <div className="space-y-4">
      {step !== "done" && (
        <div className="flex items-center gap-2 py-1">
          {(["email", "code", "password"] as Step[]).map((s, i) => {
            const active = step === s;
            const done = ["email", "code", "password"].indexOf(step) > i;
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
                {i < 2 && (
                  <div className={cn("h-px flex-1", done ? "bg-emerald-600" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {step === "email" && (
        <form onSubmit={requestCode} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fp-email" className="text-sm font-semibold">
              E-mail da conta
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Mail className="h-4 w-4" />
              </span>
              <Input
                id="fp-email"
                type="email"
                required
                autoFocus
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl pl-10"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Enviaremos um código de 6 dígitos válido por 10 minutos.
            </p>
          </div>
          <Button
            disabled={sending || !email}
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Enviar código
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full rounded-xl"
            onClick={onBackToLogin}
          >
            Voltar para o login
          </Button>
        </form>
      )}

      {step === "code" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se existir uma conta para <strong>{maskedEmail}</strong>, um código foi enviado.
          </p>
          <div className="flex justify-center py-1">
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
            <span>Não recebeu? Verifique o spam.</span>
            <button
              type="button"
              onClick={resendCode}
              disabled={cooldown > 0 || sending}
              className="text-primary underline-offset-2 hover:underline disabled:text-muted-foreground disabled:no-underline"
            >
              {sending
                ? "Enviando..."
                : cooldown > 0
                  ? `Reenviar em ${cooldown}s`
                  : "Reenviar código"}
            </button>
          </div>
          <Button
            onClick={verifyCode}
            disabled={loading || otp.length !== 6}
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Verificar código
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full rounded-xl"
            onClick={() => setStep("email")}
            disabled={loading}
          >
            Usar outro e-mail
          </Button>
        </div>
      )}

      {step === "password" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Nova senha</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                autoComplete="new-password"
                autoFocus
                className="h-12 rounded-xl pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute inset-y-0 right-3 grid place-items-center text-muted-foreground hover:text-foreground"
                aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex h-1.5 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded",
                    i < strength.score
                      ? ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"][
                          strength.score
                        ]
                      : "bg-muted",
                  )}
                />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Força: {strength.label}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Confirmar nova senha</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                type={showPwd ? "text" : "password"}
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                autoComplete="new-password"
                className="h-12 rounded-xl pl-10"
              />
            </div>
            {pwd2.length > 0 && !match && (
              <p className="text-[11px] text-destructive">As senhas não conferem.</p>
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

          <Button
            onClick={submitNewPassword}
            disabled={loading || !policyOk || !match}
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            Alterar senha
          </Button>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-emerald-600/40 bg-emerald-600/10 p-3 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
            <div>
              <p className="font-medium">Senha alterada com sucesso</p>
              <p className="text-muted-foreground">
                Todas as sessões foram encerradas. Entre novamente com sua nova senha.
              </p>
            </div>
          </div>
          <Button
            onClick={onBackToLogin}
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            Ir para o login
          </Button>
        </div>
      )}
    </div>
  );
}
