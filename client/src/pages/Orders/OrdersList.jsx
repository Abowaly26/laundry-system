import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // Dropdown & Calendar states
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showStartDateDropdown, setShowStartDateDropdown] = useState(false);
  const [showEndDateDropdown, setShowEndDateDropdown] = useState(false);

  const [viewStartDate, setViewStartDate] = useState(new Date());
  const [viewEndDate, setViewEndDate] = useState(new Date());

  const statusRef = useRef(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  const WEEKDAYS = ['أح', 'اث', 'ثلا', 'أر', 'خم', 'جم', 'سب'];

  const STATUS_OPTIONS = [
    { value: '', label: 'كل الحالات' },
    { value: 'pending', label: 'قيد الانتظار (جديد)' },
    { value: 'processing', label: 'قيد التنفيذ (غسيل/كي)' },
    { value: 'ready', label: 'جاهز للاستلام' },
    { value: 'delivered', label: 'تم التسليم' },
    { value: 'cancelled', label: 'ملغي' }
  ];

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setShowStatusDropdown(false);
      }
      if (startDateRef.current && !startDateRef.current.contains(event.target)) {
        setShowStartDateDropdown(false);
      }
      if (endDateRef.current && !endDateRef.current.contains(event.target)) {
        setShowEndDateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handlePrevMonthStartDate = () => {
    setViewStartDate(new Date(viewStartDate.getFullYear(), viewStartDate.getMonth() - 1, 1));
  };
  const handleNextMonthStartDate = () => {
    setViewStartDate(new Date(viewStartDate.getFullYear(), viewStartDate.getMonth() + 1, 1));
  };

  const handlePrevMonthEndDate = () => {
    setViewEndDate(new Date(viewEndDate.getFullYear(), viewEndDate.getMonth() - 1, 1));
  };
  const handleNextMonthEndDate = () => {
    setViewEndDate(new Date(viewEndDate.getFullYear(), viewEndDate.getMonth() + 1, 1));
  };

  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSelectStartDate = (date) => {
    setFilters(prev => ({ ...prev, startDate: formatLocalDate(date) }));
    setShowStartDateDropdown(false);
  };

  const handleSelectEndDate = (date) => {
    setFilters(prev => ({ ...prev, endDate: formatLocalDate(date) }));
    setShowEndDateDropdown(false);
  };

  const getDaysInMonthGrid = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();
    const daysGrid = [];
    
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      daysGrid.push({
        dayNum: prevTotalDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevTotalDays - i)
      });
    }
    
    for (let i = 1; i <= totalDays; i++) {
      daysGrid.push({
        dayNum: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    const remaining = 42 - daysGrid.length;
    for (let i = 1; i <= remaining; i++) {
      daysGrid.push({
        dayNum: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    return daysGrid;
  };

  const getFormattedDateLabel = (dateStr, fallback) => {
    if (!dateStr) return fallback;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? fallback : date.toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusLabel = (val) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === val);
    return option ? option.label : 'كل الحالات';
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

        <div className="filter-item table-select-container" ref={statusRef}>
          <button
            type="button"
            className="table-select-trigger"
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            {getStatusLabel(filters.status)}
          </button>
          {showStatusDropdown && (
            <div className="table-select-dropdown">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`table-select-item ${filters.status === opt.value ? 'selected' : ''}`}
                  onClick={() => {
                    setFilters(prev => ({ ...prev, status: opt.value }));
                    setShowStatusDropdown(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="filter-item date-range-picker">
          <div className="custom-date-select-container" ref={startDateRef}>
            <button
              type="button"
              className="date-select-trigger"
              onClick={() => setShowStartDateDropdown(!showStartDateDropdown)}
            >
              {getFormattedDateLabel(filters.startDate, 'من تاريخ...')}
            </button>
            {showStartDateDropdown && (
              <div className="date-select-dropdown">
                <div className="calendar-header">
                  <button type="button" className="btn-month-nav" onClick={handlePrevMonthStartDate}>
                    <ChevronRight size={16} />
                  </button>
                  <span className="month-year-label">
                    {viewStartDate.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}
                  </span>
                  <button type="button" className="btn-month-nav" onClick={handleNextMonthStartDate}>
                    <ChevronLeft size={16} />
                  </button>
                </div>
                <div className="calendar-grid-weekdays">
                  {WEEKDAYS.map(day => (
                    <div key={day} className="weekday-header">{day}</div>
                  ))}
                </div>
                <div className="calendar-grid-days">
                  {getDaysInMonthGrid(viewStartDate).map((cell, idx) => {
                    const cellDateStr = formatLocalDate(cell.date);
                    const isSelected = filters.startDate === cellDateStr;
                    const isToday = formatLocalDate(new Date()) === cellDateStr;
                    
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`calendar-day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                        onClick={() => handleSelectStartDate(cell.date)}
                      >
                        {cell.dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <span className="date-range-separator">إلى</span>

          <div className="custom-date-select-container" ref={endDateRef}>
            <button
              type="button"
              className="date-select-trigger"
              onClick={() => setShowEndDateDropdown(!showEndDateDropdown)}
            >
              {getFormattedDateLabel(filters.endDate, 'إلى تاريخ...')}
            </button>
            {showEndDateDropdown && (
              <div className="date-select-dropdown">
                <div className="calendar-header">
                  <button type="button" className="btn-month-nav" onClick={handlePrevMonthEndDate}>
                    <ChevronRight size={16} />
                  </button>
                  <span className="month-year-label">
                    {viewEndDate.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}
                  </span>
                  <button type="button" className="btn-month-nav" onClick={handleNextMonthEndDate}>
                    <ChevronLeft size={16} />
                  </button>
                </div>
                <div className="calendar-grid-weekdays">
                  {WEEKDAYS.map(day => (
                    <div key={day} className="weekday-header">{day}</div>
                  ))}
                </div>
                <div className="calendar-grid-days">
                  {getDaysInMonthGrid(viewEndDate).map((cell, idx) => {
                    const cellDateStr = formatLocalDate(cell.date);
                    const isSelected = filters.endDate === cellDateStr;
                    const isToday = formatLocalDate(new Date()) === cellDateStr;
                    
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`calendar-day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                        onClick={() => handleSelectEndDate(cell.date)}
                      >
                        {cell.dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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
