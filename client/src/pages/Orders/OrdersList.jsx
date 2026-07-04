import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, Eye } from 'lucide-react';
import { ordersAPI } from '../../services/api';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import './OrdersList.css';

export default function OrdersList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    startDate: '',
    endDate: ''
  });

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.getAll(filters);
      if (res.success) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [filters.status, filters.startDate, filters.endDate]); // إعادة التحميل عند تغيير الفلاتر المباشرة

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadOrders();
  };

  const handleResetFilters = () => {
    setFilters({
      status: '',
      search: '',
      startDate: '',
      endDate: ''
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="page orders-list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة الطلبات</h1>
          <p className="page-subtitle">استعراض وتصفية وتعديل طلبات الغسيل والتنظيف</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/orders/new')}>
          <Plus size={18} style={{ marginLeft: '8px' }} />
          تسجيل طلب جديد
        </Button>
      </div>

      {/* شريط الفلاتر والبحث */}
      <Card className="mb-md">
        <form onSubmit={handleSearchSubmit} className="filters-form">
          <div className="filters-grid">
            <div className="form-group">
              <label className="form-label">بحث سريع</label>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder="ابحث برقم الطلب، اسم العميل، الجوال..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
                <button type="submit" className="search-btn">
                  <Search size={18} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">حالة الطلب</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">كل الحالات</option>
                <option value="pending">قيد الانتظار (جديد)</option>
                <option value="processing">قيد التنفيذ (غسيل/كي)</option>
                <option value="ready">جاهز للاستلام</option>
                <option value="delivered">تم التسليم للعميل</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">من تاريخ</label>
              <input
                type="date"
                className="form-input"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">إلى تاريخ</label>
              <input
                type="date"
                className="form-input"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="filters-actions mt-sm flex justify-between">
            <Button variant="ghost" type="button" className="text-secondary" onClick={handleResetFilters}>
              إعادة تعيين الفلاتر
            </Button>
            <Button variant="secondary" type="submit">
              <Filter size={16} style={{ marginLeft: '6px' }} />
              تطبيق تصفية البحث
            </Button>
          </div>
        </form>
      </Card>

      {/* جدول عرض الطلبات */}
      {loading ? (
        <div className="flex justify-center items-center" style={{ height: '200px' }}>
          <LoadingSpinner />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState 
          title="لا توجد طلبات متطابقة" 
          message="لم نعثر على أي طلبات تطابق معايير البحث الحالية. يمكنك تسجيل طلب جديد."
        />
      ) : (
        <div className="table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>اسم العميل</th>
                <th>رقم الجوال</th>
                <th>تاريخ الطلب</th>
                <th>عدد القطع</th>
                <th>إجمالي المبلغ</th>
                <th>المتبقي</th>
                <th>الحالة</th>
                <th>تاريخ التسليم المتوقع</th>
                <th style={{ width: '80px', textAlign: 'center' }}>تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isOverdue = order.status !== 'delivered' && 
                                  order.status !== 'cancelled' && 
                                  order.expected_delivery_at && 
                                  new Date(order.expected_delivery_at) < new Date();

                return (
                  <tr 
                    key={order.id} 
                    className="clickable"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <td><strong>#{order.id}</strong></td>
                    <td>{order.customer_name || 'عميل عام'}</td>
                    <td>{order.customer_phone || '-'}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td className="text-center font-semibold">{order.items_count || 0}</td>
                    <td>{parseFloat(order.total_amount).toFixed(2)} ر.س</td>
                    <td className={parseFloat(order.remaining_amount) > 0 ? 'text-warning font-semibold' : 'text-success font-semibold'}>
                      {parseFloat(order.remaining_amount).toFixed(2)} ر.س
                    </td>
                    <td>
                      <StatusBadge status={order.status} type="order" />
                    </td>
                    <td className={isOverdue ? 'text-error font-semibold' : ''}>
                      {formatDate(order.expected_delivery_at)}
                      {isOverdue && <span className="overdue-tag"> (متأخر)</span>}
                    </td>
                    <td className="text-center">
                      <button className="btn-view-details">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
