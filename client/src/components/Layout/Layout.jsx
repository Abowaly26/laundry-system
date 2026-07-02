import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

const pageTitles = {
  '/': 'لوحة التحكم',
  '/orders/new': 'طلب جديد',
  '/orders': 'الطلبات',
  '/tracking': 'تتبع القطع',
  '/customers': 'العملاء',
  '/services': 'الخدمات',
  '/finance': 'المالية',
  '/users': 'المستخدمين',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname.startsWith('/orders/') && location.pathname !== '/orders/new') {
      return 'تفاصيل الطلب';
    }
    return pageTitles[location.pathname] || 'المغسلة الذكية';
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
