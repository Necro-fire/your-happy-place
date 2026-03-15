import { useState, useMemo, useCallback } from 'react';
import { ClipboardList, Clock, CheckCircle, DollarSign, TrendingUp, Filter } from 'lucide-react';
import { useOrders } from '@/contexts/OrdersContext';
import { useCompanySettings } from '@/contexts/CompanySettingsContext';
import { StatusBadge } from '@/components/StatusBadge';
import { DateRangeFilter, getDefaultDateRange, type DateRange } from '@/components/DateRangeFilter';
import { type OrderStatus } from '@/lib/mock-data';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isWithinInterval, eachMonthOfInterval, eachDayOfInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const anim = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.3, ease: [0.2, 0, 0, 1] as [number, number, number, number] },
});

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(240,10%,9%)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    fontSize: 12,
    color: '#e0e0e0',
    padding: '10px 14px',
  },
  cursor: { stroke: 'hsl(217,91%,60%)', strokeWidth: 1, strokeDasharray: '4 4' },
};

function formatYAxis(value: number): string {
  if (value === 0) return '0';
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return value.toFixed(0);
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function getNiceTicks(maxValue: number): number[] {
  if (maxValue <= 0) return [0];
  const rawStep = maxValue / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceSteps = [1, 2, 2.5, 5, 10];
  const step = niceSteps.find(s => s * magnitude >= rawStep)! * magnitude;
  const ticks: number[] = [];
  for (let i = 0; i <= Math.ceil(maxValue / step); i++) {
    ticks.push(i * step);
  }
  return ticks;
}

// Custom tooltip for revenue chart
function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle.contentStyle}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold" style={{ color: 'hsl(217,91%,60%)' }}>
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

