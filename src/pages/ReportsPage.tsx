import { useState, useMemo } from 'react';
import { useOrders } from '@/contexts/OrdersContext';
import { useCompanySettings } from '@/contexts/CompanySettingsContext';
import { DateRangeFilter, getDefaultDateRange, type DateRange } from '@/components/DateRangeFilter';
import { type OrderStatus, statusLabels } from '@/lib/mock-data';
import { StatusBadge } from '@/components/StatusBadge';
import { BarChart3, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { parseISO, isWithinInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { orders } = useOrders();
  const { settings } = useCompanySettings();
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);

  const filtered = useMemo(() => orders.filter(o => {
    const d = parseISO(o.data_entrada);
    return isWithinInterval(d, { start: dateRange.from, end: dateRange.to });
  }), [orders, dateRange]);

  const finalizados = filtered.filter(o => o.status === 'finalizado');
  const receitaTotal = finalizados.reduce((s, o) => s + Number(o.valor), 0);
  const margemPct = settings.margem_custo_percentual / 100;
  const custosOp = receitaTotal * margemPct + settings.custo_fixo_mensal;
  const lucro = receitaTotal - custosOp;

  const byStatus = (status: OrderStatus) => filtered.filter(o => o.status === status).length;
  const periodLabel = `${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}`;

  const exportOrdersCSV = () => {
    const header = ['Código', 'Cliente', 'Telefone', 'Aparelho', 'Marca', 'Modelo', 'Status', 'Valor', 'Data Entrada', 'Técnico'];
    const rows = filtered.map(o => [
      o.codigo, o.cliente, o.telefone, o.aparelho, o.marca, o.modelo,
      statusLabels[o.status as OrderStatus] || o.status,
      Number(o.valor).toFixed(2), new Date(o.data_entrada).toLocaleDateString('pt-BR'), o.tecnico,
    ]);
    exportCSV([header, ...rows], `relatorio-ordens-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const exportFinancialCSV = () => {
    const header = ['Métrica', 'Valor'];
    const rows = [
      ['Período', periodLabel],
      ['Total de Ordens', String(filtered.length)],
      ['Ordens Finalizadas', String(finalizados.length)],
      ['Receita Total', `R$ ${receitaTotal.toFixed(2)}`],
      ['Custos Operacionais', `R$ ${custosOp.toFixed(2)}`],
      ['Lucro Líquido', `R$ ${lucro.toFixed(2)}`],
      ['Margem de Custo', `${settings.margem_custo_percentual}%`],
      ['Custo Fixo Mensal', `R$ ${settings.custo_fixo_mensal.toFixed(2)}`],
    ];
    exportCSV([header, ...rows], `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight uppercase">Relatórios</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Relatórios baseados nos dados reais do sistema.</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Ordens', value: filtered.length },
          { label: 'Pendentes', value: byStatus('pendente') },
          { label: 'Em Manutenção', value: byStatus('em_manutencao') },
          { label: 'Finalizadas', value: byStatus('finalizado') },
        ].map((s, i) => (
          <motion.div key={s.label} className="card-accent rounded-lg p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-2xl font-bold tabular-nums">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Financial Summary */}
      <motion.div className="card-accent-subtle rounded-lg p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Resumo Financeiro — {periodLabel}</h3>
          <Button size="sm" variant="outline" onClick={exportFinancialCSV} className="border-0 bg-surface-1 text-xs" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
            <Download className="w-3.5 h-3.5 mr-1.5" />Exportar CSV
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Receita Total</p>
            <p className="text-xl font-bold tabular-nums">R$ {receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Custos Operacionais</p>
            <p className="text-xl font-bold tabular-nums text-status-pending">R$ {custosOp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lucro Líquido</p>
            <p className={`text-xl font-bold tabular-nums ${lucro >= 0 ? 'text-status-completed' : 'text-destructive'}`}>R$ {lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </motion.div>

      {/* Orders Table Report */}
      <motion.div className="card-accent-subtle rounded-lg" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <div className="p-4 flex items-center justify-between">
          <h3 className="section-title">Relatório de Ordens — {periodLabel}</h3>
          <Button size="sm" variant="outline" onClick={exportOrdersCSV} className="border-0 bg-surface-1 text-xs" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
            <Download className="w-3.5 h-3.5 mr-1.5" />Exportar CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-primary/10">
                <th className="text-left font-medium px-4 py-2.5">Código</th>
                <th className="text-left font-medium px-4 py-2.5">Cliente</th>
                <th className="text-left font-medium px-4 py-2.5 hidden md:table-cell">Aparelho</th>
                <th className="text-left font-medium px-4 py-2.5">Status</th>
                <th className="text-left font-medium px-4 py-2.5 hidden lg:table-cell">Data</th>
                <th className="text-right font-medium px-4 py-2.5">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-b border-primary/5 last:border-0">
                  <td className="px-4 py-2.5 tabular-nums font-medium text-primary">{o.codigo}</td>
                  <td className="px-4 py-2.5">{o.cliente}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{o.marca} {o.modelo}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={o.status as OrderStatus} /></td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground hidden lg:table-cell">{new Date(o.data_entrada).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">R$ {Number(o.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma ordem no período.</div>}
      </motion.div>
    </div>
  );
}
