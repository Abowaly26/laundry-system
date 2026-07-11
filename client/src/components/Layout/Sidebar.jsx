import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Store,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import './Sidebar.css';

// قائمة التنقل الرئيسية
const navItems = [
  { path: '/', labelKey: 'sidebar.dashboard', icon: LayoutDashboard, noWorker: true },
  { path: '/orders/new', labelKey: 'sidebar.newOrder', icon: PlusCircle, hideForSuperOwner: true, noWorker: true },
  { path: '/orders', labelKey: 'sidebar.orders', icon: ClipboardList, hideForSuperOwner: true },
  { path: '/tracking', labelKey: 'sidebar.itemTracking', icon: ScanLine, hideForSuperOwner: true },
  { path: '/customers', labelKey: 'sidebar.customers', icon: Users, hideForSuperOwner: true, noWorker: true },
  { path: '/services', labelKey: 'sidebar.services', icon: Sparkles, hideForSuperOwner: true, adminOnly: true },
  { path: '/finance', labelKey: 'sidebar.finances', icon: Wallet, hideForSuperOwner: true, adminOnly: true },
  { path: '/users', labelKey: 'sidebar.users', icon: UserCog, adminOnly: true },
  { path: '/settings', labelKey: 'sidebar.settings', icon: SettingsIcon, adminOnly: true },
];

// عناصر خاصة بـ super_owner
const superOwnerItems = [
  { path: '/laundries', labelKey: 'sidebar.laundries', icon: Store },
  { path: '/users', labelKey: 'sidebar.users', icon: UserCog },
];

const roleLabels = {
  super_owner: 'roles.super_owner',
  admin: 'roles.admin',
  cashier: 'roles.cashier',
  worker: 'roles.worker',
};

export default function Sidebar({ isOpen, onClose }) {
  const { t, i18n } = useTranslation();
  const { user, logout, isAdmin, isSuperOwner, isWorker, laundryName } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();

  // فلتر عناصر القائمة حسب الدور
  const filteredItems = isSuperOwner
    ? superOwnerItems
    : navItems.filter(item => {
        if (item.hideForSuperOwner && isSuperOwner) return false;
        if (item.adminOnly && !isAdmin) return false;
        if (item.noWorker && isWorker) return false;
        return true;
      });

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  };

  const isActive = (item) => {
    if (item.path === '/') return location.pathname === '/';
    if (item.path === '/orders') {
      return location.pathname === '/orders' || (location.pathname.startsWith('/orders/') && location.pathname !== '/orders/new');
    }
    return location.pathname.startsWith(item.path);
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
            {isSuperOwner ? (
              <>
                <span className="brand-name">{t('sidebar.mainDashboard') || 'لوحة التحكم الرئيسية'}</span>
                <span className="brand-subtitle super-owner-badge">
                  <Crown size={10} /> {t('roles.superOwnerBadge') || 'صاحب النظام'}
                </span>
              </>
            ) : (
              <>
                <span className="brand-name">{laundryName || settings?.laundry_name || t('sidebar.laundryName') || 'المغسلة'}</span>
                <span className="brand-subtitle">{t('sidebar.laundrySystem') || 'نظام إدارة المغسلة'}</span>
              </>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          {filteredItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${isActive(item) ? 'active' : ''}`}
              onClick={onClose}
            >
              <item.icon size={20} className="nav-icon" />
              <span>{t(item.labelKey || item.label)}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className={`sidebar-user-avatar ${isSuperOwner ? 'super-owner-avatar' : ''}`}>
              {isSuperOwner ? <Crown size={16} /> : getInitials(user?.name)}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || t('layout.welcome')}</div>
              <div className="sidebar-user-role">
                {t(roleLabels[user?.role]) || user?.role}
              </div>
            </div>
          </div>
          <button className="sidebar-logout-btn" onClick={logout}>
            <LogOut size={20} />
            <span>{t('sidebar.logout') || 'تسجيل الخروج'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