// Custom tooltip for orders chart
function OrdersTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle.contentStyle}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold" style={{ color: 'hsl(142,71%,45%)' }}>
        {payload[0].value} {payload[0].value === 1 ? 'ordem' : 'ordens'}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { orders } = useOrders();
  const { settings } = useCompanySettings();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);

  const filtered = useMemo(() => orders.filter(o => {
    const d = parseISO(o.data_entrada);
    return isWithinInterval(d, { start: dateRange.from, end: dateRange.to });
  }), [orders, dateRange]);

  const pendentes = filtered.filter(o => o.status === 'pendente').length;
  const manutencao = filtered.filter(o => o.status === 'em_manutencao').length;
  const finalizados = filtered.filter(o => o.status === 'finalizado');
  const receitaTotal = finalizados.reduce((s, o) => s + Number(o.valor), 0);
  const margemPct = settings.margem_custo_percentual / 100;
  const custosOp = receitaTotal * margemPct + settings.custo_fixo_mensal;
  const lucro = receitaTotal - custosOp;

  const daysDiff = differenceInDays(dateRange.to, dateRange.from);
  const useDaily = daysDiff <= 31;

  // Revenue data (finalized orders)
  const revenueData = useMemo(() => {
    if (useDaily) {
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      return days.map(d => {
        const dayOrders = finalizados.filter(o => {
          const od = parseISO(o.data_entrada);
          return od.getDate() === d.getDate() && od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
        });
        return {
          label: format(d, 'dd/MM', { locale: ptBR }),
          valor: dayOrders.reduce((s, o) => s + Number(o.valor), 0),
        };
      });
    }
    const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    return months.map(m => {
      const monthOrders = finalizados.filter(o => {
        const d = parseISO(o.data_entrada);
        return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
      });
      const label = format(m, 'MMM/yy', { locale: ptBR });
      return { label: label.charAt(0).toUpperCase() + label.slice(1), valor: monthOrders.reduce((s, o) => s + Number(o.valor), 0) };
    });
  }, [finalizados, dateRange, useDaily]);

  // Finalized orders count data
  const ordersCountData = useMemo(() => {
    if (useDaily) {
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      return days.map(d => {
        const count = finalizados.filter(o => {
          const od = parseISO(o.data_entrada);
          return od.getDate() === d.getDate() && od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
        }).length;
        return { label: format(d, 'dd/MM', { locale: ptBR }), count };
      });
    }
    const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    return months.map(m => {
      const count = finalizados.filter(o => {
        const d = parseISO(o.data_entrada);
        return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
      }).length;
      const label = format(m, 'MMM/yy', { locale: ptBR });
      return { label: label.charAt(0).toUpperCase() + label.slice(1), count };
    });
  }, [finalizados, dateRange, useDaily]);

  const maxRevenue = Math.max(...revenueData.map(d => d.valor), 0);
  const revenueTicks = getNiceTicks(maxRevenue);
  const maxOrders = Math.max(...ordersCountData.map(d => d.count), 0);
  const ordersTicks = getNiceTicks(maxOrders || 1);

  const statusPieData = [
    { name: 'Pendente', value: pendentes, color: 'hsl(45, 93%, 47%)' },
    { name: 'Em Manutenção', value: manutencao, color: 'hsl(217, 91%, 60%)' },
    { name: 'Finalizado', value: finalizados.length, color: 'hsl(142, 71%, 45%)' },
  ].filter(d => d.value > 0);

  const recentOrders = filtered.slice(0, 5);
  const companyName = settings.nome_empresa || 'Assistência Técnica';

  // Determine tick interval for X axis to avoid crowding
  const xTickInterval = useDaily && daysDiff > 14 ? Math.floor(daysDiff / 7) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight uppercase">{companyName} — Controle</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Visão geral do sistema</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Row 1: Financial Summary + Operational Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div className="lg:col-span-2 card-accent rounded-lg p-4 sm:p-5" {...anim(0)}>
          <h3 className="section-title mb-4">Resumo Financeiro</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Faturamento Total:</p>
              <p className="text-xl sm:text-2xl font-bold tabular-nums">{formatCurrency(receitaTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Custos Operacionais:</p>
              <p className="text-xl sm:text-2xl font-bold tabular-nums text-status-pending">{formatCurrency(custosOp)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Margem: {settings.margem_custo_percentual}% + R$ {settings.custo_fixo_mensal.toLocaleString('pt-BR')}/mês</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Lucro Líquido:</p>
              <p className={`text-xl sm:text-2xl font-bold tabular-nums ${lucro >= 0 ? 'text-status-completed' : 'text-destructive'}`}>{formatCurrency(lucro)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div className="card-accent rounded-lg p-4 sm:p-5" {...anim(1)}>
          <h3 className="section-title mb-4">Estatísticas Operacionais</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <div><p className="text-xs text-muted-foreground">O.S. Criadas:</p><p className="text-xl font-bold tabular-nums">{filtered.length}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-pending" />
              <div><p className="text-xs text-muted-foreground">Pendentes:</p><p className="text-xl font-bold tabular-nums">{pendentes}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-completed" />
              <div><p className="text-xs text-muted-foreground">Concluídas:</p><p className="text-xl font-bold tabular-nums">{finalizados.length}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <div><p className="text-xs text-muted-foreground">Em Manutenção:</p><p className="text-xl font-bold tabular-nums">{manutencao}</p></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Row 2: Revenue Chart + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <motion.div className="lg:col-span-8 card-accent-subtle rounded-lg p-4 sm:p-5" {...anim(2)}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Receita {useDaily ? 'por Dia' : 'por Mês'} (Serviços Finalizados)</h3>
          </div>
          {revenueData.some(d => d.valor > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(217,91%,60%)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'hsl(240,5%,50%)' }}
                  axisLine={false}
                  tickLine={false}
                  interval={xTickInterval}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(240,5%,50%)' }}
                  axisLine={false}
                  tickLine={false}
                  ticks={revenueTicks}
                  tickFormatter={formatYAxis}
                  domain={[0, revenueTicks[revenueTicks.length - 1] || 'auto']}
                  width={45}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="hsl(217,91%,60%)"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={{ r: revenueData.length <= 15 ? 3 : 0, fill: 'hsl(217,91%,60%)', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: 'hsl(217,91%,60%)', stroke: 'hsl(217,91%,80%)', strokeWidth: 2 }}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">Sem receita no período selecionado.</div>
          )}
        </motion.div>

        <motion.div className="lg:col-span-4 card-accent-subtle rounded-lg p-4 sm:p-5" {...anim(3)}>
          <h3 className="section-title mb-2">Status das O.S.</h3>
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="42%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  animationDuration={600}
                  animationEasing="ease-out"
                >
                  {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: 'hsl(240,5%,65%)' }} />
                <Tooltip
                  contentStyle={tooltipStyle.contentStyle}
                  formatter={(value: number, name: string) => [`${value} ${value === 1 ? 'ordem' : 'ordens'}`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">Sem ordens no período.</div>
          )}
        </motion.div>
      </div>

      {/* Row 3: Finalized Orders Count Chart */}
      <motion.div className="card-accent-subtle rounded-lg p-4 sm:p-5" {...anim(4)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Ordens Finalizadas {useDaily ? 'por Dia' : 'por Mês'}</h3>
        </div>
        {ordersCountData.some(d => d.count > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ordersCountData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142,71%,45%)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="hsl(142,71%,45%)" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(240,5%,50%)' }}
                axisLine={false}
                tickLine={false}
                interval={xTickInterval}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(240,5%,50%)' }}
                axisLine={false}
                tickLine={false}
                ticks={ordersTicks}
                tickFormatter={v => v.toFixed(0)}
                domain={[0, ordersTicks[ordersTicks.length - 1] || 'auto']}
                width={30}
                allowDecimals={false}
              />
              <Tooltip content={<OrdersTooltip />} />
              <Bar
                dataKey="count"
                fill="url(#barGrad)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Sem ordens finalizadas no período.</div>
        )}
      </motion.div>

      {/* Row 4: Recent Orders */}
      <motion.div className="card-accent-subtle rounded-lg" {...anim(5)}>
        <div className="p-4 flex items-center justify-between">
          <h3 className="section-title">Últimas Ordens de Serviço</h3>
          <button onClick={() => navigate('/ordens')} className="text-xs text-primary hover:underline">Ver todas →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-primary/10">
                <th className="text-left font-medium px-4 py-2.5">O.S. ID</th>
                <th className="text-left font-medium px-4 py-2.5">Cliente</th>
                <th className="text-left font-medium px-4 py-2.5 hidden md:table-cell">Aparelho</th>
                <th className="text-left font-medium px-4 py-2.5 hidden lg:table-cell">Data</th>
                <th className="text-right font-medium px-4 py-2.5">Valor</th>
                <th className="text-left font-medium px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.id} className="surface-interactive cursor-pointer border-b border-primary/5 last:border-0" onClick={() => navigate(`/ordens/${order.id}`)}>
                  <td className="px-4 py-2.5 tabular-nums font-medium text-primary">{order.codigo}</td>
                  <td className="px-4 py-2.5">{order.cliente}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{order.aparelho}</td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground hidden lg:table-cell">{new Date(order.data_entrada).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(Number(order.valor))}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={order.status as OrderStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recentOrders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma ordem no período selecionado.</div>
        )}
      </motion.div>
    </div>
  );
}
