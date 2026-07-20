import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { maskPhone, maskCEP, maskCPFOrCNPJ } from "@/lib/masks";
import { Loader2, Search, Upload, Trash2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/empresa")({
  component: EmpresaPage,
});

type DiaKey = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";
type Horario = { open: boolean; abertura: string; fechamento: string };
type Horarios = Record<DiaKey, Horario>;

const DIAS: { key: DiaKey; label: string }[] = [
  { key: "seg", label: "Segunda-feira" },
  { key: "ter", label: "Terça-feira" },
  { key: "qua", label: "Quarta-feira" },
  { key: "qui", label: "Quinta-feira" },
  { key: "sex", label: "Sexta-feira" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

const DEFAULT_HORARIOS: Horarios = DIAS.reduce((acc, d) => {
  acc[d.key] = { open: d.key !== "dom", abertura: "08:00", fechamento: "18:00" };
  return acc;
}, {} as Horarios);

function EmpresaPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data,
  });

  const [f, setF] = useState<any>(null);
  const [horarios, setHorarios] = useState<Horarios>(DEFAULT_HORARIOS);
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (q.data) {
      const cfg = (q.data as any).config ?? {};
      const empresa = cfg.empresa ?? {};
      setF(q.data);
      setHorarios({ ...DEFAULT_HORARIOS, ...(empresa.horarios ?? {}) });
      setNumero(empresa.numero ?? "");
      setComplemento(empresa.complemento ?? "");
      setBairro(empresa.bairro ?? "");
    }
  }, [q.data]);

  async function lookupCep(rawCep: string) {
    const cep = rawCep.replace(/\D/g, "");
    if (cep.length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos");
      return;
    }
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }
      setF((prev: any) => ({
        ...prev,
        endereco: data.logradouro ?? prev.endereco ?? "",
        cidade: data.localidade ?? prev.cidade ?? "",
        estado: (data.uf ?? prev.estado ?? "").toUpperCase().slice(0, 2),
      }));
      setBairro(data.bairro ?? "");
      toast.success("Endereço preenchido automaticamente");
    } catch {
      toast.error("Falha ao consultar o CEP");
    } finally {
      setCepLoading(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const currentCfg = ((q.data as any)?.config ?? {}) as Record<string, any>;
      const nextCfg = {
        ...currentCfg,
        empresa: { ...(currentCfg.empresa ?? {}), horarios, numero, complemento, bairro },
      };
      const diasAtivos = DIAS.filter((d) => horarios[d.key]?.open).map((d) => d.label.slice(0, 3));
      const { error } = await supabase.from("settings").update({
        nome_estabelecimento: f.nome_estabelecimento,
        nome_fantasia: f.nome_fantasia,
        descricao: f.descricao,
        cnpj: f.cnpj,
        email: f.email,
        telefone: f.telefone,
        whatsapp: f.whatsapp,
        endereco: f.endereco,
        cep: f.cep,
        cidade: f.cidade,
        estado: f.estado,
        dias_funcionamento: diasAtivos,
        config: nextCfg,
      } as any).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
      toast.success("Dados da empresa salvos");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  async function handleLogoUpload(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande (máx 2MB)"); return; }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("settings").update({ logo_url: pub.publicUrl } as any).eq("id", 1);
      if (dbErr) throw dbErr;
      setF((prev: any) => ({ ...prev, logo_url: pub.publicUrl }));
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
      toast.success("Logo atualizada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar logo");
    } finally {
      setUploadingLogo(false);
    }
  }
  async function handleLogoRemove() {
    try {
      const { error } = await supabase.from("settings").update({ logo_url: null } as any).eq("id", 1);
      if (error) throw error;
      setF((prev: any) => ({ ...prev, logo_url: null }));
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
      toast.success("Logo removida");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!f) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">



      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Logo do estabelecimento</h2>
          <p className="text-xs text-muted-foreground">Aparece no cabeçalho do cardápio público e nas telas de pedido do cliente.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-lg border border-border bg-muted">
            {f.logo_url ? (
              <img src={f.logo_url} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] text-muted-foreground">Sem logo</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
              {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {f.logo_url ? "Substituir logo" : "Enviar logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingLogo}
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleLogoUpload(file); e.currentTarget.value = ""; }}
              />
            </label>
            {f.logo_url && (
              <Button type="button" variant="ghost" size="sm" onClick={handleLogoRemove}>
                <Trash2 className="mr-1 h-4 w-4" /> Remover
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Identificação</h2>
          <p className="text-xs text-muted-foreground">Informações que aparecem em comandas, notas e no cardápio digital.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Razão social / Nome do estabelecimento</Label><Input value={f.nome_estabelecimento ?? ""} onChange={(e) => setF({ ...f, nome_estabelecimento: e.target.value })} /></div>
          <div><Label>Nome fantasia</Label><Input value={f.nome_fantasia ?? ""} onChange={(e) => setF({ ...f, nome_fantasia: e.target.value })} /></div>
          <div><Label>CNPJ</Label><Input value={f.cnpj ?? ""} onChange={(e) => setF({ ...f, cnpj: maskCPFOrCNPJ(e.target.value) })} placeholder="00.000.000/0000-00" /></div>
          <div className="sm:col-span-2"><Label>Descrição</Label><Textarea rows={2} value={f.descricao ?? ""} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div><h2 className="font-display text-lg font-semibold">Contato</h2></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Telefone</Label><Input value={f.telefone ?? ""} onChange={(e) => setF({ ...f, telefone: maskPhone(e.target.value) })} inputMode="tel" maxLength={15} /></div>
          <div><Label>WhatsApp comercial</Label><Input value={f.whatsapp ?? ""} onChange={(e) => setF({ ...f, whatsapp: maskPhone(e.target.value) })} inputMode="tel" maxLength={15} /></div>
          <div className="sm:col-span-2"><Label>E-mail</Label><Input type="email" value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Endereço</h2>
          <p className="text-xs text-muted-foreground">Informe o CEP para preencher rua, bairro, cidade e estado automaticamente.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <Label>CEP</Label>
            <div className="flex gap-2">
              <Input
                value={f.cep ?? ""}
                onChange={(e) => setF({ ...f, cep: maskCEP(e.target.value) })}
                onBlur={(e) => { const c = e.target.value.replace(/\D/g, ""); if (c.length === 8) lookupCep(e.target.value); }}
                inputMode="numeric"
                maxLength={9}
                placeholder="00000-000"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => lookupCep(f.cep ?? "")} disabled={cepLoading} aria-label="Buscar CEP">
                {cepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="sm:col-span-4"><Label>Rua / Logradouro</Label><Input value={f.endereco ?? ""} onChange={(e) => setF({ ...f, endereco: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Número <span className="text-muted-foreground">(opcional)</span></Label><Input value={numero} onChange={(e) => setNumero(e.target.value)} inputMode="numeric" placeholder="s/n" /></div>
          <div className="sm:col-span-4"><Label>Complemento <span className="text-muted-foreground">(opcional)</span></Label><Input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Sala, andar, referência..." /></div>
          <div className="sm:col-span-3"><Label>Bairro</Label><Input value={bairro} onChange={(e) => setBairro(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Cidade</Label><Input value={f.cidade ?? ""} onChange={(e) => setF({ ...f, cidade: e.target.value })} /></div>
          <div className="sm:col-span-1"><Label>UF</Label><Input value={f.estado ?? ""} onChange={(e) => setF({ ...f, estado: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} /></div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Funcionamento</h2>
          <p className="text-xs text-muted-foreground">Configure o horário individual de cada dia da semana.</p>
        </div>
        <div className="space-y-2">
          {DIAS.map(({ key, label }) => {
            const h = horarios[key];
            return (
              <div
                key={key}
                className={cn(
                  "flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between",
                  h.open ? "border-primary/40 bg-primary/[0.03]" : "border-border",
                )}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={h.open}
                    onCheckedChange={(v) => setHorarios({ ...horarios, [key]: { ...h, open: v } })}
                  />
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{h.open ? "Aberto" : "Fechado"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs text-muted-foreground">Abre</Label>
                    <Input
                      type="time"
                      value={h.abertura}
                      disabled={!h.open}
                      onChange={(e) => setHorarios({ ...horarios, [key]: { ...h, abertura: e.target.value } })}
                      className="w-28"
                    />
                  </div>
                  <span className="text-muted-foreground">–</span>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs text-muted-foreground">Fecha</Label>
                    <Input
                      type="time"
                      value={h.fechamento}
                      disabled={!h.open}
                      onChange={(e) => setHorarios({ ...horarios, [key]: { ...h, fechamento: e.target.value } })}
                      className="w-28"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
