// Máscaras de entrada padrão brasileiro (pt-BR)
// Todas as funções retornam a string formatada; use `unmask` para persistir.

export const onlyDigits = (v: string) => (v ?? "").replace(/\D+/g, "");

export function maskCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskCNPJ(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function maskCPFOrCNPJ(v: string) {
  const d = onlyDigits(v);
  return d.length > 11 ? maskCNPJ(v) : maskCPF(v);
}

export function maskCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
}

export function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export function maskDate(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2");
}

export function maskTime(v: string) {
  const d = onlyDigits(v).slice(0, 4);
  return d.replace(/(\d{2})(\d)/, "$1:$2");
}

// Moeda BRL — recebe qualquer input do usuário, retorna { masked, value }
export function maskCurrencyBRL(v: string): { masked: string; value: number } {
  const d = onlyDigits(v);
  if (!d) return { masked: "", value: 0 };
  const value = Number(d) / 100;
  return {
    masked: value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    }),
    value,
  };
}

// Porcentagem 0..100
export function maskPercent(v: string) {
  const d = onlyDigits(v).slice(0, 5);
  if (!d) return "";
  const n = Number(d) / 10;
  return `${n.toLocaleString("pt-BR")}%`;
}

export const unmask = onlyDigits;

// Handlers prontos p/ inputs controlados
export const onChangePhone =
  (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setter(maskPhone(e.target.value));
export const onChangeCEP =
  (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setter(maskCEP(e.target.value));
export const onChangeCPFCNPJ =
  (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setter(maskCPFOrCNPJ(e.target.value));
