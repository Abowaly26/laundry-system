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
  const [searchText, setSearchText] = useState('');

  // Sync search input state when filters are reset
  useEffect(() => {
    setSearchText(filters.search);
  }, [filters.search]);

  // Debounce search input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => {
        if (prev.search === searchText) return prev;
        return { ...prev, search: searchText };
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

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

  // Reload orders on any filter update
  useEffect(() => {
    loadOrders();
  }, [filters.status, filters.startDate, filters.endDate, filters.search]);

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

  const hasActiveFilters = filters.status || filters.startDate || filters.endDate || searchText;

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

      {/* شريط الفلاتر والبحث المدمج الاحترافي */}
      <div className="orders-filters-toolbar mb-md">
        <div className="filter-item search-grow">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="form-input form-input-compact"
              placeholder="ابحث برقم الطلب، اسم العميل، الجوال..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Search size={16} className="search-icon-inside" />
          </div>
        </div>

        <div className="filter-item">
          <select
            className="form-select form-select-compact"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">كل الحالات</option>
            <option value="pending">قيد الانتظار (جديد)</option>
            <option value="processing">قيد التنفيذ (غسيل/كي)</option>
            <option value="ready">جاهز للاستلام</option>
            <option value="delivered">تم التسليم</option>
            <option value="cancelled">ملغي</option>
          </select>
        </div>

        <div className="filter-item date-range-picker">
          <input
            type="date"
            className="form-input form-input-compact"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            title="من تاريخ"
          />
          <span className="date-range-separator">إلى</span>
          <input
            type="date"
            className="form-input form-input-compact"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            title="إلى تاريخ"
          />
        </div>

        {hasActiveFilters && (
          <button 
            type="button"
            className="btn-clear-filters text-error" 
            onClick={handleResetFilters}
          >
            إعادة تعيين
          </button>
        )}
      </div>

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
               {(Array.isArray(orders) ? orders : []).map((order) => {
                if (!order) return null;
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
                    <td><span className="order-id-badge">#{order.id}</span></td>
                    <td>{order.customer_name || 'عميل عام'}</td>
                    <td>{order.customer_phone || '-'}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td className="text-center font-semibold">{order.items_count || 0}</td>
                    <td>{parseFloat(order.total_amount || 0).toFixed(2)} ر.س</td>
                    <td>
                      {(() => {
                        const remaining = parseFloat(order.remaining_amount || 0);
                        if (remaining > 0) {
                          return <span className="text-error font-semibold">{remaining.toFixed(2)} ر.س</span>;
                        } else if (remaining < 0) {
                          return <span className="status-badge-credit">رصيد: {Math.abs(remaining).toFixed(2)} ر.س</span>;
                        } else {
                          return <span className="status-badge-paid">مدفوع</span>;
                        }
                      })()}
                    </td>
                    <td>
                      <StatusBadge status={order.status} type="order" />
                    </td>
                    <td className={isOverdue ? 'text-error font-semibold' : ''}>
                      {formatDate(order.expected_delivery_at)}
                      {isOverdue && <span className="overdue-tag"> (متأخر)</span>}
                    </td>
                    <td className="text-center">
                      <button 
                        type="button"
                        className="btn-view-details"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/orders/${order.id}`);
                        }}
                      >
                        <Eye size={16} />
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
