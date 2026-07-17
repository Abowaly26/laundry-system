import { Menu, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import './Header.css';

export default function Header({ title, onMenuClick }) {
  const { i18n } = useTranslation();
  const { user, laundryName, isSuperOwner } = useAuth();

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  };

  const renderSubscriptionBadge = () => {
    if (isSuperOwner) return null;
    
    const plan = user?.laundry_plan_type;
    const endDateStr = user?.laundry_subscription_end_date;
    
    if (plan === 'lifetime') {
      return (
        <span className="header-sub-badge lifetime" title="اشتراك دائم مدى الحياة">
          ♾️ مدى الحياة
        </span>
      );
    }
    
    if (!endDateStr) return null;
    
    const now = new Date();
    const endDate = new Date(endDateStr);
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return (
        <span className="header-sub-badge expired" title="الاشتراك منتهي! يرجى التجديد">
          ⚠️ اشتراك منتهي!
        </span>
      );
    }
    
    // Calculate months and days remaining
    let months = 0;
    let days = diffDays;
    
    if (diffDays >= 30) {
      months = Math.floor(diffDays / 30);
      days = diffDays % 30;
    }
    
    let text = 'باقي: ';
    if (months > 0) {
      text += `${months} شهر `;
    }
    if (days > 0 || months === 0) {
      text += `${days} يوم`;
    }
    
    // Determine class based on urgency (<= 7 days critical, <= 30 warning)
    const urgencyClass = diffDays <= 7 ? 'critical' : diffDays <= 30 ? 'warning' : 'healthy';
    
    return (
      <span className={`header-sub-badge ${urgencyClass}`} title={`ينتهي في ${new Date(endDateStr).toLocaleDateString('ar-EG')}`}>
        ⏳ {text}
      </span>
    );
  };

  return (
    <header className="header">
      <div className="header-right">
        <button className="header-menu-btn" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <div>
          <h1 className="header-title">{title}</h1>
          {!isSuperOwner && laundryName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div className="header-laundry-badge">
                <Building2 size={11} />
                {laundryName}
              </div>
              {renderSubscriptionBadge()}
            </div>
          )}
        </div>
      </div>

      <div className="header-left">
        {isSuperOwner && (
          <button 
            onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
            style={{ 
              background: 'var(--primary-light)', 
              border: 'none', 
              cursor: 'pointer', 
              marginInlineEnd: '15px', 
              color: 'var(--primary)', 
              fontWeight: 'bold',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '0.85rem'
            }}
          >
            {i18n.language === 'en' ? 'العربية' : 'English'}
          </button>
        )}
        <div className="header-user">
          <span className="header-user-name">{user?.name}</span>
          <div className="header-user-avatar">
            {getInitials(user?.name)}
          </div>
        </div>
      </div>
    </header>
  );
}
