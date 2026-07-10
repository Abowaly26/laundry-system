import Badge from './Badge';
import { useTranslation } from 'react-i18next';

const statusConfig = {
  // Order statuses
  pending: { labelKey: 'status.pending', variant: 'warning' },
  processing: { labelKey: 'status.processing', variant: 'info' },
  ready: { labelKey: 'status.ready', variant: 'success' },
  delivered: { labelKey: 'status.delivered', variant: 'default' },
  cancelled: { labelKey: 'status.cancelled', variant: 'error' },

  // Item statuses
  received: { labelKey: 'status.received', variant: 'default' },
  washing: { labelKey: 'status.washing', variant: 'info' },
  drying: { labelKey: 'status.drying', variant: 'info' },
  ironing: { labelKey: 'status.ironing', variant: 'warning' },

  // Payment statuses
  paid: { labelKey: 'status.paid', variant: 'success' },
  partial: { labelKey: 'status.partial', variant: 'warning' },
  unpaid: { labelKey: 'status.unpaid', variant: 'error' },

  // User statuses
  active: { labelKey: 'status.active', variant: 'success' },
  inactive: { labelKey: 'status.inactive', variant: 'default' },
};

export default function StatusBadge({ status, className = '' }) {
  const { t } = useTranslation();
  const config = statusConfig[status] || { labelKey: `status.${status}`, variant: 'default' };

  return (
    <Badge variant={config.variant} className={className}>
      {t(config.labelKey)}
    </Badge>
  );
}
