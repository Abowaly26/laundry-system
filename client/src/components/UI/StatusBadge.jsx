import Badge from './Badge';

const statusConfig = {
  // Order statuses
  pending: { label: 'قيد الانتظار', variant: 'warning' },
  processing: { label: 'قيد المعالجة', variant: 'info' },
  ready: { label: 'جاهز', variant: 'success' },
  delivered: { label: 'تم التسليم', variant: 'default' },
  cancelled: { label: 'ملغي', variant: 'error' },

  // Item statuses
  received: { label: 'تم الاستلام', variant: 'default' },
  washing: { label: 'غسيل', variant: 'info' },
  drying: { label: 'تجفيف', variant: 'info' },
  ironing: { label: 'كي', variant: 'warning' },
  // ready shares with above
  // delivered shares with above

  // Payment statuses
  paid: { label: 'مدفوع', variant: 'success' },
  partial: { label: 'جزئي', variant: 'warning' },
  unpaid: { label: 'غير مدفوع', variant: 'error' },

  // User statuses
  active: { label: 'نشط', variant: 'success' },
  inactive: { label: 'غير نشط', variant: 'default' },
};

export default function StatusBadge({ status, className = '' }) {
  const config = statusConfig[status] || { label: status, variant: 'default' };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
