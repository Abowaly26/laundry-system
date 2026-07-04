import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Loader,
  CheckCircle2,
  Package,
  Banknote,
  AlertTriangle,
  Download,
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
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [popularServices, setPopularServices] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ar-EG');
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

  const exportToCSV = () => {
    if (!stats?.recentOrders || stats.recentOrders.length === 0) return;
    
    const headers = ['رقم الطلب', 'العميل', 'عدد القطع', 'الحالة', 'الإجمالي (ر.س)', 'تاريخ الطلب'];
    
    const rows = stats.recentOrders.map(order => [
      order.id,
      order.customer?.name || '-',
      order.items?.length || 0,
      order.status === 'pending' ? 'قيد الانتظار' : order.status === 'processing' ? 'قيد المعالجة' : order.status === 'ready' ? 'جاهز للتسليم' : order.status === 'delivered' ? 'تم التسليم' : 'ملغي',
      order.totalAmount,
      formatDate(order.createdAt || order.created_at)
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
    labels: revenue.map((r) => {
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
        data: revenue.map((r) => r.total || r.amount || 0),
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
              عرض الكل
            </Link>
          </div>
        </div>
        <div className="table-container">
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
                    <td>{formatDate(order.createdAt || order.created_at)}</td>
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
