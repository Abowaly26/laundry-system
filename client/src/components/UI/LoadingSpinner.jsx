import { useTranslation } from 'react-i18next';
import './LoadingSpinner.css';

export default function LoadingSpinner({ size = '', text = '' }) {
  const { t } = useTranslation();
  const loadingText = text || t('common.loading') || 'جاري التحميل...';
  
  return (
    <div className="loading-spinner-container">
      <div className={`spinner ${size ? `spinner-${size}` : ''}`} />
      {loadingText && <p className="loading-text">{loadingText}</p>}
    </div>
  );
}
