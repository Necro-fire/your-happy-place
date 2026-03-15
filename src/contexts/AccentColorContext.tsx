import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AccentColor = 'blue' | 'green' | 'red' | 'yellow' | 'purple';

export const accentColors: Record<AccentColor, { h: number; s: string; l: string; label: string }> = {
  blue: { h: 217, s: '91%', l: '60%', label: 'Azul' },
  green: { h: 142, s: '71%', l: '45%', label: 'Verde' },
  red: { h: 0, s: '72%', l: '51%', label: 'Vermelho' },
  yellow: { h: 45, s: '93%', l: '47%', label: 'Amarelo' },
  purple: { h: 263, s: '70%', l: '50%', label: 'Roxo' },
};

interface AccentColorContextType {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

const AccentColorContext = createContext<AccentColorContextType>({
  accentColor: 'blue',
  setAccentColor: () => {},
});

export const useAccentColor = () => useContext(AccentColorContext);

export const AccentColorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    return (localStorage.getItem('accent-color') as AccentColor) || 'blue';
  });

  // Load from profile
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('cor_tema').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data?.cor_tema && accentColors[data.cor_tema as AccentColor]) {
          setAccentColorState(data.cor_tema as AccentColor);
        }
      });
  }, [user]);

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color);
    localStorage.setItem('accent-color', color);
    if (user) {
      supabase.from('profiles').update({ cor_tema: color }).eq('user_id', user.id);
    }
  };

  useEffect(() => {
    const { h, s, l } = accentColors[accentColor];
    document.documentElement.style.setProperty('--accent-h', String(h));
    document.documentElement.style.setProperty('--accent-s', s);
    document.documentElement.style.setProperty('--accent-l', l);
  }, [accentColor]);

  return (
    <AccentColorContext.Provider value={{ accentColor, setAccentColor }}>
      {children}
    </AccentColorContext.Provider>
  );
};
