import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { maskPhone, maskCEP, maskCPFOrCNPJ } from "@/lib/masks";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/empresa")({
  component: EmpresaPage,
});

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function EmpresaPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data,
  });
  const [f, setF] = useState<any>(null);
  useEffect(() => { if (q.data) setF({ ...q.data, dias_funcionamento: q.data.dias_funcionamento ?? [] }); }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("settings").update({
        nome_estabelecimento: f.nome_estabelecimento,
        nome_fantasia: f.nome_fantasia,
        descricao: f.descricao,
        cnpj: f.cnpj,
        inscricao_estadual: f.inscricao_estadual,
        email: f.email,
        telefone: f.telefone,
        whatsapp: f.whatsapp,
        endereco: f.endereco,
        cep: f.cep,
        cidade: f.cidade,
        estado: f.estado,
        horario_funcionamento: f.horario_funcionamento,
        dias_funcionamento: f.dias_funcionamento,
      } as any).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); toast.success("Dados da empresa salvos"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!f) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  const toggleDia = (d: string) => {
    const has = f.dias_funcionamento.includes(d);
    setF({ ...f, dias_funcionamento: has ? f.dias_funcionamento.filter((x: string) => x !== d) : [...f.dias_funcionamento, d] });
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Identificação</h2>
          <p className="text-xs text-muted-foreground">Informações que aparecem em comandas, notas e no cardápio digital.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Razão social / Nome do estabelecimento</Label><Input value={f.nome_estabelecimento ?? ""} onChange={(e) => setF({ ...f, nome_estabelecimento: e.target.value })} /></div>
          <div><Label>Nome fantasia</Label><Input value={f.nome_fantasia ?? ""} onChange={(e) => setF({ ...f, nome_fantasia: e.target.value })} /></div>
          <div><Label>CNPJ</Label><Input value={f.cnpj ?? ""} onChange={(e) => setF({ ...f, cnpj: maskCPFOrCNPJ(e.target.value) })} placeholder="00.000.000/0000-00" /></div>
          <div><Label>Inscrição estadual</Label><Input value={f.inscricao_estadual ?? ""} onChange={(e) => setF({ ...f, inscricao_estadual: e.target.value })} /></div>
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
        <div><h2 className="font-display text-lg font-semibold">Endereço</h2></div>
        <div className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-4"><Label>Endereço</Label><Input value={f.endereco ?? ""} onChange={(e) => setF({ ...f, endereco: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>CEP</Label><Input value={f.cep ?? ""} onChange={(e) => setF({ ...f, cep: maskCEP(e.target.value) })} inputMode="numeric" maxLength={9} placeholder="00000-000" /></div>
          <div className="sm:col-span-4"><Label>Cidade</Label><Input value={f.cidade ?? ""} onChange={(e) => setF({ ...f, cidade: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Estado (UF)</Label><Input value={f.estado ?? ""} onChange={(e) => setF({ ...f, estado: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} /></div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div><h2 className="font-display text-lg font-semibold">Funcionamento</h2></div>
        <div><Label>Horário</Label><Input value={f.horario_funcionamento ?? ""} onChange={(e) => setF({ ...f, horario_funcionamento: e.target.value })} placeholder="08:00 às 22:00" /></div>
        <div>
          <Label>Dias de funcionamento</Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {DIAS.map((d) => (
              <label key={d} className="flex items-center gap-1.5 text-sm">
                <Checkbox checked={f.dias_funcionamento.includes(d)} onCheckedChange={() => toggleDia(d)} />
                {d}
              </label>
            ))}
          </div>
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
