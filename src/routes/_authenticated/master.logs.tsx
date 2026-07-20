import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { fmtDate } from "@/lib/format";
import { Search, ScrollText, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/master/logs")({
  component: LogsMaster,
});

type Log = { id: string; actor_email: string | null; action: string; entity: string | null; entity_id: string | null; detalhes: Record<string, unknown> | null; created_at: string };

function LogsMaster() {
  const [q, setQ] = useState("");
  const { data: logs = [] } = useQuery({
    queryKey: ["master-logs"],
    queryFn: async () => (await supabase.from("master_logs").select("*").order("created_at", { ascending: false }).limit(500)).data as Log[] ?? [],
    refetchInterval: 15000,
  });

  const filtered = useMemo(() =>
    logs.filter((l) => !q || (l.action + " " + (l.entity ?? "") + " " + (l.actor_email ?? "")).toLowerCase().includes(q.toLowerCase())),
    [logs, q],
  );

  return (
    <div className="space-y-6">
      <div className="relative pt-2">
        <Sparkles className="doodle-scribble -top-2 left-52 h-6 w-6 text-yellow-400 doodle-wiggle" />
        <h1 className="text-3xl font-bold">Logs & Auditoria 📜</h1>
        <p className="mt-1 text-slate-500 underline decoration-orange-300 decoration-wavy underline-offset-4">
          Registro imutável de todas as ações realizadas no Painel Master.
        </p>
      </div>

      <div className="doodle-card rounded-[22px_16px_26px_14px] p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por ação, entidade ou email..." className="doodle-input w-full pl-10" />
        </div>
      </div>

      <div className="doodle-card doodle-card--lg overflow-hidden rounded-[24px_36px_16px_28px] p-6">
        <div className="overflow-x-auto">
          <table className="doodle-table w-full text-sm">
            <thead>
              <tr>
                <th>Data</th>
                <th>Autor</th>
                <th>Ação</th>
                <th>Entidade</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400">Nenhum log encontrado.</td></tr>
              )}
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap text-slate-500">{fmtDate(l.created_at)}</td>
                  <td className="font-bold">{l.actor_email ?? "—"}</td>
                  <td>
                    <span className="doodle-badge border-orange-500 bg-orange-100 text-orange-700">
                      <ScrollText className="h-3 w-3" /> {l.action}
                    </span>
                  </td>
                  <td className="text-slate-600">
                    {l.entity ?? "—"}
                    {l.entity_id ? <span className="ml-1 font-mono text-[10px] text-slate-400">· {l.entity_id.slice(0, 8)}</span> : null}
                  </td>
                  <td><code className="text-[11px] text-slate-400">{l.detalhes ? JSON.stringify(l.detalhes) : ""}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
