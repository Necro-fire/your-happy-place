import { useParams, useNavigate } from 'react-router-dom';
import { useOrders } from '@/contexts/OrdersContext';
import { useClients } from '@/contexts/ClientsContext';
import { StatusBadge } from '@/components/StatusBadge';
import { type OrderStatus, statusLabels } from '@/lib/mock-data';
import { ArrowLeft, User, Phone, Clock, History, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { clients } = useClients();
  const { orders } = useOrders();
  const navigate = useNavigate();

  const client = clients.find(c => c.id === id);

  if (!client) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Cliente não encontrado.</div>;
  }

  const clientOrders = orders.filter(o => o.client_id === client.id)
    .sort((a, b) => new Date(b.data_entrada).getTime() - new Date(a.data_entrada).getTime());

  const inputShadow = { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' };

  return (
    <motion.div
      className="space-y-6 max-w-4xl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] as [number, number, number, number] }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/clientes')} className="p-2 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{client.nome}</h1>
            <span className="text-sm font-medium text-primary tabular-nums">{client.codigo}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{clientOrders.length} ordens de serviço</p>
        </div>
      </div>

      {/* Client Info */}
      <div className="card-accent-subtle rounded-lg p-5">
        <h3 className="text-sm font-medium mb-4">Informações do Cliente</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-muted-foreground mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="text-sm">{client.nome}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-primary mt-0.5">CL</span>
            <div>
              <p className="text-xs text-muted-foreground">Código do Cliente</p>
              <p className="text-sm font-medium tabular-nums">{client.codigo}</p>
            </div>
          </div>
          {client.telefone && (
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-muted-foreground mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="text-sm">{client.telefone}</p>
              </div>
            </div>
          )}
          {client.email && (
            <div className="flex items-start gap-3">
              <span className="text-xs text-muted-foreground mt-0.5">@</span>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{client.email}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-muted-foreground mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-xs text-muted-foreground">Data de Cadastro</p>
              <p className="text-sm">{new Date(client.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="card-accent-subtle rounded-lg overflow-hidden">
        <div className="p-5 flex items-center gap-2" style={{ boxShadow: 'inset 0 -1px 0 0 rgba(255,255,255,0.06)' }}>
          <History className="w-4 h-4 text-primary" strokeWidth={1.5} />
          <h3 className="text-sm font-medium">Histórico de Ordens de Serviço</h3>
        </div>

        {clientOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground" style={{ boxShadow: 'inset 0 -1px 0 0 rgba(255,255,255,0.06)' }}>
                  <th className="text-left font-medium px-5 py-3">Código OS</th>
                  <th className="text-left font-medium px-5 py-3">Aparelho</th>
                  <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Problema</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                  <th className="text-left font-medium px-5 py-3 hidden lg:table-cell">Data</th>
                  <th className="text-right font-medium px-5 py-3">Valor</th>
                  <th className="text-right font-medium px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {clientOrders.map(order => (
                  <tr key={order.id} className="surface-interactive group">
                    <td className="px-5 py-3 tabular-nums font-medium text-primary">{order.codigo}</td>
                    <td className="px-5 py-3">{order.marca} {order.modelo}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{order.problema?.replace(/\{\{CHECKLIST:.*?\}\}\n?/, '') || '—'}</td>
                    <td className="px-5 py-3"><StatusBadge status={order.status as OrderStatus} /></td>
                    <td className="px-5 py-3 tabular-nums text-muted-foreground hidden lg:table-cell">{new Date(order.data_entrada).toLocaleDateString('pt-BR')}</td>
                    <td className="px-5 py-3 text-right tabular-nums">R$ {Number(order.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => navigate(`/ordens/${order.id}`)} className="p-1.5 rounded-sm hover:bg-surface-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma ordem de serviço registrada.</div>
        )}
      </div>
    </motion.div>
  );
}
