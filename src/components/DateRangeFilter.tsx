import { useState } from 'react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date;
  to: Date;
}

type Preset = { label: string; getRange: () => DateRange };

const presets: Preset[] = [
  { label: 'Hoje', getRange: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: 'Últimos 7 dias', getRange: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: 'Últimos 30 dias', getRange: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  { label: 'Este mês', getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Este ano', getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangeFilter({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('Últimos 30 dias');

  const handlePreset = (preset: Preset) => {
    setActivePreset(preset.label);
    onChange(preset.getRange());
    setOpen(false);
  };

  const label = `${format(value.from, 'dd/MM/yy', { locale: ptBR })} — ${format(value.to, 'dd/MM/yy', { locale: ptBR })}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('border-0 bg-surface-1 text-xs gap-2', className)} style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
          {label}
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-surface-1 border-0" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)' }} align="end">
        <div className="flex">
          <div className="border-r border-border/50 p-2 space-y-0.5 min-w-[140px]">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => handlePreset(p)}
                className={cn('w-full text-left text-xs px-3 py-1.5 rounded-sm transition-colors', activePreset === p.label ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-surface-2')}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setActivePreset('custom')}
              className={cn('w-full text-left text-xs px-3 py-1.5 rounded-sm transition-colors', activePreset === 'custom' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-surface-2')}
            >
              Personalizado
            </button>
          </div>
          <div className="p-2">
            <Calendar
              mode="range"
              selected={{ from: value.from, to: value.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setActivePreset('custom');
                  onChange({ from: startOfDay(range.from), to: endOfDay(range.to) });
                } else if (range?.from) {
                  setActivePreset('custom');
                  onChange({ from: startOfDay(range.from), to: endOfDay(range.from) });
                }
              }}
              numberOfMonths={1}
              locale={ptBR}
              className={cn("p-1 pointer-events-auto text-xs")}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function getDefaultDateRange(): DateRange {
  return { from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) };
}
