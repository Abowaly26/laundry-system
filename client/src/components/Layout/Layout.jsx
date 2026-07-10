import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

const pageTitleKeys = {
  '/': 'sidebar.dashboard',
  '/orders/new': 'sidebar.newOrder',
  '/orders': 'sidebar.orders',
  '/tracking': 'sidebar.itemTracking',
  '/customers': 'sidebar.customers',
  '/services': 'sidebar.services',
  '/finance': 'sidebar.finances',
  '/users': 'sidebar.users',
  '/settings': 'sidebar.settings',
};

export default function Layout() {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname.startsWith('/orders/') && location.pathname !== '/orders/new') {
      return t('layout.orderDetails') || 'تفاصيل الطلب';
    }
    const key = pageTitleKeys[location.pathname];
    return key ? t(key) : t('layout.laundryName') || 'المغسلة الذكية';
  };

  return (
    <div className="layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="layout-main">
        <Header
          title={getPageTitle()}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
