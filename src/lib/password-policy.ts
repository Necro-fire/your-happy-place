// Password policy shared entre validação e UI.
export const MIN_LEN = 10;

const COMMON = new Set([
  "12345678", "123456789", "1234567890", "password", "senha123", "qwerty123",
  "qwertyuiop", "abc12345", "111111111", "000000000", "12341234", "sabor123",
  "admin1234", "letmein123", "password1", "welcome123",
]);

function hasSequence(s: string) {
  const lower = s.toLowerCase();
  // 4+ chars sequenciais numéricos/alfabéticos
  for (let i = 0; i < lower.length - 3; i++) {
    const a = lower.charCodeAt(i);
    if (
      lower.charCodeAt(i + 1) === a + 1 &&
      lower.charCodeAt(i + 2) === a + 2 &&
      lower.charCodeAt(i + 3) === a + 3
    ) return true;
    if (
      lower.charCodeAt(i + 1) === a - 1 &&
      lower.charCodeAt(i + 2) === a - 2 &&
      lower.charCodeAt(i + 3) === a - 3
    ) return true;
  }
  return false;
}

export type Requirement = { id: string; label: string; ok: boolean };

export function evaluatePassword(pwd: string, ctx?: { email?: string; nome?: string }): Requirement[] {
  const trimmed = pwd;
  const lower = pwd.toLowerCase();
  const emailLocal = (ctx?.email ?? "").split("@")[0]?.toLowerCase() ?? "";
  const nome = (ctx?.nome ?? "").toLowerCase().trim();

  const containsIdentity =
    (emailLocal.length >= 3 && lower.includes(emailLocal)) ||
    (nome.length >= 3 && nome.split(/\s+/).some((p) => p.length >= 3 && lower.includes(p)));

  return [
    { id: "len", label: `Mínimo ${MIN_LEN} caracteres`, ok: trimmed.length >= MIN_LEN },
    { id: "upper", label: "Ao menos uma letra maiúscula", ok: /[A-Z]/.test(pwd) },
    { id: "lower", label: "Ao menos uma letra minúscula", ok: /[a-z]/.test(pwd) },
    { id: "num", label: "Ao menos um número", ok: /[0-9]/.test(pwd) },
    { id: "sym", label: "Ao menos um caractere especial (!@#$…)", ok: /[^A-Za-z0-9]/.test(pwd) },
    { id: "space", label: "Sem espaços no início ou fim", ok: pwd.length === 0 || pwd === pwd.trim() },
    { id: "common", label: "Não estar em lista de senhas comuns", ok: pwd.length === 0 || !COMMON.has(lower) },
    { id: "seq", label: "Sem sequências óbvias (abcd, 1234)", ok: pwd.length === 0 || !hasSequence(pwd) },
    { id: "identity", label: "Não conter seu nome ou e-mail", ok: pwd.length === 0 || !containsIdentity },
  ];
}

export function passwordStrength(pwd: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pwd) return { score: 0, label: "—" };
  let score = 0;
  if (pwd.length >= MIN_LEN) score++;
  if (pwd.length >= 14) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ["Muito fraca", "Fraca", "Razoável", "Forte", "Muito forte"] as const;
  const s = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  return { score: s, label: labels[s] };
}

export function allRequirementsMet(pwd: string, ctx?: { email?: string; nome?: string }) {
  return evaluatePassword(pwd, ctx).every((r) => r.ok);
}
