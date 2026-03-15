import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CompanySettings {
  id?: string;
  nome_empresa: string;
  telefone_empresa: string;
  email_empresa: string;
  endereco_empresa: string;
  logo_url: string;
  custo_fixo_mensal: number;
  margem_custo_percentual: number;
}

const defaultSettings: CompanySettings = {
  nome_empresa: '',
  telefone_empresa: '',
  email_empresa: '',
  endereco_empresa: '',
  logo_url: '',
  custo_fixo_mensal: 0,
  margem_custo_percentual: 20,
};

interface CompanySettingsContextType {
  settings: CompanySettings;
  loading: boolean;
  saveSettings: (s: Partial<CompanySettings>) => Promise<void>;
  uploadLogo: (file: File) => Promise<string>;
}

const CompanySettingsContext = createContext<CompanySettingsContextType>({
  settings: defaultSettings,
  loading: true,
  saveSettings: async () => {},
  uploadLogo: async () => '',
});

export const useCompanySettings = () => useContext(CompanySettingsContext);

export const CompanySettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) { setSettings(defaultSettings); setLoading(false); return; }
    const { data } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setSettings({
        id: data.id,
        nome_empresa: data.nome_empresa,
        telefone_empresa: data.telefone_empresa,
        email_empresa: data.email_empresa,
        endereco_empresa: data.endereco_empresa,
        logo_url: data.logo_url,
        custo_fixo_mensal: Number(data.custo_fixo_mensal),
        margem_custo_percentual: Number(data.margem_custo_percentual),
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async (updates: Partial<CompanySettings>) => {
    if (!user) return;
    const merged = { ...settings, ...updates };
    const row = {
      user_id: user.id,
      nome_empresa: merged.nome_empresa,
      telefone_empresa: merged.telefone_empresa,
      email_empresa: merged.email_empresa,
      endereco_empresa: merged.endereco_empresa,
      logo_url: merged.logo_url,
      custo_fixo_mensal: merged.custo_fixo_mensal,
      margem_custo_percentual: merged.margem_custo_percentual,
    };
    if (settings.id) {
      await supabase.from('company_settings').update(row).eq('id', settings.id);
    } else {
      await supabase.from('company_settings').insert(row);
    }
    await fetchSettings();
  };

  const uploadLogo = async (file: File): Promise<string> => {
    if (!user) return '';
    const ext = file.name.split('.').pop();
    const path = `${user.id}/logo.${ext}`;
    await supabase.storage.from('logos').upload(path, file, { upsert: true });
    const { data } = supabase.storage.from('logos').getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <CompanySettingsContext.Provider value={{ settings, loading, saveSettings, uploadLogo }}>
      {children}
    </CompanySettingsContext.Provider>
  );
};
