import { useMemo, useState } from 'react';
import { useOrders } from '@/contexts/OrdersContext';
import { Search, User, Phone, ClipboardList } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { generateCode } from '@/lib/checklist-utils';

interface ClientInfo {
  nome: string;
  telefone: string;
  codigo: string;
  totalOrdens: number;
  ultimaOrdem: string;
  valorTotal: number;
}

// Persistent client codes stored in localStorage
function getClientCodes(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem('client-codes') || '{}');
  } catch {
    return {};
  }
}

function saveClientCodes(codes: Record<string, string>) {
  localStorage.setItem('client-codes', JSON.stringify(codes));
}

function getOrCreateClientCode(clientName: string): string {
  const key = clientName.trim().toLowerCase();
  const codes = getClientCodes();
  if (codes[key]) return codes[key];
  // Generate unique code
  const existingValues = new Set(Object.values(codes));
  let code: string;
  do {
    code = generateCode('CL-');
  } while (existingValues.has(code));
  codes[key] = code;
  saveClientCodes(codes);
  return code;
}

export default function ClientsPage() {
  const { orders } = useOrders();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const clients = useMemo(() => {
    const map = new Map<string, ClientInfo>();
    for (const o of orders) {
      const key = o.cliente.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          nome: o.cliente,
          telefone: o.telefone,
          codigo: getOrCreateClientCode(o.cliente),
          totalOrdens: 0,
          ultimaOrdem: o.data_entrada,
          valorTotal: 0,
        });
      }
      const c = map.get(key)!;
      c.totalOrdens++;
      c.valorTotal += Number(o.valor);
      if (o.data_entrada > c.ultimaOrdem) c.ultimaOrdem = o.data_entrada;
      if (o.telefone && !c.telefone) c.telefone = o.telefone;
    }
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [orders]);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      c.codigo.toLowerCase().includes(q) ||
      c.telefone.toLowerCase().includes(q)
    );
  }, [clients, search]);

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
            key={client.codigo}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="surface-card rounded-lg p-4 space-y-3 cursor-pointer hover:bg-[hsl(var(--surface-2))] transition-colors"
            onClick={() => navigate(`/ordens?q=${encodeURIComponent(client.nome)}`)}
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
