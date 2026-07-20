import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/configuracoes/aparencia")({
  component: AparenciaPage,
});

function AparenciaPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("id, logo_url, banner_url, cor_primaria, cor_secundaria").eq("id", 1).single()).data,
  });
  const [f, setF] = useState<any>(null);
  useEffect(() => { if (q.data) setF(q.data); }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("settings").update({
        logo_url: f.logo_url || null,
        banner_url: f.banner_url || null,
        cor_primaria: f.cor_primaria || null,
        cor_secundaria: f.cor_secundaria || null,
      } as any).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); toast.success("Aparência atualizada"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!f) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Aparência</h2>
          <p className="mt-1 text-sm text-muted-foreground">Personalize logo, banner e cores da marca. A identidade visual do sistema não é alterada.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Logo (URL da imagem)</Label>
            <Input value={f.logo_url ?? ""} onChange={(e) => setF({ ...f, logo_url: e.target.value })} placeholder="https://..." />
            {f.logo_url && <img src={f.logo_url} alt="Logo" className="mt-2 h-16 rounded border border-border object-contain" />}
          </div>
          <div>
            <Label>Banner (URL da imagem)</Label>
            <Input value={f.banner_url ?? ""} onChange={(e) => setF({ ...f, banner_url: e.target.value })} placeholder="https://..." />
            {f.banner_url && <img src={f.banner_url} alt="Banner" className="mt-2 h-16 w-full rounded border border-border object-cover" />}
          </div>
          <div>
            <Label>Cor primária</Label>
            <div className="flex gap-2">
              <Input type="color" value={f.cor_primaria || "#f97316"} onChange={(e) => setF({ ...f, cor_primaria: e.target.value })} className="h-10 w-16 p-1" />
              <Input value={f.cor_primaria ?? ""} onChange={(e) => setF({ ...f, cor_primaria: e.target.value })} placeholder="#f97316" />
            </div>
          </div>
          <div>
            <Label>Cor secundária</Label>
            <div className="flex gap-2">
              <Input type="color" value={f.cor_secundaria || "#0ea5e9"} onChange={(e) => setF({ ...f, cor_secundaria: e.target.value })} className="h-10 w-16 p-1" />
              <Input value={f.cor_secundaria ?? ""} onChange={(e) => setF({ ...f, cor_secundaria: e.target.value })} placeholder="#0ea5e9" />
            </div>
          </div>
        </div>
      </Card>
      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar aparência</Button>
      </div>
    </div>
  );
}
