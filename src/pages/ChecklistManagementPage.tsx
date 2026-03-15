import { useState } from 'react';
import { useChecklistProblems } from '@/contexts/ChecklistProblemsContext';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const MAX_PROBLEMS = 30;
const MAX_CHARS = 30;

export default function ChecklistManagementPage() {
  const { problems, addProblem, updateProblem, removeProblem } = useChecklistProblems();
  const [newLabel, setNewLabel] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const inputShadow = { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' };

  const handleAdd = () => {
    const error = addProblem(newLabel);
    if (error) {
      toast.error(error);
      return;
    }
    setNewLabel('');
    toast.success('Problema adicionado.');
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(problems[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    const error = updateProblem(editingIndex, editValue);
    if (error) {
      toast.error(error);
      return;
    }
    setEditingIndex(null);
    toast.success('Problema atualizado.');
  };

  const handleRemove = (index: number) => {
    removeProblem(index);
    toast.success('Problema removido.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold tracking-tight uppercase">Gerenciar Problemas do Checklist</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {problems.length}/{MAX_PROBLEMS} problemas cadastrados · Máximo {MAX_CHARS} caracteres cada
        </p>
      </div>

      {/* Add new */}
      {problems.length < MAX_PROBLEMS && (
        <div className="flex gap-2">
          <Input
            placeholder="Novo problema (ex: Tela quebrada)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            maxLength={MAX_CHARS}
            className="bg-surface-1 border-0 text-sm flex-1"
            style={inputShadow}
          />
          <Button onClick={handleAdd} size="sm" className="accent-glow" disabled={!newLabel.trim()}>
            <Plus className="w-4 h-4 mr-1.5" strokeWidth={1.5} />Adicionar
          </Button>
        </div>
      )}

      {/* Problems grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <AnimatePresence>
          {problems.map((problem, index) => (
            <motion.div
              key={`${problem}-${index}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="surface-card rounded-lg px-4 py-3 flex items-center gap-2 group"
            >
              {editingIndex === index ? (
                <>
                  <Input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') setEditingIndex(null);
                    }}
                    maxLength={MAX_CHARS}
                    className="bg-surface-2 border-0 text-sm h-8 flex-1"
                    style={inputShadow}
                    autoFocus
                  />
                  <button onClick={handleSaveEdit} className="p-1 rounded-sm hover:bg-primary/20 text-primary">
                    <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                  <button onClick={() => setEditingIndex(null)} className="p-1 rounded-sm hover:bg-surface-2 text-muted-foreground">
                    <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm flex-1 truncate">{problem}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleStartEdit(index)} className="p-1 rounded-sm hover:bg-surface-2 text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => handleRemove(index)} className="p-1 rounded-sm hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {problems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum problema cadastrado. Adicione o primeiro acima.
        </div>
      )}
    </div>
  );
}
