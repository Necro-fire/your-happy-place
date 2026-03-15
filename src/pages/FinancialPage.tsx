import { useState, useMemo } from 'react';
import { useOrders } from '@/contexts/OrdersContext';
import { useCompanySettings } from '@/contexts/CompanySettingsContext';
import { DollarSign, TrendingUp, CheckCircle, BarChart3 } from 'lucide-react';
import { DateRangeFilter, getDefaultDateRange, type DateRange } from '@/components/DateRangeFilter';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion } from 'framer-motion';
import { parseISO, isWithinInterval, format, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const anim = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.3, ease: [0.2, 0, 0, 1] as [number, number, number, number] },
});

const tooltipStyle = {
  contentStyle: { background: 'hsl(240,10%,9%)', border: 'none', borderRadius: 8, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)', fontSize: 12, color: '#e0e0e0' },
};

export default function FinancialPage() {
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
  const ticketMedio = finalizados.length > 0 ? receitaTotal / finalizados.length : 0;

  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    return months.map(m => {
      const label = format(m, 'MMM', { locale: ptBR });
      const mOrders = finalizados.filter(o => {
        const d = parseISO(o.data_entrada);
        return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
      });
      return {
        month: label.charAt(0).toUpperCase() + label.slice(1),
        valor: mOrders.reduce((s, o) => s + Number(o.valor), 0),
        ordens: mOrders.length,
      };
    });
  }, [finalizados, dateRange]);

  const stats = [
    { label: 'Receita Total', value: `R$ ${receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-primary' },
    { label: 'Lucro Líquido', value: `R$ ${lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: lucro >= 0 ? 'text-status-completed' : 'text-destructive' },
    { label: 'Serviços Concluídos', value: finalizados.length, icon: CheckCircle, color: 'text-status-completed' },
    { label: 'Ticket Médio', value: `R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: BarChart3, color: 'text-primary' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight uppercase">Financeiro</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Dados calculados a partir das ordens finalizadas.</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} className="card-accent rounded-lg p-4" {...anim(i)}>
            <div className="flex items-center gap-2 mb-3">
              <stat.icon className={`w-4 h-4 ${stat.color}`} strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Cost breakdown */}
      <motion.div className="card-accent-subtle rounded-lg p-5" {...anim(4)}>
        <h3 className="section-title mb-3">Detalhamento de Custos</h3>
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Custos Variáveis ({settings.margem_custo_percentual}% da receita)</p>
            <p className="text-lg font-bold tabular-nums text-status-pending">R$ {(receitaTotal * margemPct).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Custo Fixo Mensal</p>
            <p className="text-lg font-bold tabular-nums text-status-pending">R$ {settings.custo_fixo_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total de Custos</p>
            <p className="text-lg font-bold tabular-nums text-status-pending">R$ {custosOp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div className="card-accent-subtle rounded-lg p-5" {...anim(5)}>
          <h3 className="section-title mb-4">Receita por Mês</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(240,5%,55%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(240,5%,55%)' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Receita']} />
              <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#finGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="card-accent-subtle rounded-lg p-5" {...anim(6)}>
          <h3 className="section-title mb-4">Ordens Finalizadas por Mês</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(240,5%,55%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(240,5%,55%)' }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="ordens" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
