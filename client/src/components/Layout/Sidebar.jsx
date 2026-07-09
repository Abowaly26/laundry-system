import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  ScanLine,
  Users,
  Sparkles,
  Wallet,
  UserCog,
  Settings as SettingsIcon,
  LogOut,
  WashingMachine,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { path: '/orders/new', label: 'طلب جديد', icon: PlusCircle },
  { path: '/orders', label: 'الطلبات', icon: ClipboardList },
  { path: '/tracking', label: 'تتبع القطع', icon: ScanLine },
  { path: '/customers', label: 'العملاء', icon: Users },
  { path: '/services', label: 'الخدمات', icon: Sparkles },
  { path: '/finance', label: 'المالية', icon: Wallet },
  { path: '/users', label: 'المستخدمين', icon: UserCog, adminOnly: true },
  { path: '/settings', label: 'الإعدادات', icon: SettingsIcon, adminOnly: true },
];

const roleLabels = {
  admin: 'مدير النظام',
  manager: 'مدير',
  employee: 'موظف',
  worker: 'عامل',
};

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const getInitials = (name) => {
    if (!name) return '؟';
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <img src="/favicon.png" alt="logo" className="sidebar-logo-image" />
          </div>
          <div className="brand-text">
            <span className="brand-name">المغسلة</span>
            <span className="brand-subtitle">نظام إدارة المغسلة</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            let isActive = false;
            if (item.path === '/') {
              isActive = location.pathname === '/';
            } else if (item.path === '/orders') {
              isActive = location.pathname === '/orders' || (location.pathname.startsWith('/orders/') && location.pathname !== '/orders/new');
            } else {
              isActive = location.pathname.startsWith(item.path);
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <Icon size={20} className="nav-icon" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {getInitials(user?.name)}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || 'المستخدم'}</div>
              <div className="sidebar-user-role">
                {roleLabels[user?.role] || user?.role}
              </div>
            </div>
          </div>
          <button className="sidebar-logout-btn" onClick={logout}>
            <LogOut size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
