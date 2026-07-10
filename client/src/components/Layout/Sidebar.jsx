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
  Store,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import './Sidebar.css';

// قائمة التنقل الرئيسية
const navItems = [
  { path: '/', label: 'لوحة التحكم', icon: LayoutDashboard, noWorker: true },
  { path: '/orders/new', label: 'طلب جديد', icon: PlusCircle, hideForSuperOwner: true, noWorker: true },
  { path: '/orders', label: 'الطلبات', icon: ClipboardList, hideForSuperOwner: true },
  { path: '/tracking', label: 'تتبع القطع', icon: ScanLine, hideForSuperOwner: true },
  { path: '/customers', label: 'العملاء', icon: Users, hideForSuperOwner: true, noWorker: true },
  { path: '/services', label: 'الخدمات', icon: Sparkles, hideForSuperOwner: true, adminOnly: true },
  { path: '/finance', label: 'المالية', icon: Wallet, hideForSuperOwner: true, adminOnly: true },
  { path: '/users', label: 'المستخدمين', icon: UserCog, adminOnly: true },
  { path: '/settings', label: 'الإعدادات', icon: SettingsIcon, adminOnly: true },
];

// عناصر خاصة بـ super_owner
const superOwnerItems = [
  { path: '/laundries', label: 'إدارة المغاسل', icon: Store },
  { path: '/users', label: 'الموظفين', icon: UserCog },
];

const roleLabels = {
  super_owner: 'صاحب النظام',
  admin: 'مدير المغسلة',
  cashier: 'موظف استقبال',
  worker: 'عامل تشغيل',
};

export default function Sidebar({ isOpen, onClose }) {
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
    if (!name) return '؟';
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
                <span className="brand-name">لوحة التحكم الرئيسية</span>
                <span className="brand-subtitle super-owner-badge">
                  <Crown size={10} /> صاحب النظام
                </span>
              </>
            ) : (
              <>
                <span className="brand-name">{laundryName || settings?.laundry_name || 'المغسلة'}</span>
                <span className="brand-subtitle">نظام إدارة المغسلة</span>
              </>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-nav-item ${active ? 'active' : ''}`}
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
            <div className={`sidebar-user-avatar ${isSuperOwner ? 'super-owner-avatar' : ''}`}>
              {isSuperOwner ? <Crown size={16} /> : getInitials(user?.name)}
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
