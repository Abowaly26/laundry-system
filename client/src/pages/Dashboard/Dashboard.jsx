import { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList,
  Loader,
  CheckCircle2,
  Package,
  Banknote,
  AlertTriangle,
  Download,
  PlusCircle,
  UserPlus,
  Scan,
  Wallet,
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
  const { isSuperOwner, isWorker, laundryName } = useAuth();
  const navigate = useNavigate();

  if (isWorker) {
    return <Navigate to="/tracking" replace />;
  }

  const revenueList = Array.isArray(revenue) ? revenue : [];
  const popularServicesList = Array.isArray(popularServices) ? popularServices : [];
  const overdueList = Array.isArray(overdue) ? overdue : [];

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'ar-EG');
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsData, revenueData, servicesData, overdueData] = await Promise.allSettled([
        dashboardAPI.getStats(),
        dashboardAPI.getRevenue(),
        dashboardAPI.getPopularServices(),
        dashboardAPI.getOverdue(),
      ]);

      if (statsData.status === 'fulfilled') {
        const val = statsData.value;
        setStats(val && val.success ? val : null);
      }
      if (revenueData.status === 'fulfilled') {
        const val = revenueData.value;
        setRevenue(val && Array.isArray(val.data) ? val.data : (Array.isArray(val) ? val : []));
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

  const exportToCSV = () => {
    const recentOrdersList = Array.isArray(stats?.recentOrders) ? stats.recentOrders : [];
    if (recentOrdersList.length === 0) return;
    
    const headers = [t('dashboard.orderId'), t('dashboard.customer'), t('dashboard.items'), t('dashboard.status'), t('dashboard.amount'), t('dashboard.date')];
    
    const rows = recentOrdersList.map(order => [
      order?.id || order?.orderId,
      order?.customer?.name || order?.customerName || '-',
      order?.items?.length || 0,
      t(`status.${order?.status}`) || order?.status,
      order?.totalAmount || order?.total_amount || 0,
      formatDate(order?.createdAt || order?.created_at)
    ]);
    
    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `recent_orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      unit: 'ر.س',
    },
  ];

  const revenueChartData = {
    labels: revenueList.map((r) => {
      const d = r.date || r._id;
      if (!d) return '';
      try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return d;
        return date.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' });
      } catch (e) {
        return d;
      }
    }),
    datasets: [
      {
        label: 'الإيرادات',
        data: revenueList.map((r) => r.total || r.amount || 0),
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
        titleFont: { family: 'Cairo', size: 12 },
        bodyFont: { family: 'Cairo', size: 12 },
        padding: 10,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        callbacks: {
          label: function(context) {
            return ` الإيرادات: ${context.parsed.y} ر.س`;
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
          <button className="btn btn-outline" onClick={exportToCSV}>
            <Download size={18} />
            <span>{t('dashboard.exportReport')}</span>
          </button>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="quick-actions-bar">
        <button className="quick-action-btn primary" onClick={() => navigate('/orders/new')}>
          <div className="quick-action-icon"><PlusCircle size={20} /></div>
          <div className="quick-action-info">
            <span className="quick-action-title">{t('dashboard.newOrder')}</span>
            <span className="quick-action-subtitle">{t('dashboard.newOrderSub') || 'إنشاء فاتورة واستلام الملابس'}</span>
          </div>
        </button>
        <button className="quick-action-btn success" onClick={() => navigate('/customers')}>
          <div className="quick-action-icon"><UserPlus size={20} /></div>
          <div className="quick-action-info">
            <span className="quick-action-title">{t('dashboard.addCustomer')}</span>
            <span className="quick-action-subtitle">{t('dashboard.addCustomerSub') || 'إضافة وتعديل بيانات العملاء'}</span>
          </div>
        </button>
        <button className="quick-action-btn info" onClick={() => navigate('/tracking')}>
          <div className="quick-action-icon"><Scan size={20} /></div>
          <div className="quick-action-info">
            <span className="quick-action-title">{t('dashboard.scanQR')}</span>
            <span className="quick-action-subtitle">{t('dashboard.scanQRSub') || 'تتبع الملابس وتحديث الحالة'}</span>
          </div>
        </button>
        <button className="quick-action-btn warning" onClick={() => navigate('/finance')}>
          <div className="quick-action-icon"><Wallet size={20} /></div>
          <div className="quick-action-info">
            <span className="quick-action-title">{t('dashboard.viewRevenue')}</span>
            <span className="quick-action-subtitle">{t('dashboard.viewRevenueSub') || 'عرض التحصيلات والديون المعلقة'}</span>
          </div>
        </button>
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
          <div className="chart-card-header">
            <h3 className="chart-card-title">{t('dashboard.revenueOverTime') || 'إيرادات آخر 7 أيام'}</h3>
          </div>
          <div className="chart-card-body" style={{ height: 300 }}>
            {revenueList.length > 0 ? (
              <Line data={revenueChartData} options={revenueChartOptions} />
            ) : (
              <p className="text-center text-secondary" style={{ paddingTop: 100 }}>
                لا توجد بيانات
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
                لا توجد بيانات
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
            <div className="overdue-alert" key={order._id || order.id}>
              <AlertTriangle size={18} className="alert-icon" />
              <span>
                {t('dashboard.orderId')}{' '}
                <span
                  className="order-link"
                  onClick={() => navigate(`/orders/${order._id || order.id}`)}
                >
                  #{order.orderNumber || order.id}
                </span>
                {' - '}
                {order.customer?.name || t('dashboard.customer')}
                {' - متأخر'}
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
            <button 
              onClick={exportToCSV} 
              className="recent-orders-link flex items-center"
              style={{ cursor: 'pointer', background: 'none', border: 'none', font: 'inherit', display: 'flex', gap: '4px' }}
            >
              <Download size={16} />
              تصدير البيانات
            </button>
            <span style={{ color: 'var(--border)' }}>|</span>
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
                    <td>{order?.totalAmount || order?.total_amount || 0} ر.س</td>
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
