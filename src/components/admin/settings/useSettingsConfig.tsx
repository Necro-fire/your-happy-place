import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export function useSettingsConfig<T extends Record<string, any>>(section: string, defaults: T) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("id, config").eq("id", 1).single()).data,
  });
  const [state, setState] = useState<T | null>(null);

  useEffect(() => {
    if (q.data) {
      const cfg = (q.data.config as any) ?? {};
      setState({ ...defaults, ...(cfg[section] ?? {}) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  const save = useMutation({
    mutationFn: async (patch: Partial<T>) => {
      const current = ((q.data?.config as any) ?? {}) as Record<string, any>;
      const merged = { ...current, [section]: { ...(current[section] ?? {}), ...state, ...patch } };
      const { error } = await supabase.from("settings").update({ config: merged } as any).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); toast.success("Configurações salvas"); },
    onError: (e: any) => toast.error(e.message),
  });

  return { state, setState, save, loading: !state };
}

export function SectionShell({ title, desc, children, onSave, saving }: {
  title: string; desc?: string; children: ReactNode; onSave?: () => void; saving?: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
        <div className="mt-4 space-y-4">{children}</div>
      </Card>
      {onSave && (
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
        </div>
      )}
    </div>
  );
}
