import { useState, useEffect, useMemo } from 'react';
import { useOrders } from '@/contexts/OrdersContext';
import { StatusBadge } from '@/components/StatusBadge';
import { type OrderStatus, statusLabels } from '@/lib/mock-data';
import { DateRangeFilter, getDefaultDateRange, type DateRange } from '@/components/DateRangeFilter';
import { ChecklistProblemsSelector } from '@/components/ChecklistProblemsSelector';
import { encodeProblema, decodeProblema } from '@/lib/checklist-utils';
import { Plus, Search, Filter, Trash2, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { parseISO, isWithinInterval } from 'date-fns';

export default function OrdersPage() {
  const { orders, addOrder, updateOrder, deleteOrder } = useOrders();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    cliente: '', telefone: '', aparelho: '', marca: '', modelo: '',
    problema: '', observacoes: '', valor: 0, tecnico: '',
  });

  useEffect(() => {
    const handler = (e: Event) => setSearch((e as CustomEvent).detail || '');
    window.addEventListener('global-search', handler);
    return () => window.removeEventListener('global-search', handler);
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearch(q);
  }, [searchParams]);

  const filtered = useMemo(() => orders.filter(o => {
    const matchSearch = !search || [o.codigo, o.cliente, o.telefone, o.aparelho, o.marca, o.modelo]
      .some(f => f.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const d = parseISO(o.data_entrada);
    const matchDate = isWithinInterval(d, { start: dateRange.from, end: dateRange.to });
    return matchSearch && matchStatus && matchDate;
  }), [orders, search, statusFilter, dateRange]);

  const openNew = () => {
    setEditingId(null);
    setFormData({ cliente: '', telefone: '', aparelho: '', marca: '', modelo: '', problema: '', observacoes: '', valor: 0, tecnico: '' });
    setSelectedProblems([]);
    setShowForm(true);
  };

  const openEdit = (id: string) => {
    const o = orders.find(o => o.id === id);
    if (!o) return;
    setEditingId(id);
    const decoded = decodeProblema(o.problema);
    setSelectedProblems(decoded.checklist);
    setFormData({
      cliente: o.cliente, telefone: o.telefone, aparelho: o.aparelho, marca: o.marca,
      modelo: o.modelo, problema: decoded.freeText, observacoes: o.observacoes, valor: Number(o.valor), tecnico: o.tecnico,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.cliente || !formData.aparelho) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    const encodedProblema = encodeProblema(selectedProblems, formData.problema);
    const orderData = { ...formData, problema: encodedProblema };
    if (editingId) {
      await updateOrder(editingId, orderData);
      toast.success('Ordem atualizada.');
    } else {
      await addOrder(orderData);
      toast.success('Nova ordem criada.');
    }
    setShowForm(false);
  };

  const handleStatusChange = async (id: string, newStatus: OrderStatus) => {
    const updates: Record<string, string> = { status: newStatus };
    if (newStatus === 'em_manutencao') updates.hora_inicio = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (newStatus === 'finalizado') updates.hora_final = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    await updateOrder(id, updates);
    toast.success(`Status alterado para ${statusLabels[newStatus]}.`);
  };

  const handleDelete = async (id: string) => {
    await deleteOrder(id);
    toast.success('Ordem excluída.');
  };

  const inputShadow = { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight uppercase">Ordens de Serviço</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} ordens encontradas</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <Button onClick={openNew} size="sm" className="accent-glow">
            <Plus className="w-4 h-4 mr-1.5" strokeWidth={1.5} />Nova OS
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <Input placeholder="Buscar por código, cliente, telefone, marca, modelo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-surface-1 border-0 text-sm" style={inputShadow} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-surface-1 border-0 text-sm" style={inputShadow}>
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" strokeWidth={1.5} />
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="surface-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground" style={{ boxShadow: 'inset 0 -1px 0 0 rgba(255,255,255,0.06)' }}>
                <th className="text-left font-medium px-5 py-3">Código</th>
                <th className="text-left font-medium px-5 py-3">Cliente</th>
                <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Aparelho</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="text-left font-medium px-5 py-3 hidden lg:table-cell">Entrada</th>
                <th className="text-right font-medium px-5 py-3">Valor</th>
                <th className="text-right font-medium px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map(order => (
                  <motion.tr key={order.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="surface-interactive group">
                    <td className="px-5 py-3 tabular-nums font-medium text-primary">{order.codigo}</td>
                    <td className="px-5 py-3">{order.cliente}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{order.marca} {order.modelo}</td>
                    <td className="px-5 py-3">
                      <Select value={order.status} onValueChange={(v) => handleStatusChange(order.id, v as OrderStatus)}>
                        <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none w-auto">
                          <StatusBadge status={order.status as OrderStatus} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
                          <SelectItem value="finalizado">Finalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted-foreground hidden lg:table-cell">{new Date(order.data_entrada).toLocaleDateString('pt-BR')}</td>
                    <td className="px-5 py-3 text-right tabular-nums">R$ {Number(order.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/ordens/${order.id}`)} className="p-1.5 rounded-sm hover:bg-surface-2 text-muted-foreground hover:text-foreground"><Eye className="w-3.5 h-3.5" strokeWidth={1.5} /></button>
                        <button onClick={() => openEdit(order.id)} className="p-1.5 rounded-sm hover:bg-surface-2 text-muted-foreground hover:text-foreground"><Edit className="w-3.5 h-3.5" strokeWidth={1.5} /></button>
                        <button onClick={() => handleDelete(order.id)} className="p-1.5 rounded-sm hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma ordem encontrada.</div>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-surface-1 border-0 max-w-2xl max-h-[90vh] p-0" style={inputShadow}>
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar OS' : 'Nova Ordem de Serviço'}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Nome do Cliente *</Label>
                  <Input value={formData.cliente} onChange={e => setFormData(p => ({ ...p, cliente: e.target.value }))} className="mt-1 bg-surface-2 border-0" style={inputShadow} autoFocus />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Telefone</Label>
                  <Input value={formData.telefone} onChange={e => setFormData(p => ({ ...p, telefone: e.target.value }))} className="mt-1 bg-surface-2 border-0" style={inputShadow} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Aparelho *</Label>
                  <Input value={formData.aparelho} onChange={e => setFormData(p => ({ ...p, aparelho: e.target.value }))} className="mt-1 bg-surface-2 border-0" style={inputShadow} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Marca</Label>
                  <Input value={formData.marca} onChange={e => setFormData(p => ({ ...p, marca: e.target.value }))} className="mt-1 bg-surface-2 border-0" style={inputShadow} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Modelo</Label>
                  <Input value={formData.modelo} onChange={e => setFormData(p => ({ ...p, modelo: e.target.value }))} className="mt-1 bg-surface-2 border-0" style={inputShadow} />
                </div>

                {/* Checklist Problems */}
                <div className="col-span-2 mt-2">
                  <ChecklistProblemsSelector selected={selectedProblems} onChange={setSelectedProblems} />
                </div>

                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Problema Adicional (texto livre)</Label>
                  <Textarea value={formData.problema} onChange={e => setFormData(p => ({ ...p, problema: e.target.value }))} className="mt-1 bg-surface-2 border-0 min-h-[60px]" style={inputShadow} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Observações Técnicas</Label>
                  <Textarea value={formData.observacoes} onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))} className="mt-1 bg-surface-2 border-0 min-h-[60px]" style={inputShadow} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
                  <Input type="number" value={formData.valor} onChange={e => setFormData(p => ({ ...p, valor: Number(e.target.value) }))} className="mt-1 bg-surface-2 border-0" style={inputShadow} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Técnico</Label>
                  <Input value={formData.tecnico} onChange={e => setFormData(p => ({ ...p, tecnico: e.target.value }))} className="mt-1 bg-surface-2 border-0" style={inputShadow} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} className="accent-glow">{editingId ? 'Salvar' : 'Criar OS'}</Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
