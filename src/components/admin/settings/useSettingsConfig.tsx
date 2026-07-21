import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { getMySettingsRow, updateMySettings, friendlyStorageError } from "@/lib/settings-io";

export function useSettingsConfig<T extends Record<string, any>>(section: string, defaults: T) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: getMySettingsRow,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
  const [state, setState] = useState<T | null>(null);

  useEffect(() => {
    // Inicializa o formulário assim que a query resolve — mesmo sem linha no banco,
    // evitando o loader infinito quando `data` volta como null.
    if (q.isSuccess) {
      const cfg = (q.data?.config as any) ?? {};
      setState({ ...defaults, ...(cfg[section] ?? {}) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.isSuccess, q.data]);

  const save = useMutation({
    mutationFn: async (patch: Partial<T>) => {
      const current = ((q.data?.config as any) ?? {}) as Record<string, any>;
      const merged = { ...current, [section]: { ...(current[section] ?? {}), ...state, ...patch } };
      await updateMySettings({ config: merged });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); toast.success("Configurações salvas"); },
    onError: (e: any) => toast.error(friendlyStorageError(e)),
  });

  return {
    state,
    setState,
    save,
    loading: q.isLoading,
    error: q.error as Error | null,
    refetch: q.refetch,
  };
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
