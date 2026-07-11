import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Filter, Eye, ChevronLeft, ChevronRight, QrCode, Copy, Download } from 'lucide-react';
import { ordersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { QRCodeCanvas } from 'qrcode.react';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import Modal from '../../components/UI/Modal';
import './OrdersList.css';

export default function OrdersList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrModalOrder, setQrModalOrder] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [searchText, setSearchText] = useState('');

  const handleCopyText = (e, text) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    showToast(t('orders.copySuccess'), 'success');
  };

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
    { value: '', label: t('orders.statusFilter') },
    { value: 'pending', label: t('status.pending') },
    { value: 'processing', label: t('status.processing') },
    { value: 'ready', label: t('status.ready') },
    { value: 'delivered', label: t('status.delivered') },
    { value: 'cancelled', label: t('status.cancelled') }
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
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString(t('layout.language') === 'English' ? 'en-US' : 'ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getOrderStatusLabel = (status) => {
    return t(`status.${status}`) || status || '-';
  };

  const exportToCSV = () => {
    const ordersToExport = Array.isArray(orders) ? orders : [];
    if (ordersToExport.length === 0) {
      showToast(t('orders.noOrdersExport') || 'لا توجد طلبات متطابقة لتصديرها', 'warning');
      return;
    }

    const headers = [
      t('orders.orderId'),
      t('orders.customerName'),
      t('orders.phone'),
      t('orders.orderDate'),
      t('orders.itemsCount'),
      `${t('orders.totalAmount')} (${t('dashboard.currency', 'ر.س')})`,
      `${t('orders.remaining')} (${t('dashboard.currency', 'ر.س')})`,
      t('orders.status'),
      t('orders.deliveryDate')
    ];

    const formatCSVField = (field) => {
      if (field === null || field === undefined) return '""';
      const stringField = String(field);
      return `"${stringField.replace(/"/g, '""')}"`;
    };

    const rows = ordersToExport.map(order => {
      const orderCode = `ORD-${String(order?.id || '').padStart(4, '0')}`;
      const customerName = order?.customer_name || t('orders.generalCustomer');
      const phone = order?.customer_phone || '-';
      const orderDate = formatDate(order?.created_at);
      const itemsCount = order?.items_count || 0;
      const totalAmount = parseFloat(order?.total_amount || 0).toFixed(2);
      const remainingAmount = parseFloat(order?.remaining_amount || 0).toFixed(2);
      const statusLabel = getOrderStatusLabel(order?.status);
      const deliveryDate = formatDate(order?.expected_delivery_at);

      return [
        formatCSVField(orderCode),
        formatCSVField(customerName),
        formatCSVField(phone),
        formatCSVField(orderDate),
        formatCSVField(itemsCount),
        formatCSVField(totalAmount),
        formatCSVField(remainingAmount),
        formatCSVField(statusLabel),
        formatCSVField(deliveryDate)
      ];
    });

    const csvContent = '\uFEFF' + [
      headers.map(h => formatCSVField(h)).join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `orders_export_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t('orders.exportSuccess') || 'تم تصدير الطلبات بنجاح إلى ملف إكسل (CSV) 📊', 'success');
  };

  const hasActiveFilters = filters.status || filters.startDate || filters.endDate || searchText;

  return (
    <div className="page orders-list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('orders.title')}</h1>
          <p className="page-subtitle">{t('orders.subtitle') || 'استعراض وتصفية وتعديل طلبات الغسيل والتنظيف'}</p>
        </div>
        <div className="flex gap-sm items-center">
          <Button
            variant="secondary"
            onClick={exportToCSV}
            disabled={!orders || orders.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={18} />
            {t('orders.exportData')}
          </Button>
          <Button variant="primary" onClick={() => navigate('/orders/new')}>
            <Plus size={18} style={{ marginInlineStart: '8px' }} />
            {t('orders.newOrder')}
          </Button>
        </div>
      </div>

      {/* شريط الفلاتر والبحث المدمج الاحترافي */}
      <div className="orders-filters-toolbar mb-md">
        <div className="filter-item search-grow">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="form-input form-input-compact"
              placeholder={t('orders.searchPlaceholder') || 'ابحث برقم الطلب، اسم العميل، الجوال...'}
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
              {getFormattedDateLabel(filters.startDate, t('orders.startDate') || 'من تاريخ...')}
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
              {getFormattedDateLabel(filters.endDate, t('orders.endDate') || 'إلى تاريخ...')}
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
            {t('orders.reset')}
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
          title={t('orders.noOrders')} 
          message={t('orders.noOrdersMsg')}
        />
      ) : (
        <div className="orders-list-table-card">
          <div className="orders-list-table-header">
            <div className="orders-list-table-title">
              <span>{t('orders.orderList')}</span>
              <span className="orders-count-pill">{t('orders.orderCount', { count: orders.length })}</span>
            </div>
          </div>
          <div className="table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>{t('orders.orderId')}</th>
                  <th style={{ textAlign: 'center' }}>{t('orders.qrCode')}</th>
                  <th>{t('orders.customerName')}</th>
                  <th>{t('orders.phone')}</th>
                  <th>{t('orders.orderDate')}</th>
                  <th>{t('orders.itemsCount')}</th>
                  <th>{t('orders.totalAmount')}</th>
                  <th>{t('orders.remaining')}</th>
                  <th>{t('orders.status')}</th>
                  <th>{t('orders.deliveryDate')}</th>
                </tr>
              </thead>
              <tbody>
                 {(Array.isArray(orders) ? orders : []).map((order) => {
                  if (!order) return null;
                  const isOverdue = order.status !== 'delivered' && 
                                    order.status !== 'cancelled' && 
                                    order.expected_delivery_at && 
                                    new Date(order.expected_delivery_at) < new Date();
                  const orderCode = `ORD-${String(order.id).padStart(4, '0')}`;

                  return (
                    <tr 
                      key={order.id} 
                      className="clickable"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <td>
                        <div className="order-code-cell-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="order-id-badge">{orderCode}</span>
                          <button
                            type="button"
                            className="copy-btn-compact"
                            title={t('orders.copyCode')}
                            onClick={(e) => handleCopyText(e, orderCode)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '4px', color: '#64748b', transition: 'color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#0f172a'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="qr-action-btn"
                          title={t('orders.viewQR')}
                          onClick={() => setQrModalOrder(order)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', color: '#4f46e5' }}
                        >
                          <QrCode size={18} />
                        </button>
                      </td>
                      <td>{order.customer_name || t('orders.generalCustomer')}</td>
                      <td>{order.customer_phone || '-'}</td>
                      <td>{formatDate(order.created_at)}</td>
                      <td className="text-center font-semibold">{order.items_count || 0}</td>
                      <td>{parseFloat(order.total_amount || 0).toFixed(2)} {t('dashboard.currency', 'ر.س')}</td>
                      <td>
                        {(() => {
                          const remaining = parseFloat(order.remaining_amount || 0);
                          if (remaining > 0) {
                            return <span className="text-error font-semibold">{remaining.toFixed(2)} {t('dashboard.currency', 'ر.س')}</span>;
                          } else if (remaining < 0) {
                            return <span className="status-badge-credit">رصيد: {Math.abs(remaining).toFixed(2)} {t('dashboard.currency', 'ر.س')}</span>;
                          } else {
                            return <span className="status-badge-paid">{t('status.paid')}</span>;
                          }
                        })()}
                      </td>
                      <td>
                        <StatusBadge status={order.status} type="order" />
                      </td>
                      <td className={isOverdue ? 'text-error font-semibold' : ''}>
                        {formatDate(order.expected_delivery_at)}
                        {isOverdue && <span className="overdue-tag"> {t('orders.overdue')}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* مودال الـ QR للطلب */}
      <Modal
        isOpen={!!qrModalOrder}
        onClose={() => setQrModalOrder(null)}
        title={`${t('orders.qrModalTitle')} : ORD-${String(qrModalOrder?.id || '').padStart(4, '0')}`}
      >
        {qrModalOrder && (
          <div className="flex flex-col items-center justify-center p-md text-center">
            <QRCodeCanvas 
              value={`ORD-${String(qrModalOrder.id).padStart(4, '0')}`} 
              size={200}
              level="H"
              includeMargin={true}
            />
            <strong className="mt-md" style={{ fontSize: '1.25rem', color: '#1e293b' }}>
              ORD-{String(qrModalOrder.id).padStart(4, '0')}
            </strong>
            <span className="text-secondary mt-xs" style={{ display: 'block', marginTop: '6px' }}>
              {t('orders.customerName')}: {qrModalOrder.customer_name || t('orders.generalCustomer')}
            </span>
          </div>
        )}
      </Modal>
    </div>
  );
}
