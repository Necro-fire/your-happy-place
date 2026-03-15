import { useMemo, useState } from 'react';
import { useClients } from '@/contexts/ClientsContext';
import { useOrders } from '@/contexts/OrdersContext';
import { Search, User, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function ClientsPage() {
  const { clients } = useClients();
  const { orders } = useOrders();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const clientsWithStats = useMemo(() => {
    return clients.map(client => {
      const clientOrders = orders.filter(o => o.client_id === client.id);
      const valorTotal = clientOrders.reduce((s, o) => s + Number(o.valor), 0);
      const ultimaOrdem = clientOrders.length > 0
        ? clientOrders.sort((a, b) => new Date(b.data_entrada).getTime() - new Date(a.data_entrada).getTime())[0].data_entrada
        : client.created_at;
      return { ...client, totalOrdens: clientOrders.length, valorTotal, ultimaOrdem };
    });
  }, [clients, orders]);

  const filtered = useMemo(() => {
    if (!search) return clientsWithStats;
    const q = search.toLowerCase();
    return clientsWithStats.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      c.codigo.toLowerCase().includes(q) ||
      c.telefone.toLowerCase().includes(q)
    );
  }, [clientsWithStats, search]);

  const inputShadow = { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight uppercase">Clientes</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} clientes encontrados</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        <Input
          placeholder="Buscar por nome, código ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-surface-1 border-0 text-sm"
          style={inputShadow}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((client, i) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="surface-card rounded-lg p-4 space-y-3 cursor-pointer hover:bg-[hsl(var(--surface-2))] transition-colors"
            onClick={() => navigate(`/clientes/${client.id}`)}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-primary tabular-nums">{client.codigo}</span>
              <span className="text-xs text-muted-foreground">{client.totalOrdens} OS</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{client.nome}</p>
                {client.telefone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" strokeWidth={1.5} />{client.telefone}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2" style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.06)' }}>
              <span>Total: R$ {client.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span>{new Date(client.ultimaOrdem).toLocaleDateString('pt-BR')}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">Nenhum cliente encontrado.</div>
      )}
    </div>
  );
}
