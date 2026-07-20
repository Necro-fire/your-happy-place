import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { fmtDate } from "@/lib/format";
import { Search, ScrollText } from "lucide-react";

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
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-[#0f172a]">Logs & Auditoria</h1>
        <p className="mt-1 text-[14px] text-[#6b7280]">Registro imutável de todas as ações realizadas no Painel Master.</p>
      </div>

      <div className="ms-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por ação, entidade ou email..." className="ms-input" />
        </div>
      </div>

      <div className="ms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ms-table">
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
                <tr><td colSpan={5} className="!py-16 text-center text-[13px] text-[#9ca3af]">Nenhum log encontrado.</td></tr>
              )}
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap text-[13px] text-[#6b7280]">{fmtDate(l.created_at)}</td>
                  <td className="text-[13px] font-medium text-[#0f172a]">{l.actor_email ?? "—"}</td>
                  <td>
                    <span className="ms-badge bg-[#eff6ff] text-[#2563eb]">
                      <ScrollText className="h-3 w-3" /> {l.action}
                    </span>
                  </td>
                  <td className="text-[13px] text-[#4b5563]">
                    {l.entity ?? "—"}
                    {l.entity_id ? <span className="ml-1 font-mono text-[11px] text-[#9ca3af]">· {l.entity_id.slice(0, 8)}</span> : null}
                  </td>
                  <td><code className="font-mono text-[11px] text-[#6b7280]">{l.detalhes ? JSON.stringify(l.detalhes) : ""}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
