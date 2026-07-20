import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { fmtDate } from "@/lib/format";
import { Search } from "lucide-react";

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

  const filtered = logs.filter((l) => !q || (l.action + " " + (l.entity ?? "") + " " + (l.actor_email ?? "")).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-50">Logs & Auditoria</h1>
        <p className="text-sm text-slate-400">Registro imutável de todas as ações realizadas no Painel Master.</p>
      </div>

      <Card className="border-slate-800 bg-slate-900 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por ação, entidade ou email..." className="border-slate-700 bg-slate-950 pl-8 text-slate-100 placeholder:text-slate-500" />
        </div>
      </Card>

      <Card className="border-slate-800 bg-slate-900 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Autor</th>
                <th className="px-3 py-2 text-left">Ação</th>
                <th className="px-3 py-2 text-left">Entidade</th>
                <th className="px-3 py-2 text-left">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Nenhum log encontrado.</td></tr>
              )}
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40">
                  <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{fmtDate(l.created_at)}</td>
                  <td className="px-3 py-2 text-slate-200">{l.actor_email ?? "—"}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="border-indigo-500/40 text-indigo-300">{l.action}</Badge></td>
                  <td className="px-3 py-2 text-slate-300">{l.entity ?? "—"}{l.entity_id ? <span className="text-slate-500"> · {l.entity_id.slice(0, 8)}</span> : null}</td>
                  <td className="px-3 py-2"><code className="text-xs text-slate-400">{l.detalhes ? JSON.stringify(l.detalhes) : ""}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
