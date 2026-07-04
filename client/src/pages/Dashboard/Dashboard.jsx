import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { dashboardAPI } from '../../services/api';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [popularServices, setPopularServices] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (revenueData.status === 'fulfilled') setRevenue(revenueData.value.data || revenueData.value || []);
      if (servicesData.status === 'fulfilled') setPopularServices(servicesData.value.data || servicesData.value || []);
      if (overdueData.status === 'fulfilled') setOverdue(overdueData.value.data || overdueData.value || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const statCards = [
    {
      label: 'طلبات اليوم',
      value: stats?.todayOrders ?? 0,
      icon: ClipboardList,
      color: 'teal',
    },
    {
      label: 'قيد المعالجة',
      value: stats?.processingOrders ?? 0,
      icon: Loader,
      color: 'blue',
    },
    {
      label: 'جاهز للتسليم',
      value: stats?.readyOrders ?? 0,
      icon: CheckCircle2,
      color: 'green',
    },
    {
      label: 'تم التسليم',
      value: stats?.deliveredOrders ?? 0,
      icon: Package,
      color: 'amber',
    },
    {
      label: 'إيراد اليوم',
      value: stats?.todayRevenue ?? 0,
      icon: Banknote,
      color: 'teal',
      unit: 'ر.س',
    },
  ];

  const revenueChartData = {
    labels: revenue.map((r) => r.date || r._id || ''),
    datasets: [
      {
        label: 'الإيرادات',
        data: revenue.map((r) => r.total || r.amount || 0),
        backgroundColor: '#0d9488',
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Cairo' } },
      },
      y: {
        grid: { color: '#f0f0f0' },
        ticks: { font: { family: 'Cairo' } },
      },
    },
  };

  const serviceColors = ['#0d9488', '#d97706', '#0284c7', '#16a34a', '#dc2626', '#8b5cf6', '#ec4899'];

  const servicesChartData = {
    labels: popularServices.map((s) => s.name || s._id || ''),
    datasets: [
      {
        data: popularServices.map((s) => s.count || s.total || 0),
        backgroundColor: serviceColors.slice(0, popularServices.length),
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
            <h3 className="chart-card-title">إيرادات آخر 7 أيام</h3>
          </div>
          <div className="chart-card-body" style={{ height: 300 }}>
            {revenue.length > 0 ? (
              <Bar data={revenueChartData} options={revenueChartOptions} />
            ) : (
              <p className="text-center text-secondary" style={{ paddingTop: 100 }}>
                لا توجد بيانات
              </p>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">الخدمات الأكثر طلباً</h3>
          </div>
          <div className="chart-card-body" style={{ height: 300 }}>
            {popularServices.length > 0 ? (
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
      {overdue.length > 0 && (
        <div className="overdue-section">
          <h3 style={{ marginBottom: 'var(--space-sm)', fontSize: '0.95rem' }}>
            <AlertTriangle size={18} style={{ verticalAlign: 'middle', marginLeft: 6, color: 'var(--warning)' }} />
            طلبات متأخرة ({overdue.length})
          </h3>
          {overdue.slice(0, 5).map((order) => (
            <div className="overdue-alert" key={order._id || order.id}>
              <AlertTriangle size={18} className="alert-icon" />
              <span>
                الطلب{' '}
                <span
                  className="order-link"
                  onClick={() => navigate(`/orders/${order._id || order.id}`)}
                >
                  #{order.orderNumber || order.id}
                </span>
                {' - '}
                {order.customer?.name || 'عميل'}
                {' - متأخر'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recent Orders */}
      <div className="recent-orders">
        <div className="recent-orders-header">
          <h3 className="recent-orders-title">أحدث الطلبات</h3>
          <Link to="/orders" className="recent-orders-link">
            عرض الكل
          </Link>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>العميل</th>
                <th>القطع</th>
                <th>الحالة</th>
                <th>المبلغ</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentOrders?.length > 0 ? (
                stats.recentOrders.map((order) => (
                  <tr
                    key={order._id || order.id}
                    className="clickable"
                    onClick={() => navigate(`/orders/${order._id || order.id}`)}
                  >
                    <td>#{order.orderNumber || order.id}</td>
                    <td>{order.customer?.name || '-'}</td>
                    <td>{order.items?.length || 0}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>{order.totalAmount} ر.س</td>
                    <td>{new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
                    لا توجد طلبات حديثة
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
