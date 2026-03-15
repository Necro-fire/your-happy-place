import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';
import { generateCode } from '@/lib/checklist-utils';

type ServiceOrder = Tables<'service_orders'>;

interface OrdersContextType {
  orders: ServiceOrder[];
  loading: boolean;
  addOrder: (order: { cliente: string; telefone: string; aparelho: string; marca: string; modelo: string; problema: string; observacoes: string; valor: number; tecnico: string }) => Promise<void>;
  updateOrder: (id: string, updates: Partial<ServiceOrder>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const OrdersContext = createContext<OrdersContextType>({
  orders: [], loading: true,
  addOrder: async () => {},
  updateOrder: async () => {},
  deleteOrder: async () => {},
  refetch: async () => {},
});

export const useOrders = () => useContext(OrdersContext);

async function generateUniqueOSCode(userId: string): Promise<string> {
  // Try up to 10 times to get a unique code
  for (let i = 0; i < 10; i++) {
    const code = generateCode('OS-');
    const { data } = await supabase
      .from('service_orders')
      .select('id')
      .eq('codigo', code)
      .maybeSingle();
    if (!data) return code;
  }
  // Fallback
  return `OS-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!user) { setOrders([]); setLoading(false); return; }
    const { data } = await supabase
      .from('service_orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const addOrder = async (order: { cliente: string; telefone: string; aparelho: string; marca: string; modelo: string; problema: string; observacoes: string; valor: number; tecnico: string }) => {
    if (!user) return;
    const codigo = await generateUniqueOSCode(user.id);
    await supabase.from('service_orders').insert({
      ...order,
      user_id: user.id,
      codigo,
      status: 'pendente',
    });
    await fetchOrders();
  };

  const updateOrder = async (id: string, updates: Partial<ServiceOrder>) => {
    await supabase.from('service_orders').update(updates).eq('id', id);
    await fetchOrders();
  };

  const deleteOrder = async (id: string) => {
    await supabase.from('service_orders').delete().eq('id', id);
    await fetchOrders();
  };

  return (
    <OrdersContext.Provider value={{ orders, loading, addOrder, updateOrder, deleteOrder, refetch: fetchOrders }}>
      {children}
    </OrdersContext.Provider>
  );
};
