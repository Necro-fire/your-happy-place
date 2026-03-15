import { useParams, useNavigate } from 'react-router-dom';
import { useOrders } from '@/contexts/OrdersContext';
import { useClients } from '@/contexts/ClientsContext';
import { useCompanySettings } from '@/contexts/CompanySettingsContext';
import { StatusBadge } from '@/components/StatusBadge';
import { type OrderStatus, statusLabels } from '@/lib/mock-data';
import { decodeProblema } from '@/lib/checklist-utils';
import { ArrowLeft, Printer, FileText, Clock, User, Phone, Monitor, Wrench, CheckSquare, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrintOrderView } from '@/components/PrintOrderView';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useState } from 'react';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { orders, updateOrder } = useOrders();
  const { getClientById } = useClients();
  const { settings } = useCompanySettings();
  const navigate = useNavigate();
  const [showPrint, setShowPrint] = useState(false);
  const order = orders.find(o => o.id === id);

  if (!order) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Ordem não encontrada.</div>;
  }

  const client = order.client_id ? getClientById(order.client_id) : undefined;
  const decoded = decodeProblema(order.problema);
  const companyInfo = {
    name: settings.nome_empresa || 'TechAssist — Assistência Técnica',
    address: settings.endereco_empresa,
    phone: settings.telefone_empresa,
    email: settings.email_empresa,
    logo_url: settings.logo_url,
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    const updates: Record<string, string> = { status: newStatus };
    if (newStatus === 'em_manutencao') updates.hora_inicio = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (newStatus === 'finalizado') updates.hora_final = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    await updateOrder(order.id, updates);
    toast.success(`Status alterado para ${statusLabels[newStatus]}.`);
  };

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => { window.print(); setTimeout(() => setShowPrint(false), 500); }, 300);
  };

  const infoItems = [
    { icon: User, label: 'Cliente', value: order.cliente },
    ...(client ? [{ icon: Tag, label: 'Código do Cliente', value: client.codigo }] : []),
    { icon: Phone, label: 'Telefone', value: order.telefone },
    { icon: Monitor, label: 'Aparelho', value: `${order.marca} ${order.modelo} (${order.aparelho})` },
    { icon: Wrench, label: 'Técnico', value: order.tecnico },
    { icon: Clock, label: 'Entrada', value: new Date(order.data_entrada).toLocaleDateString('pt-BR') },
    { icon: Clock, label: 'Início', value: order.hora_inicio || '—' },
    { icon: Clock, label: 'Finalização', value: order.hora_final || '—' },
  ];

  return (
    <>
      <motion.div
        className={`space-y-6 max-w-3xl ${showPrint ? 'no-print' : ''}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] as [number, number, number, number] }}
      >
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/ordens')} className="p-2 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors no-print">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold tabular-nums">{order.codigo}</h1>
              <StatusBadge status={order.status as OrderStatus} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {order.cliente} · {order.marca} {order.modelo}
              {client && <span className="text-primary ml-2">({client.codigo})</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <Button variant="outline" size="sm" onClick={handlePrint} className="border-0 bg-surface-1" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
              <Printer className="w-4 h-4 mr-1.5" strokeWidth={1.5} />Imprimir OS
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPrint(!showPrint)} className="border-0 bg-surface-1" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
              <FileText className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
              {showPrint ? 'Fechar Preview' : 'Visualizar OS'}
            </Button>
          </div>
        </div>

        <div className="card-accent-subtle rounded-lg p-5">
          <h3 className="text-sm font-medium mb-4">Informações</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {infoItems.map(item => (
              <div key={item.label} className="flex items-start gap-3">
                <item.icon className="w-4 h-4 text-muted-foreground mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm tabular-nums">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {decoded.checklist.length > 0 && (
          <div className="card-accent-subtle rounded-lg p-5">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" strokeWidth={1.5} />
              Problemas Identificados
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {decoded.checklist.map((problem) => (
                <div key={problem} className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 text-sm">
                  <CheckSquare className="w-3.5 h-3.5 text-primary flex-shrink-0" strokeWidth={1.5} />
                  <span>{problem}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card-accent-subtle rounded-lg p-5">
            <h3 className="text-sm font-medium mb-2">Problema Relatado</h3>
            <p className="text-sm text-muted-foreground">{decoded.freeText || '—'}</p>
          </div>
          <div className="card-accent-subtle rounded-lg p-5">
            <h3 className="text-sm font-medium mb-2">Observações Técnicas</h3>
            <p className="text-sm text-muted-foreground">{order.observacoes || '—'}</p>
          </div>
        </div>

        <div className="card-accent rounded-lg p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Valor do Serviço</p>
            <p className="text-2xl font-semibold tabular-nums">R$ {Number(order.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="flex gap-2 no-print">
            {order.status === 'pendente' && (
              <Button size="sm" onClick={() => handleStatusChange('em_manutencao')} className="accent-glow">Iniciar Manutenção</Button>
            )}
            {order.status === 'em_manutencao' && (
              <Button size="sm" onClick={() => handleStatusChange('finalizado')} className="bg-status-completed hover:bg-status-completed/90 text-primary-foreground">Finalizar</Button>
            )}
          </div>
        </div>
      </motion.div>

      {showPrint && (
        <div className="mt-8 no-print">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Pré-visualização da Impressão</h3>
            <div className="flex gap-2">
              <Button size="sm" onClick={handlePrint} className="accent-glow"><Printer className="w-4 h-4 mr-1.5" />Imprimir</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPrint(false)}>Fechar</Button>
            </div>
          </div>
          <div className="border border-border rounded-lg overflow-hidden" style={{ boxShadow: '0 4px 30px rgba(0,0,0,0.4)' }}>
            <PrintOrderView order={order} companyInfo={companyInfo} clientCode={client?.codigo} />
          </div>
        </div>
      )}

      <div className="hidden print-only">
        <PrintOrderView order={order} companyInfo={companyInfo} clientCode={client?.codigo} />
      </div>
    </>
  );
}
