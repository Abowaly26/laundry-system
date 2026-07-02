import { PackageOpen } from 'lucide-react';
import './EmptyState.css';

export default function EmptyState({
  icon: Icon = PackageOpen,
  title = 'لا توجد بيانات',
  message,
  action,
}) {
  return (
    <div className="empty-state">
      <Icon className="empty-state-icon" size={64} strokeWidth={1.2} />
      <h3 className="empty-state-title">{title}</h3>
      {message && <p className="empty-state-message">{message}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
