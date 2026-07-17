import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList,
  Loader,
  CheckCircle2,
  Package,
  Banknote,
  AlertTriangle,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { dashboardAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [popularServices, setPopularServices] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revenuePeriod, setRevenuePeriod] = useState('7days');
  const [showRevenueDropdown, setShowRevenueDropdown] = useState(false);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const revenueDropdownRef = useRef(null);
  const { isSuperOwner, isWorker, laundryName } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const revenueList = Array.isArray(revenue) ? revenue : [];
  const popularServicesList = Array.isArray(popularServices) ? popularServices : [];
  const overdueList = Array.isArray(overdue) ? overdue : [];

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'ar-EG');
  };

  useEffect(() => {
    if (!isSuperOwner && !isWorker) {
      loadDashboard();
    }
  }, [isSuperOwner, isWorker]);

  useEffect(() => {
    if (!isSuperOwner && !isWorker) {
      loadRevenue();
    }
  }, [revenuePeriod, isSuperOwner, isWorker]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (revenueDropdownRef.current && !revenueDropdownRef.current.contains(event.target)) {
        setShowRevenueDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isSuperOwner) {
    return <Navigate to="/laundries" replace />;
  }

  if (isWorker) {
    return <Navigate to="/tracking" replace />;
  }

  const loadRevenue = async () => {
    try {
      setRevenueLoading(true);
      const res = await dashboardAPI.getRevenue({ period: revenuePeriod });
      if (res && res.success) {
        setRevenue(res.data || []);
      }
    } catch (err) {
      console.error('Revenue load error:', err);
    } finally {
      setRevenueLoading(false);
    }
  };

  const loadDashboard = async () => {
    try {
      const [statsData, servicesData, overdueData] = await Promise.allSettled([
        dashboardAPI.getStats(),
        dashboardAPI.getPopularServices(),
        dashboardAPI.getOverdue(),
      ]);

      if (statsData.status === 'fulfilled') {
        const val = statsData.value;
        setStats(val && val.success ? val : null);
      }
      if (servicesData.status === 'fulfilled') {
        const val = servicesData.value;
        setPopularServices(val && Array.isArray(val.data) ? val.data : (Array.isArray(val) ? val : []));
      }
      if (overdueData.status === 'fulfilled') {
        const val = overdueData.value;
        setOverdue(val && Array.isArray(val.data) ? val.data : (Array.isArray(val) ? val : []));
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };



  if (loading) return <LoadingSpinner />;

  const statCards = [
    {
      label: t('dashboard.todayOrders'),
      value: stats?.todayOrders ?? 0,
      icon: ClipboardList,
      color: 'teal',
    },
    {
      label: t('dashboard.processing'),
      value: stats?.processingOrders ?? 0,
      icon: Loader,
      color: 'blue',
    },
    {
      label: t('dashboard.ready'),
      value: stats?.readyOrders ?? 0,
      icon: CheckCircle2,
      color: 'green',
    },
    {
      label: t('dashboard.delivered'),
      value: stats?.deliveredOrders ?? 0,
      icon: Package,
      color: 'amber',
    },
    {
      label: t('dashboard.todayRevenue'),
      value: stats?.todayRevenue ?? 0,
      icon: Banknote,
      color: 'teal',
      unit: settings?.currency || t('settings.currency') || 'ر.س',
    },
  ];

  const processRevenueData = (data, period) => {
    const list = Array.isArray(data) ? data : [];
    const datesToPad = [];
    
    if (period === '7days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        datesToPad.push(d);
      }
    } else if (period === '14days') {
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        datesToPad.push(d);
      }
    } else if (period === 'this_month') {
      const today = new Date();
      const currentDay = today.getDate();
      for (let i = currentDay - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        datesToPad.push(d);
      }
    }

    return datesToPad.map(date => {
      const dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
      
      const found = list.find(item => {
        const itemDateStr = item.date || item._id;
        if (!itemDateStr) return false;
        try {
          const itemDate = new Date(itemDateStr);
          if (isNaN(itemDate.getTime())) return false;
          const iDateStr = itemDate.getFullYear() + '-' + String(itemDate.getMonth() + 1).padStart(2, '0') + '-' + String(itemDate.getDate()).padStart(2, '0');
          return iDateStr === dateStr;
        } catch (e) {
          return false;
        }
      });

      return {
        date: date,
        total: found ? (found.total || found.amount || 0) : 0
      };
    });
  };

  const finalRevenueList = processRevenueData(revenueList, revenuePeriod);

  const revenueChartData = {
    labels: finalRevenueList.map((r) => {
      return r.date.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'ar-EG', { weekday: 'short', day: 'numeric', month: 'short' });
    }),
    datasets: [
      {
        label: t('dashboard.revenueLabel') || 'الإيرادات',
        data: finalRevenueList.map((r) => r.total),
        borderColor: '#4F46E5',
        backgroundColor: 'rgba(79, 70, 229, 0.08)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#4F46E5',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        titleFont: { family: i18n.language === 'ar' ? 'Cairo' : 'Inter', size: 12 },
        bodyFont: { family: i18n.language === 'ar' ? 'Cairo' : 'Inter', size: 12 },
        padding: 10,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        callbacks: {
          label: function(context) {
            return ` ${t('dashboard.revenueLabel') || 'الإيرادات'}: ${context.parsed.y} ${settings?.currency || t('settings.currency') || 'ر.س'}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Cairo', size: 11 }, color: '#64748b' },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'Cairo', size: 11 }, color: '#64748b' },
        border: { dash: [4, 4] }
      },
    },
  };

  const serviceColors = ['#4F46E5', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899'];

  const servicesChartData = {
    labels: popularServicesList.map((s) => s.name || s._id || ''),
    datasets: [
      {
        data: popularServicesList.map((s) => s.count || s.total || 0),
        backgroundColor: serviceColors.slice(0, popularServicesList.length),
        borderWidth: 0,
      },
    ],
  };

  const servicesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { family: 'Cairo', size: 12 }, padding: 16 },
      },
    },
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">{formatDate(new Date())}</p>
        </div>
        <div className="header-actions">
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div className="stat-card" key={i}>
              <div className={`stat-icon ${stat.color}`}>
                <Icon size={22} />
              </div>
              <div className="stat-info">
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">
                  {stat.value}
                  {stat.unit && <span className="stat-unit"> {stat.unit}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-card-header flex justify-between items-center">
            <h3 className="chart-card-title">{t('dashboard.revenueTitle') || 'الإيرادات'}</h3>
            <div className="table-select-container" style={{ width: '130px' }} ref={revenueDropdownRef}>
              <button
                type="button"
                className="table-select-trigger"
                onClick={() => setShowRevenueDropdown(!showRevenueDropdown)}
              >
                {revenuePeriod === '7days' ? (t('dashboard.last7days') || 'آخر 7 أيام') : 
                 revenuePeriod === '14days' ? (t('dashboard.last2weeks') || 'آخر أسبوعين') : 
                 (t('dashboard.thisMonth') || 'هذا الشهر')}
              </button>
              {showRevenueDropdown && (
                <div className="table-select-dropdown">
                  {[
                    { value: '7days', label: t('dashboard.last7days') || 'آخر 7 أيام' },
                    { value: '14days', label: t('dashboard.last2weeks') || 'آخر أسبوعين' },
                    { value: 'this_month', label: t('dashboard.thisMonth') || 'هذا الشهر' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`table-select-item ${revenuePeriod === opt.value ? 'selected' : ''}`}
                      onClick={() => {
                        setRevenuePeriod(opt.value);
                        setShowRevenueDropdown(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="chart-card-body" style={{ height: 300, position: 'relative' }}>
            {revenueLoading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                <Loader className="spin" size={24} color="var(--primary)" />
              </div>
            )}
            {finalRevenueList.length > 0 ? (
              <Line data={revenueChartData} options={revenueChartOptions} />
            ) : (
              <p className="text-center text-secondary" style={{ paddingTop: 100 }}>
                {t('dashboard.noData') || 'لا توجد بيانات'}
              </p>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">{t('dashboard.popularServices') || 'الخدمات الأكثر طلباً'}</h3>
          </div>
          <div className="chart-card-body" style={{ height: 300 }}>
            {popularServicesList.length > 0 ? (
              <Doughnut data={servicesChartData} options={servicesChartOptions} />
            ) : (
              <p className="text-center text-secondary" style={{ paddingTop: 100 }}>
                {t('dashboard.noData') || 'لا توجد بيانات'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Alerts */}
      {overdueList.length > 0 && (
        <div className="overdue-section">
          <h3 style={{ marginBottom: 'var(--space-sm)', fontSize: '0.95rem' }}>
            <AlertTriangle size={18} style={{ verticalAlign: 'middle', marginLeft: 6, color: 'var(--warning)' }} />
            {t('dashboard.overdueOrders')} ({overdueList.length})
          </h3>
          {overdueList.slice(0, 5).map((order) => (
            <div 
              className="overdue-alert" 
              key={order._id || order.id}
              onClick={() => navigate(`/orders/${order._id || order.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <AlertTriangle size={18} className="alert-icon" />
              <span>
                {t('dashboard.orderId')}{' '}
                <span className="order-link">
                  #{order.orderNumber || order.id}
                </span>
                {' - '}
                {order.customer?.name || t('dashboard.customer')}
                {` - ${t('dashboard.overdueStatus') || 'متأخر'}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recent Orders */}
      <div className="recent-orders">
        <div className="recent-orders-header">
          <h3 className="recent-orders-title">{t('dashboard.recentOrders') || 'أحدث الطلبات'}</h3>
          <div className="flex gap-sm items-center">
            <Link to="/orders" className="recent-orders-link">
              {t('dashboard.viewAll') || 'عرض الكل'}
            </Link>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('dashboard.orderId') || 'رقم الطلب'}</th>
                <th>{t('dashboard.customer') || 'العميل'}</th>
                <th>{t('dashboard.items') || 'القطع'}</th>
                <th>{t('dashboard.status') || 'الحالة'}</th>
                <th>{t('dashboard.amount') || 'المبلغ'}</th>
                <th>{t('dashboard.date') || 'التاريخ'}</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentOrders?.length > 0 ? (
                stats.recentOrders.map((order) => (
                  <tr
                    key={order?._id || order?.id}
                    className="clickable"
                    onClick={() => navigate(`/orders/${order?._id || order?.id}`)}
                  >
                    <td>#{order?.orderNumber || order?.id}</td>
                    <td>{order?.customer?.name || '-'}</td>
                    <td>{order?.items?.length || 0}</td>
                    <td>
                      <StatusBadge status={order?.status} />
                    </td>
                    <td>{order?.totalAmount || order?.total_amount || 0} {settings?.currency || t('settings.currency') || 'ر.س'}</td>
                    <td>{formatDate(order?.createdAt || order?.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
                    {t('dashboard.noRecentOrders') || 'لا توجد طلبات حديثة'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
