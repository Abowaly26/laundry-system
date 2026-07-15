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

  return (
    <header className="header">
      <div className="header-right">
        <button className="header-menu-btn" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <div>
          <h1 className="header-title">{title}</h1>
          {!isSuperOwner && laundryName && (
            <div className="header-laundry-badge">
              <Building2 size={11} />
              {laundryName}
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
