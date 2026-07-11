import { PackageOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './EmptyState.css';

export default function EmptyState({
  icon: Icon = PackageOpen,
  title,
  message,
  action,
}) {
  const { t } = useTranslation();
  const displayTitle = title || t('common.noData') || 'لا توجد بيانات';

  return (
    <div className="empty-state">
      <Icon className="empty-state-icon" size={64} strokeWidth={1.2} />
      <h3 className="empty-state-title">{displayTitle}</h3>
      {message && <p className="empty-state-message">{message}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
