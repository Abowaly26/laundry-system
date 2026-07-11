import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet, CreditCard, TrendingUp, Download, Search } from 'lucide-react';
import { paymentsAPI, dashboardAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import { useSettings } from '../../context/SettingsContext';
import './Finance.css';

export default function Finance() {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const paymentsList = Array.isArray(payments) ? payments : [];

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
      // 1. تحميل قائمة الدفعات بالفلترة (تمرير معايير الباك اند date_from و date_to)
      const queryParams = {
        limit: 1000
      };
      if (filters.method) queryParams.method = filters.method;
      if (filters.startDate) queryParams.date_from = filters.startDate;
      if (filters.endDate) queryParams.date_to = filters.endDate;

      const paymentsRes = await paymentsAPI.getAll(queryParams);
      if (paymentsRes && paymentsRes.success) {
        setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
      } else {
        setPayments([]);
      }

      // 2. تحميل إحصائيات لوحة التحكم للماليات
      const statsRes = await dashboardAPI.getStats();
      if (statsRes && statsRes.success) {
        setFinanceStats({
          today_revenue: parseFloat(statsRes.todayRevenue || 0),
          pending_revenue: parseFloat(statsRes.total_remaining || 0),
          total_revenue: parseFloat(statsRes.total_revenue || 0)
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
    setSearchQuery('');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '-' : date.toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodLabel = (method) => {
    return method === 'cash' ? t('finance.methodCash') || 'نقدي (كاش)' : t('finance.methodCard') || 'إلكتروني (شبكة)';
  };

  const getPaymentTypeLabel = (type) => {
    if (type === 'deposit') return t('finance.typeDeposit') || 'دفعة مقدمة';
    if (type === 'balance') return t('finance.typeBalance') || 'متبقي الطلب';
    return t('finance.typeFull') || 'سداد كامل';
  };

  // تصفية إضافية بالبحث الفوري داخل المدفوعات المجلوبة
  const filteredPayments = paymentsList.filter(p => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    const idMatch = String(p?.id || '').includes(query);
    const orderMatch = String(p?.order_id || '').includes(query);
    const custNameMatch = (p?.customer_name || '').toLowerCase().includes(query);
    const custPhoneMatch = (p?.customer_phone || '').toLowerCase().includes(query);
    const employeeMatch = (p?.created_by_name || p?.user_name || '').toLowerCase().includes(query);
    const amountMatch = String(p?.amount || '').includes(query);
    return idMatch || orderMatch || custNameMatch || custPhoneMatch || employeeMatch || amountMatch;
  });

  // إجمالي المبالغ في قائمة الدفعات المصفاة الحالية
  const filteredTotal = filteredPayments.reduce((sum, p) => sum + (parseFloat(p?.amount || 0)), 0);

  const exportToCSV = () => {
    if (filteredPayments.length === 0) {
      showToast(t('finance.exportEmpty') || 'لا توجد عمليات تحصيل لتصديرها في الوقت الحالي', 'warning');
      return;
    }

    const headers = [
      t('finance.opId') || 'رقم العملية',
      t('finance.orderId') || 'رقم الطلب',
      t('finance.custName') || 'اسم العميل',
      `${t('finance.collectedAmount')} (${settings?.currency || 'ر.س'})`,
      t('finance.paymentMethod') || 'طريقة الدفع',
      t('finance.paymentType') || 'نوع الدفعة',
      t('finance.employee') || 'الموظف المسؤول',
      t('finance.dateTime') || 'التاريخ والوقت'
    ];

    const formatCSVField = (field) => {
      if (field === null || field === undefined) return '""';
      const stringField = String(field);
      return `"${stringField.replace(/"/g, '""')}"`;
    };

    const rows = filteredPayments.map(p => {
      const paymentId = `#${p?.id || '-'}`;
      const orderId = `#${p?.order_id || '-'}`;
      const customerName = p?.customer_name || t('orders.generalCustomer') || 'عميل عام';
      const amount = parseFloat(p?.amount || 0).toFixed(2);
      const method = getPaymentMethodLabel(p?.method);
      const type = getPaymentTypeLabel(p?.type);
      const userName = p?.created_by_name || p?.user_name || t('finance.receptionist') || 'موظف الاستقبال';
      const dateStr = formatDate(p?.created_at);

      return [
        formatCSVField(paymentId),
        formatCSVField(orderId),
        formatCSVField(customerName),
        formatCSVField(amount),
        formatCSVField(method),
        formatCSVField(type),
        formatCSVField(userName),
        formatCSVField(dateStr)
      ];
    });

    // إضافة صف الإجمالي في نهاية ملف الإكسل
    rows.push([
      formatCSVField(t('finance.totalCollected') || 'إجمالي المبالغ المحصلة (المصفاة)'),
      formatCSVField(''),
      formatCSVField(''),
      formatCSVField(`+${filteredTotal.toFixed(2)} ${settings?.currency || 'ر.س'}`),
      formatCSVField(''),
      formatCSVField(''),
      formatCSVField(''),
      formatCSVField('')
    ]);

    const csvContent = '\uFEFF' + [
      headers.map(h => formatCSVField(h)).join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `finance_payments_export_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t('finance.exportSuccess') || 'تم تصدير سجل المدفوعات والتحصيلات بنجاح إلى ملف إكسل (CSV) 📊', 'success');
  };

  return (
    <div className="page finance-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('finance.title') || 'الحسابات والتقارير المالية'}</h1>
          <p className="page-subtitle">{t('finance.subtitle') || 'متابعة التحصيلات اليومية، سجل المدفوعات والديون المتبقية'}</p>
        </div>
        <div className="flex gap-sm items-center">
          <Button
            variant="secondary"
            onClick={exportToCSV}
            disabled={!filteredPayments || filteredPayments.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={18} />
            {t('finance.exportCSVBtn') || 'تصدير ملف إكسل'}
          </Button>
        </div>
      </div>

      {/* كروت الإحصائيات المالية */}
      <div className="finance-stats-grid mb-md">
        <Card className="finance-stat-card">
          <div className="stat-icon-wrapper success">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">{t('finance.todayRevenue') || 'دخل اليوم (المحصل)'}</span>
            <h2 className="stat-value text-success">{financeStats.today_revenue.toFixed(2)} {settings?.currency || 'ر.س'}</h2>
          </div>
        </Card>

        <Card className="finance-stat-card">
          <div className="stat-icon-wrapper warning">
            <Wallet size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">{t('finance.pendingRevenue') || 'المبالغ المعلقة (ديون متبقية)'}</span>
            <h2 className="stat-value text-warning">{financeStats.pending_revenue.toFixed(2)} {settings?.currency || 'ر.س'}</h2>
          </div>
        </Card>

        <Card className="finance-stat-card">
          <div className="stat-icon-wrapper info">
            <CreditCard size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">{t('finance.totalRevenue') || 'إجمالي الدخل التاريخي'}</span>
            <h2 className="stat-value text-primary">{financeStats.total_revenue.toFixed(2)} {settings?.currency || 'ر.س'}</h2>
          </div>
        </Card>
      </div>

      {/* فلاتر التصفية والبحث الفوري */}
      <Card className="mb-md">
        <div className="finance-filters-grid">
          <div className="form-group" style={{ gridColumn: 'span 1' }}>
            <label className="form-label">{t('finance.quickSearch') || 'بحث سريع في التحصيلات'}</label>
            <div className="search-box" style={{ margin: 0 }}>
              <input
                type="text"
                className="form-input"
                placeholder={t('finance.searchPlaceholder') || 'رقم العملية، الطلب، العميل، أو الموظف...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={16} className="search-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('finance.paymentMethod') || 'طريقة الدفع'}</label>
            <select
              className="form-select"
              value={filters.method}
              onChange={(e) => setFilters({ ...filters, method: e.target.value })}
            >
              <option value="">{t('finance.allMethods') || 'كل الطرق'}</option>
              <option value="cash">{t('finance.methodCash') || 'نقدي (كاش)'}</option>
              <option value="electronic">{t('finance.methodCard') || 'إلكتروني (شبكة)'}</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('finance.startDate') || 'تاريخ البداية'}</label>
            <input
              type="date"
              className="form-input"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('finance.endDate') || 'تاريخ النهاية'}</label>
            <input
              type="date"
              className="form-input"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>

          <div className="flex items-end" style={{ paddingBottom: '16px' }}>
            <Button variant="ghost" className="text-secondary" onClick={handleResetFilters}>
              {t('finance.resetFilters') || 'إعادة تعيين'}
            </Button>
          </div>
        </div>
      </Card>

      {/* جدول الدفعات والتحصيلات */}
      <div className="filtered-total-summary mb-sm flex justify-between items-center">
        <span>{t('finance.filteredTotal') || 'إجمالي الدفعات المصفاة:'}</span>
        <strong className="text-primary" style={{ fontSize: '1.25rem' }}>{filteredTotal.toFixed(2)} {settings?.currency || 'ر.س'}</strong>
      </div>

      {loading ? (
        <div className="flex justify-center items-center" style={{ height: '200px' }}>
          <LoadingSpinner />
        </div>
      ) : filteredPayments.length === 0 ? (
        <EmptyState 
          title={t('finance.emptyStateTitle') || 'لا توجد عمليات تحصيل'} 
          message={t('finance.emptyStateMsg') || 'لم نجد أي حركات دفع مسجلة تطابق التصفية أو البحث المحدد.'}
        />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('finance.opId') || 'رقم العملية'}</th>
                <th>{t('finance.orderId') || 'رقم الطلب'}</th>
                <th>{t('finance.custName') || 'اسم العميل'}</th>
                <th>{t('finance.collectedAmount') || 'المبلغ المحصل'}</th>
                <th>{t('finance.paymentMethod') || 'طريقة الدفع'}</th>
                <th>{t('finance.paymentType') || 'نوع الدفعة'}</th>
                <th>{t('finance.employee') || 'الموظف المسؤول'}</th>
                <th>{t('finance.dateTime') || 'التاريخ والوقت'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p?.id}>
                  <td><strong>#{p?.id}</strong></td>
                  <td><a href={`/orders/${p?.order_id}`} className="text-primary font-semibold">#{p?.order_id}</a></td>
                  <td>{p?.customer_name || t('orders.generalCustomer') || 'عميل عام'}</td>
                  <td className="font-bold text-success">+{parseFloat(p?.amount || 0).toFixed(2)} {settings?.currency || 'ر.س'}</td>
                  <td>{p?.method === 'cash' ? t('finance.methodCash') || 'نقدي (كاش)' : t('finance.methodCard') || 'إلكتروني (شبكة)'}</td>
                  <td>
                    {p?.type === 'deposit' ? t('finance.typeDeposit') || 'دفعة مقدمة' : 
                     p?.type === 'balance' ? t('finance.typeBalance') || 'متبقي الطلب' : t('finance.typeFull') || 'سداد كامل'}
                  </td>
                  <td>{p?.created_by_name || p?.user_name || t('finance.receptionist') || 'موظف الاستقبال'}</td>
                  <td>{formatDate(p?.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
