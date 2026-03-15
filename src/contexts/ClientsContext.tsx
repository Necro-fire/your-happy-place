import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';
import { generateCode } from '@/lib/checklist-utils';

type Client = Tables<'clients'>;

interface ClientsContextType {
  clients: Client[];
  loading: boolean;
  getClientByCode: (code: string) => Client | undefined;
  getClientById: (id: string) => Client | undefined;
  findOrCreateClient: (nome: string, telefone: string, codigoCliente?: string) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const ClientsContext = createContext<ClientsContextType>({
  clients: [],
  loading: true,
  getClientByCode: () => undefined,
  getClientById: () => undefined,
  findOrCreateClient: async () => ({} as Client),
  updateClient: async () => {},
  deleteClient: async () => {},
  refetch: async () => {},
});

export const useClients = () => useContext(ClientsContext);

async function generateUniqueClientCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateCode('CL-');
    const { data } = await supabase
      .from('clients')
      .select('id')
      .eq('codigo', code)
      .maybeSingle();
    if (!data) return code;
  }
  return `CL-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

export const ClientsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!user) { setClients([]); setLoading(false); return; }
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('nome', { ascending: true });
    setClients(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const getClientByCode = useCallback((code: string) => {
    return clients.find(c => c.codigo === code);
  }, [clients]);

  const getClientById = useCallback((id: string) => {
    return clients.find(c => c.id === id);
  }, [clients]);

  const findOrCreateClient = useCallback(async (nome: string, telefone: string, codigoCliente?: string): Promise<Client> => {
    if (!user) throw new Error('Not authenticated');

    // If a client code is provided, look it up
    if (codigoCliente && codigoCliente.trim()) {
      const existing = clients.find(c => c.codigo === codigoCliente.trim().toUpperCase());
      if (existing) return existing;
      
      // Also check DB directly
      const { data: dbClient } = await supabase
        .from('clients')
        .select('*')
        .eq('codigo', codigoCliente.trim().toUpperCase())
        .maybeSingle();
      if (dbClient) return dbClient;
    }

    // Create new client
    const codigo = await generateUniqueClientCode();
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        codigo,
        nome: nome.trim(),
        telefone: telefone || '',
      })
      .select()
      .single();

    if (error) throw error;
    await fetchClients();
    return newClient;
  }, [user, clients, fetchClients]);

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    await supabase.from('clients').update(updates).eq('id', id);
    await fetchClients();
  }, [fetchClients]);

  const deleteClient = useCallback(async (id: string) => {
    await supabase.from('clients').delete().eq('id', id);
    await fetchClients();
  }, [fetchClients]);

  return (
    <ClientsContext.Provider value={{ clients, loading, getClientByCode, getClientById, findOrCreateClient, updateClient, deleteClient, refetch: fetchClients }}>
      {children}
    </ClientsContext.Provider>
  );
};
