import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const MAX_PROBLEMS = 30;
const MAX_CHARS = 30;
const STORAGE_KEY = 'checklist-problems';

interface ChecklistProblemsContextType {
  problems: string[];
  addProblem: (label: string) => string | null; // returns error or null
  updateProblem: (index: number, label: string) => string | null;
  removeProblem: (index: number) => void;
  reorderProblems: (problems: string[]) => void;
}

const ChecklistProblemsContext = createContext<ChecklistProblemsContextType>({
  problems: [],
  addProblem: () => null,
  updateProblem: () => null,
  removeProblem: () => {},
  reorderProblems: () => {},
});

export const useChecklistProblems = () => useContext(ChecklistProblemsContext);

const defaultProblems = [
  'Tela quebrada',
  'Não liga',
  'Não carrega',
  'Sem áudio',
  'Câmera não abre',
  'Botão não funciona',
  'Wi-Fi não conecta',
  'Bluetooth falha',
  'Bateria viciada',
  'Travando muito',
];

export const ChecklistProblemsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [problems, setProblems] = useState<string[]>([]);

  const storageKey = user ? `${STORAGE_KEY}-${user.id}` : STORAGE_KEY;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setProblems(JSON.parse(stored));
      } catch {
        setProblems(defaultProblems);
      }
    } else {
      setProblems(defaultProblems);
    }
  }, [storageKey]);

  const persist = useCallback((updated: string[]) => {
    setProblems(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  }, [storageKey]);

  const validate = (label: string, excludeIndex?: number): string | null => {
    const trimmed = label.trim();
    if (!trimmed) return 'Texto não pode ser vazio.';
    if (trimmed.length > MAX_CHARS) return `Máximo de ${MAX_CHARS} caracteres.`;
    const isDuplicate = problems.some((p, i) => i !== excludeIndex && p.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) return 'Esse problema já existe.';
    return null;
  };

  const addProblem = (label: string): string | null => {
    if (problems.length >= MAX_PROBLEMS) return `Limite de ${MAX_PROBLEMS} problemas atingido.`;
    const error = validate(label);
    if (error) return error;
    persist([...problems, label.trim()]);
    return null;
  };

  const updateProblem = (index: number, label: string): string | null => {
    const error = validate(label, index);
    if (error) return error;
    const updated = [...problems];
    updated[index] = label.trim();
    persist(updated);
    return null;
  };

  const removeProblem = (index: number) => {
    persist(problems.filter((_, i) => i !== index));
  };

  const reorderProblems = (newProblems: string[]) => {
    persist(newProblems);
  };

  return (
    <ChecklistProblemsContext.Provider value={{ problems, addProblem, updateProblem, removeProblem, reorderProblems }}>
      {children}
    </ChecklistProblemsContext.Provider>
  );
};
