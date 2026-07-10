import { Menu, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

export default function Header({ title, onMenuClick }) {
  const { user, laundryName, isSuperOwner } = useAuth();

  const getInitials = (name) => {
    if (!name) return '؟';
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
