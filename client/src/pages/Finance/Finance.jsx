import { useState, useEffect } from 'react';
import { Wallet, CreditCard, TrendingUp } from 'lucide-react';
import { paymentsAPI, dashboardAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import './Finance.css';

export default function Finance() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // إحصائيات مالية
  const [financeStats, setFinanceStats] = useState({
    today_revenue: 0,
    pending_revenue: 0,
    total_revenue: 0
  });

  // فلاتر البحث
  const [filters, setFilters] = useState({
    method: '',
    startDate: '',
    endDate: ''
  });

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      // 1. تحميل قائمة الدفعات بالفلترة
      const paymentsRes = await paymentsAPI.getAll(filters);
      if (paymentsRes.success) {
        setPayments(paymentsRes.data);
      }

      // 2. تحميل إحصائيات لوحة التحكم للماليات
      const statsRes = await dashboardAPI.getStats();
      if (statsRes.success) {
        setFinanceStats({
          today_revenue: statsRes.data.today_revenue || 0,
          pending_revenue: statsRes.data.total_remaining || 0,
          total_revenue: statsRes.data.total_revenue || 0
        });
      }
    } catch (err) {
      console.error('Error loading finance details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [filters.method, filters.startDate, filters.endDate]);

  const handleResetFilters = () => {
    setFilters({
      method: '',
      startDate: '',
      endDate: ''
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // إجمالي المبالغ في قائمة الدفعات المصفاة الحالية
  const filteredTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="page finance-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">الحسابات والتقارير المالية</h1>
          <p className="page-subtitle">متابعة التحصيلات اليومية، سجل المدفوعات والديون المتبقية</p>
        </div>
      </div>

      {/* كروت الإحصائيات المالية */}
      <div className="finance-stats-grid mb-md">
        <Card className="finance-stat-card">
          <div className="stat-icon-wrapper success">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">دخل اليوم (المحصل)</span>
            <h2 className="stat-value text-success">{financeStats.today_revenue.toFixed(2)} ر.س</h2>
          </div>
        </Card>

        <Card className="finance-stat-card">
          <div className="stat-icon-wrapper warning">
            <Wallet size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">المبالغ المعلقة (ديون متبقية)</span>
            <h2 className="stat-value text-warning">{financeStats.pending_revenue.toFixed(2)} ر.س</h2>
          </div>
        </Card>

        <Card className="finance-stat-card">
          <div className="stat-icon-wrapper info">
            <CreditCard size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">إجمالي الدخل التاريخي</span>
            <h2 className="stat-value text-primary">{financeStats.total_revenue.toFixed(2)} ر.س</h2>
          </div>
        </Card>
      </div>

      {/* فلاتر التصفية */}
      <Card className="mb-md">
        <div className="finance-filters-grid">
          <div className="form-group">
            <label className="form-label">طريقة الدفع</label>
            <select
              className="form-select"
              value={filters.method}
              onChange={(e) => setFilters({ ...filters, method: e.target.value })}
            >
              <option value="">كل الطرق</option>
              <option value="cash">نقدي (كاش)</option>
              <option value="electronic">إلكتروني (شبكة)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">تاريخ البداية</label>
            <input
              type="date"
              className="form-input"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">تاريخ النهاية</label>
            <input
              type="date"
              className="form-input"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>

          <div className="flex items-end" style={{ paddingBottom: '16px' }}>
            <Button variant="ghost" className="text-secondary" onClick={handleResetFilters}>
              إعادة تعيين
            </Button>
          </div>
        </div>
      </Card>

      {/* جدول الدفعات والتحصيلات */}
      <div className="filtered-total-summary mb-sm flex justify-between items-center">
        <span>إجمالي الدفعات المصفاة:</span>
        <strong className="text-primary" style={{ fontSize: '1.25rem' }}>{filteredTotal.toFixed(2)} ر.س</strong>
      </div>

      {loading ? (
        <div className="flex justify-center items-center" style={{ height: '200px' }}>
          <LoadingSpinner />
        </div>
      ) : payments.length === 0 ? (
        <EmptyState 
          title="لا توجد عمليات تحصيل" 
          message="لم نجد أي حركات دفع مسجلة تطابق التصفية المحددة."
        />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>رقم العملية</th>
                <th>رقم الطلب</th>
                <th>اسم العميل</th>
                <th>المبلغ المحصل</th>
                <th>طريقة الدفع</th>
                <th>نوع الدفعة</th>
                <th>الموظف المسؤول</th>
                <th>التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td><strong>#{p.id}</strong></td>
                  <td><a href={`/orders/${p.order_id}`} className="text-primary font-semibold">#{p.order_id}</a></td>
                  <td>{p.customer_name || 'عميل عام'}</td>
                  <td className="font-bold text-success">+{parseFloat(p.amount).toFixed(2)} ر.س</td>
                  <td>{p.method === 'cash' ? 'نقدي (كاش)' : 'إلكتروني (شبكة)'}</td>
                  <td>
                    {p.type === 'deposit' ? 'دفعة مقدمة' : 
                     p.type === 'balance' ? 'متبقي الطلب' : 'سداد كامل'}
                  </td>
                  <td>{p.user_name || 'موظف الاستقبال'}</td>
                  <td>{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
