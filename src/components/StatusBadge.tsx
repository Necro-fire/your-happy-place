import { OrderStatus, statusLabels } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const statusConfig: Record<OrderStatus, { dotClass: string; bgClass: string }> = {
  pendente: {
    dotClass: 'bg-status-pending',
    bgClass: 'bg-status-pending/10 text-status-pending',
  },
  em_manutencao: {
    dotClass: 'bg-primary',
    bgClass: 'bg-primary/10 text-primary',
  },
  finalizado: {
    dotClass: 'bg-status-completed',
    bgClass: 'bg-status-completed/10 text-status-completed',
  },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.bgClass)}>
      <span className={cn('status-dot', config.dotClass)} />
      {statusLabels[status]}
    </span>
  );
}
