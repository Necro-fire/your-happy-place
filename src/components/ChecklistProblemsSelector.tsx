import { useChecklistProblems } from '@/contexts/ChecklistProblemsContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Props {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function ChecklistProblemsSelector({ selected, onChange }: Props) {
  const { problems } = useChecklistProblems();

  const toggle = (problem: string) => {
    if (selected.includes(problem)) {
      onChange(selected.filter(s => s !== problem));
    } else {
      onChange([...selected, problem]);
    }
  };

  if (problems.length === 0) return null;

  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-3 block">Problemas Identificados</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {problems.map((problem) => (
          <label
            key={problem}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer surface-interactive text-sm"
          >
            <Checkbox
              checked={selected.includes(problem)}
              onCheckedChange={() => toggle(problem)}
            />
            <span className="truncate">{problem}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
