import { Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

export default function Header({ title, onMenuClick }) {
  const { user } = useAuth();

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
        <h1 className="header-title">{title}</h1>
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
