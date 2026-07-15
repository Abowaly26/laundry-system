import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Printer, Wallet, ArrowRight, CheckCircle2, User, Calendar, CreditCard, Clock, FileText, MessageSquare, Copy, QrCode, MapPin } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { ordersAPI, paymentsAPI, itemsAPI, customersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import PrintInvoice from '../../components/Print/PrintInvoice';
import PrintQRLabels from '../../components/Print/PrintQRLabels';
import StaticOrderMap from '../../components/Map/StaticOrderMap';
import LocationPickerModal from '../../components/Map/LocationPickerModal';
import './OrderDetails.css';

export default function OrderDetails() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // شاشات الإجراءات والمدفوعات
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentType, setPaymentType] = useState('balance');
  const [savingPayment, setSavingPayment] = useState(false);

  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const methodDropdownRef = useRef(null);
  const typeDropdownRef = useRef(null);

  // حالة لتسليم الطلب
  const [delivering, setDelivering] = useState(false);
  const [openItemStatusDropdownId, setOpenItemStatusDropdownId] = useState(null);
  const [qrModalItem, setQrModalItem] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showViewMapModal, setShowViewMapModal] = useState(false);

  const ITEM_STATUS_OPTIONS = [
    { value: 'pending', label: t('status.pending') || 'قيد الانتظار' },
    { value: 'processing', label: t('status.processing') || 'قيد التنفيذ' },
    { value: 'ready', label: t('status.ready') || 'جاهز للاستلام' },
    { value: 'delivered', label: t('status.delivered') || 'تم التسليم' }
  ];

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.getById(id);
      if (res.success) {
        setOrder(res.data);
        setPaymentAmount(res.data.remaining_amount || 0);
      } else {
        showToast(t('orderDetails.notFound') || 'لم يتم العثور على الطلب', 'error');
        navigate('/orders');
      }
    } catch (err) {
      console.error(err);
      showToast(t('orderDetails.loadError') || 'خطأ في تحميل تفاصيل الطلب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    showToast(t('orders.copySuccess') || 'تم نسخ كود القطعة بنجاح! 📋', 'success');
  };

  useEffect(() => {
    loadOrderDetails();
  }, [id]);

  const printOrder = (type = 'invoice') => {
    const cleanup = () => {
      document.body.classList.remove('print-invoice-only', 'print-labels-only');
      window.removeEventListener('afterprint', cleanup);
    };

    if (type === 'invoice') {
      document.body.classList.add('print-invoice-only');
    } else if (type === 'labels') {
      document.body.classList.add('print-labels-only');
    }
    
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1000);
  };

  const handlePrintInvoice = () => {
    printOrder('invoice');
  };

  const handlePrintLabels = () => {
    printOrder('labels');
  };

  // تسجيل دفعة مالية جديدة
  const handleSavePayment = async (e) => {
    e.preventDefault();
    const amountVal = parseFloat(paymentAmount) || 0;
    if (amountVal <= 0) {
      showToast(t('orderDetails.invalidAmount') || 'الرجاء إدخال مبلغ صحيح', 'warning');
      return;
    }
    if (amountVal > order.remaining_amount) {
      showToast(t('orderDetails.amountTooLarge') || 'المبلغ المدفوع أكبر من المبلغ المتبقي على الطلب', 'warning');
      return;
    }

    setSavingPayment(true);
    try {
      const res = await paymentsAPI.create({
        order_id: parseInt(id),
        amount: amountVal,
        method: paymentMethod,
        type: paymentType
      });

      if (res.success) {
        setShowPaymentModal(false);
        showToast(t('orderDetails.paymentSuccess') || 'تم تسجيل الدفعة بنجاح! 💸', 'success');
        loadOrderDetails();
      } else {
        showToast(res.message || t('orderDetails.paymentFail') || 'فشل في حفظ الدفعة', 'error');
      }
    } catch (err) {
      showToast(err.message || t('orderDetails.serverError') || 'خطأ في الاتصال بالخادم', 'error');
    } finally {
      setSavingPayment(false);
    }
  };

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.table-select-container')) {
        setOpenItemStatusDropdownId(null);
      }
      if (methodDropdownRef.current && !methodDropdownRef.current.contains(event.target)) {
        setShowMethodDropdown(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
        setShowTypeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // تحديث حالة القطعة إلى حالة معينة
  const handleUpdateItemStatus = async (itemId, newStatus) => {
    try {
      const res = await itemsAPI.updateStatus(itemId, newStatus);
      if (res.success) {
        showToast(t('orderDetails.statusUpdateSuccess') || 'تم تحديث حالة القطعة بنجاح!', 'success');
        loadOrderDetails();
      } else {
        showToast(res.message || t('orderDetails.statusUpdateFail') || 'فشل في تحديث حالة القطعة', 'error');
      }
    } catch (err) {
      showToast(err.message || t('orderDetails.updateError') || 'خطأ أثناء التحديث', 'error');
    } finally {
      setOpenItemStatusDropdownId(null);
    }
  };

  // ترقية حالة القطعة الفردية
  const handleAdvanceItemStatus = async (itemId) => {
    try {
      const res = await itemsAPI.advanceStatus(itemId);
      if (res.success) {
        showToast(t('orderDetails.statusUpdateSuccess') || 'تم تحديث حالة القطعة بنجاح!', 'success');
        loadOrderDetails();
      } else {
        showToast(res.message || t('orderDetails.statusUpdateFail') || 'فشل في تحديث حالة القطعة', 'error');
      }
    } catch (err) {
      showToast(err.message || t('orderDetails.updateError') || 'خطأ أثناء التحديث', 'error');
    }
  };

  // تسليم الطلب كاملاً للعميل
  const handleDeliverOrder = async () => {
    // التأكد من أن كل القطع جاهزة
    const allReady = order.items.every(item => item.status === 'ready' || item.status === 'delivered');
    if (!allReady) {
      if (!window.confirm(t('orderDetails.confirmDeliverIncomplete') || 'تنبيه: بعض القطع ليست جاهزة بعد. هل تريد المتابعة وتسليم الطلب بأكمله؟')) {
        return;
      }
    }

    // إذا كان هناك متبقي مالي، يجب دفعه أولاً أو تأكيد ذلك يدوياً
    if (order.remaining_amount > 0) {
      if (!window.confirm(t('orderDetails.confirmDeliverUnpaid', { remaining: order.remaining_amount, currency: settings.currency }) || `يوجد مبلغ متبقي (${order.remaining_amount} ${settings.currency}). هل تريد تحصيل المبلغ وتسليم الطلب الآن؟`)) {
        setShowPaymentModal(true);
        setPaymentType('balance');
        setPaymentAmount(order.remaining_amount);
        return;
      }
      
      // تحصيل تلقائي متبقي الطلب ككاش
      try {
        setDelivering(true);
        await paymentsAPI.create({
          order_id: parseInt(id),
          amount: order.remaining_amount,
          method: 'cash',
          type: 'balance'
        });
      } catch (err) {
        showToast((t('orderDetails.errorRemainingPayment') || 'حدث خطأ أثناء تسجيل الدفعة المتبقية: ') + err.message, 'error');
        setDelivering(false);
        return;
      }
    }

    try {
      setDelivering(true);
      const res = await ordersAPI.update(id, { status: 'delivered' });
      if (res.success) {
        showToast(t('orderDetails.deliverSuccess') || 'تم تسليم الطلب وإغلاقه بنجاح! ✓', 'success');
        loadOrderDetails();
      } else {
        showToast(res.message || t('orderDetails.deliverFail') || 'فشل في تحديث حالة الطلب', 'error');
      }
    } catch (err) {
      showToast(err.message || t('orderDetails.deliverError') || 'خطأ أثناء تحديث الطلب', 'error');
    } finally {
      setDelivering(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!order) return;
    const customerName = order.customer_name || order.customer?.name || t('orders.generalCustomer') || 'عميل';
    const customerPhone = order.customer_phone || order.customer?.phone || '';
    const orderId = order.id;
    const itemsCount = order.items?.length || 0;
    const totalAmount = parseFloat(order.total_amount).toFixed(2);
    const remainingAmount = parseFloat(order.remaining_amount).toFixed(2);
    const deliveryDate = formatDate(order.expected_delivery_at);
    const trackingLink = `${window.location.origin}/portal?phone=${customerPhone}&id=${orderId}`;

    let text = settings.whatsappTemplate || '';
    text = text
      .replace(/{customer_name}/g, customerName)
      .replace(/{order_id}/g, orderId)
      .replace(/{items_count}/g, itemsCount)
      .replace(/{total_amount}/g, totalAmount)
      .replace(/{remaining_amount}/g, remainingAmount)
      .replace(/{currency}/g, settings.currency)
      .replace(/{delivery_date}/g, deliveryDate)
      .replace(/{tracking_link}/g, trackingLink);

    const encodedText = encodeURIComponent(text);
    
    // Smart International Phone Formatting
    const arabCodes = ['966', '20', '971', '965', '968', '973', '974', '962', '961', '963', '964', '967', '218', '216', '213', '212', '222', '249', '252', '253', '269'];
    let sanitizedPhone = customerPhone.replace(/\D/g, '');
    
    if (sanitizedPhone.startsWith('00')) {
      sanitizedPhone = sanitizedPhone.substring(2);
    }
    
    let hasCountryCode = false;
    for (let code of arabCodes) {
      if (sanitizedPhone.startsWith(code) && sanitizedPhone.length >= code.length + 7) {
        hasCountryCode = true;
        break;
      }
    }

    if (!hasCountryCode) {
      if (sanitizedPhone.startsWith('01') && sanitizedPhone.length === 11) {
        sanitizedPhone = '20' + sanitizedPhone.substring(1); // Egypt
      } else if (sanitizedPhone.startsWith('1') && sanitizedPhone.length === 10) {
        sanitizedPhone = '20' + sanitizedPhone; // Egypt without 0
      } else if (/^[569]\d{7}$/.test(sanitizedPhone)) {
        sanitizedPhone = '965' + sanitizedPhone; // Kuwait
      } else if (/^[36]\d{7}$/.test(sanitizedPhone)) {
        sanitizedPhone = '973' + sanitizedPhone; // Bahrain
      } else if (/^[3567]\d{7}$/.test(sanitizedPhone)) {
        sanitizedPhone = '974' + sanitizedPhone; // Qatar
      } else if (sanitizedPhone.startsWith('05')) {
        sanitizedPhone = (settings.defaultCountryCode || '966') + sanitizedPhone.substring(1); // Saudi/UAE
      } else if (sanitizedPhone.startsWith('5') && sanitizedPhone.length === 9) {
        sanitizedPhone = (settings.defaultCountryCode || '966') + sanitizedPhone; // Saudi without 0
      } else if (sanitizedPhone.startsWith('0')) {
        sanitizedPhone = (settings.defaultCountryCode || '966') + sanitizedPhone.substring(1); // Fallback
      } else {
        sanitizedPhone = (settings.defaultCountryCode || '966') + sanitizedPhone; // Absolute fallback
      }
    }
    
    window.open(`https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodedText}`, '_blank');
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

  const getItemTypeAr = (type) => {
    const mapping = {
      shirt: 'قميص / تيشرت',
      pants: 'بنطلون / جينز',
      thobe: 'ثوب',
      dress: 'فستان',
      suit: 'بدلة كاملة',
      jacket: 'جاكيت / معطف',
      blanket: 'بطانية',
      carpet: 'سجادة',
      other: 'أخرى'
    };
    return mapping[type] || type;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ height: '300px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="page order-details-page">
      {/* رأس الصفحة */}
      <div className="page-header no-print">
        <div className="flex-col">
          <div className="flex gap-sm items-center">
            <h1 className="page-title" style={{ margin: 0 }}>{t('orders.orderDetailsTitle', { id: order.id }) || `تفاصيل الطلب #${order.id}`}</h1>
            <StatusBadge status={order.status} type="order" />
          </div>
          <p className="page-subtitle">{t('orders.orderDetailsSubtitle') || 'تتبع القطع، معالجة الدفعات، وإجراءات التسليم'}</p>
        </div>
        <div className="flex gap-sm items-center" style={{ flexWrap: 'wrap', justifyContent: 'flex-start', marginTop: '10px' }}>
          <Button variant="secondary" onClick={() => navigate('/orders')}>
            <ArrowRight size={16} style={{ marginLeft: '6px' }} />
            {t('orders.backToOrders') || 'الرجوع للطلبات'}
          </Button>
          <Button variant="primary" onClick={handlePrintInvoice}>
            <Printer size={16} style={{ marginLeft: '6px' }} />
            {t('orders.printInvoice') || 'طباعة الفاتورة'}
          </Button>
          <Button variant="secondary" onClick={handlePrintLabels}>
            <FileText size={16} style={{ marginLeft: '6px' }} />
            {t('orders.printLabels') || 'طباعة الملصقات'}
          </Button>
          <Button variant="success" onClick={handleShareWhatsApp}>
            <MessageSquare size={16} style={{ marginLeft: '6px' }} />
            {t('orders.shareWhatsApp') || 'مشاركة واتساب'}
          </Button>
        </div>
      </div>

      {/* تفاصيل الطلب الأساسية */}
      <div className="order-details-grid">
        {/* تفاصيل العميل والماليات */}
        <div className="details-sidebar no-print">
          <Card title={t('orders.customerInfo') || 'معلومات العميل'}>
            <div className="detail-item">
              <div className="detail-item-left">
                <User size={16} className="detail-icon" />
                <span className="detail-label">{t('orders.name') || 'الاسم:'}</span>
              </div>
              <span className="detail-value">{order.customer_name || order.customer?.name || t('orders.generalCustomer') || 'عميل عام'}</span>
            </div>
            <div className="detail-item">
              <div className="detail-item-left">
                <CreditCard size={16} className="detail-icon" />
                <span className="detail-label">{t('orders.phoneLabel') || 'رقم الهاتف:'}</span>
              </div>
              <span className="detail-value">{order.customer_phone || order.customer?.phone || '-'}</span>
            </div>
            <div className="detail-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem', width: '100%' }}>
              <div className="detail-item-left" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} className="detail-icon" style={{ color: 'var(--primary)' }} />
                  <span className="detail-label" style={{ fontWeight: '600' }}>{t('orders.addressLabel') || 'عنوان وموقع التوصيل:'}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-primary flex items-center gap-xs"
                  style={{ padding: '2px 8px', fontSize: '0.8rem', height: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                  onClick={() => setShowMapModal(true)}
                >
                  🗺️ {((order.delivery_lat && order.delivery_lng) || (order.customer_lat && order.customer_lng)) ? 'تعديل الموقع' : 'تحديد الموقع'}
                </Button>
              </div>
              <span className="detail-value" style={{ width: '100%', fontSize: '0.9rem', color: 'var(--text-main, #1e293b)', background: 'var(--bg-body, #f8fafc)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', whiteSpace: 'normal', wordBreak: 'break-word', display: 'block' }}>
                {order.delivery_address || order.customer_address || order.customer?.address || 'لم يتم تحديد عنوان أو موقع توصيل بعد'}
              </span>
            </div>

            {/* خريطة التوصيل inline - قابلة للضغط للتكبير */}
            {((order.delivery_lat && order.delivery_lng) || (order.customer_lat && order.customer_lng)) ? (
              !showViewMapModal ? (
                <StaticOrderMap
                  lat={order.delivery_lat || order.customer_lat}
                  lng={order.delivery_lng || order.customer_lng}
                  address={order.delivery_address || order.customer_address || ''}
                  height="230px"
                  onClick={() => setShowViewMapModal(true)}
                />
              ) : (
                <div style={{ height: '230px', background: 'var(--bg-body, #f8fafc)', border: '2px solid var(--border-color, #e2e8f0)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifycontent: 'center', color: 'var(--text-muted)' }}>
                  📍 جاري عرض الخريطة المكبرة...
                </div>
              )
            ) : (
              <div 
                className="mt-sm p-md text-center rounded-lg" 
                style={{ 
                  background: 'var(--bg-body, #f8fafc)', 
                  border: '2px dashed var(--border-color, #e2e8f0)',
                  color: 'var(--text-muted, #64748b)',
                  fontSize: '0.82rem',
                  lineHeight: '1.4',
                  width: '100%'
                }}
              >
                📍 لم يتم تحديد إحداثيات الموقع على الخريطة التفاعلية للمندوب. اضغط على "تحديد الموقع" لتحديدها وتسهيل التوصيل.
              </div>
            )}
          </Card>

          <Card title={t('orders.financialSummary') || 'الملخص المالي'} className="mt-md">
            <div className="summary-finance-rows">
              <div className="fin-row">
                <span>{t('orders.total') || 'الإجمالي:'}</span>
                <span style={{ fontWeight: 'bold' }}>{parseFloat(order.total_amount).toFixed(2)} {settings.currency}</span>
              </div>
              <div className="fin-row" style={{ color: 'var(--success)' }}>
                <span>{t('orders.paid') || 'المدفوع:'}</span>
                <span style={{ fontWeight: 'bold' }}>{parseFloat(order.paid_amount).toFixed(2)} {settings.currency}</span>
              </div>
              <div className={`fin-row ${order.remaining_amount > 0 ? 'text-warning' : 'text-success'}`}>
                <span>{t('orders.remaining') || 'المتبقي:'}</span>
                <span style={{ fontWeight: 'bold' }}>{parseFloat(order.remaining_amount).toFixed(2)} {settings.currency}</span>
              </div>
            </div>

            {order.remaining_amount > 0 && (
              <Button 
                variant="primary" 
                className="w-full mt-md" 
                onClick={() => {
                  setPaymentType('balance');
                  setPaymentAmount(order.remaining_amount);
                  setShowPaymentModal(true);
                }}
              >
                <Wallet size={16} style={{ marginLeft: '6px' }} />
                {t('orders.recordNewPayment') || 'تسجيل دفعة جديدة'}
              </Button>
            )}

            {order.status !== 'delivered' && order.status !== 'cancelled' && parseFloat(order.remaining_amount) <= 0 && (
              <Button 
                variant="success" 
                className="w-full mt-sm"
                onClick={handleDeliverOrder}
                disabled={delivering}
              >
                <CheckCircle2 size={16} style={{ marginLeft: '6px' }} />
                {delivering ? t('orders.delivering') || 'جاري التسليم...' : t('orders.deliverOrder') || 'تسليم الطلب للعميل'}
              </Button>
            )}
          </Card>

          <Card title={t('orders.dates') || 'مواعيد وتواريخ'} className="mt-md">
            <div className="detail-item">
              <div className="detail-item-left">
                <Calendar size={16} className="detail-icon" />
                <span className="detail-label">{t('orders.receiveDate') || 'تاريخ الاستلام:'}</span>
              </div>
              <span className="detail-value">{formatDate(order.created_at)}</span>
            </div>
            <div className="detail-item">
              <div className="detail-item-left">
                <Clock size={16} className="detail-icon" />
                <span className="detail-label">{t('orders.expectedDelivery') || 'موعد التسليم:'}</span>
              </div>
              <span className="detail-value">{formatDate(order.expected_delivery_at)}</span>
            </div>
            {order.delivered_at && (
              <div className="detail-item">
                <div className="detail-item-left">
                  <CheckCircle2 size={16} className="detail-icon" />
                  <span className="detail-label">{t('orders.actualDelivery') || 'تاريخ التسليم الفعلي:'}</span>
                </div>
                <span className="detail-value">{formatDate(order.delivered_at)}</span>
              </div>
            )}
            {order.notes && (
              <div className="mt-sm pt-sm" style={{ borderTop: '1px solid var(--border)' }}>
                <strong>{t('orders.notes') || 'ملاحظات:'}</strong>
                <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>{order.notes}</p>
              </div>
            )}
          </Card>
        </div>

        {/* جدول تتبع القطع وسجل المدفوعات */}
        <div className="details-main no-print">
          <Card title={t('orders.includedItems', { count: order.items?.length || 0 }) || `القطع المشمولة في الطلب (${order.items?.length || 0} قطع)`}>
            <div className="table-container" style={openItemStatusDropdownId ? { paddingBottom: '180px', transition: 'padding-bottom 0.15s ease' } : { transition: 'padding-bottom 0.15s ease' }}>
              <table className="items-tracking-table">
                <thead>
                  <tr>
                    <th>{t('orders.itemId') || 'كود القطعة'}</th>
                    <th style={{ textAlign: 'center' }}>{t('orders.qrCode') || 'رمز QR'}</th>
                    <th>{t('orders.itemType') || 'نوع القطعة'}</th>
                    <th>{t('orders.requiredService') || 'الخدمة المطلوبة'}</th>
                    <th>{t('orders.itemNotes') || 'ملاحظات'}</th>
                    <th>{t('orders.price') || 'السعر'}</th>
                    <th>{t('orders.itemStatus') || 'حالة القطعة'}</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>{t('orders.updateStatus') || 'تحديث الحالة'}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="qr-code-cell-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong>{item.qr_code}</strong>
                          <button
                            type="button"
                            className="qr-action-btn"
                            title="نسخ الكود"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                            onClick={() => handleCopyText(item.qr_code)}
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="qr-action-btn"
                          title={t('orders.viewQR') || 'عرض الـ QR'}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '4px', display: 'inline-flex', alignItems: 'center', transition: 'transform 0.2s', margin: '0 auto' }}
                          onClick={() => setQrModalItem(item)}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <QrCode size={20} />
                        </button>
                      </td>
                      <td>{getItemTypeAr(item.item_type)}{item.size_name ? <span style={{ color: 'var(--text-secondary)', fontSize: '0.85em', marginRight: '4px' }}> ({item.size_name})</span> : ''}</td>
                      <td>{item.service_name_ar || item.service?.name_ar}</td>
                      <td>{item.notes || '-'}</td>
                      <td>{parseFloat(item.price).toFixed(2)} {settings.currency}</td>
                      <td>
                        <StatusBadge status={item.status} type="item" />
                      </td>
                      <td className="text-center">
                        <div className="table-select-container">
                          <button
                            type="button"
                            className="table-select-trigger"
                            style={{ height: '32px', fontSize: '0.8rem', padding: '4px 12px', minWidth: '120px', margin: '0 auto' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenItemStatusDropdownId(openItemStatusDropdownId === item.id ? null : item.id);
                            }}
                          >
                            {ITEM_STATUS_OPTIONS.find(opt => opt.value === item.status)?.label || 'تحديث...'}
                          </button>
                          {openItemStatusDropdownId === item.id && (
                            <div className="table-select-dropdown" style={{ right: 0, left: 'auto', minWidth: '130px' }}>
                              {ITEM_STATUS_OPTIONS.map((opt) => {
                                const isDisabled = opt.value === 'delivered' && parseFloat(order.remaining_amount) > 0;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    className={`table-select-item ${item.status === opt.value ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                    onClick={() => !isDisabled && handleUpdateItemStatus(item.id, opt.value)}
                                    disabled={isDisabled}
                                    style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed', color: 'var(--text-muted)' } : {}}
                                    title={isDisabled ? 'لا يمكن تسليم القطعة قبل سداد المبلغ المتبقي' : ''}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* سجل الدفعات المستلمة */}
          <Card title={t('orders.paymentHistory') || 'سجل الدفعات والتحصيل'} className="mt-md">
            {order.payments && order.payments.length === 0 ? (
              <p className="text-secondary" style={{ fontSize: '0.9rem' }}>{t('orders.noPayments') || 'لا توجد مدفوعات مسجلة بعد لهذا الطلب.'}</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>{t('orders.paymentNum') || 'رقم الدفعة'}</th>
                      <th>{t('orders.amount') || 'المبلغ'}</th>
                      <th>{t('orders.paymentMethod') || 'طريقة الدفع'}</th>
                      <th>{t('orders.paymentType') || 'نوع الدفعة'}</th>
                      <th>{t('orders.dateTime') || 'التاريخ والوقت'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.payments?.map((payment) => (
                      <tr key={payment.id}>
                        <td>#{payment.id}</td>
                        <td className="font-bold text-success">{parseFloat(payment.amount).toFixed(2)} {settings.currency}</td>
                        <td>{payment.method === 'cash' ? t('orders.cash') || 'نقدي' : t('orders.electronic') || 'إلكتروني'}</td>
                        <td>
                          {payment.type === 'deposit' ? t('orders.deposit') || 'دفعة مقدمة' : 
                           payment.type === 'balance' ? t('orders.balance') || 'متبقي الطلب' : t('orders.fullPayment') || 'سداد كامل'}
                        </td>
                        <td>{formatDate(payment.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* مودال تسجيل دفعة جديدة */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={t('orders.paymentModalTitle') || 'تسجيل دفعة مالية جديدة'}
      >
        <form onSubmit={handleSavePayment}>
          <div className="form-group">
            <label className="form-label">{t('orders.amountToPay') || 'المبلغ المراد سداده'} ({settings.currency})</label>
            <input
              type="number"
              className="form-input"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
              onFocus={(e) => {
                if (parseFloat(e.target.value) === 0 || paymentAmount === 0) {
                  setPaymentAmount('');
                } else {
                  e.target.select();
                }
              }}
              max={order?.remaining_amount}
              min="0.01"
              step="any"
              placeholder="0"
              required
            />
            <span className="help-text">{t('orders.maxRemaining') || 'الحد الأقصى المتبقي:'} {order?.remaining_amount} {settings.currency}</span>
          </div>

          <div className="form-group">
            <label className="form-label">{t('orders.paymentMethod') || 'طريقة الدفع'}</label>
            <div className="table-select-container" ref={methodDropdownRef} style={{ width: '100%' }}>
              <button
                type="button"
                className="table-select-trigger"
                style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.95rem',
                  width: '100%',
                  height: '46px',
                  borderRadius: '10px',
                  background: 'var(--bg-white)',
                  fontWeight: '500',
                  color: 'var(--text)'
                }}
                onClick={() => setShowMethodDropdown(!showMethodDropdown)}
              >
                <span>
                  {paymentMethod === 'cash' ? (t('orders.cash') || 'نقدي (كاش)') : (t('orders.electronic') || 'إلكتروني (مدى/شبكة)')}
                </span>
              </button>
              {showMethodDropdown && (
                <div className="table-select-dropdown" style={{ zIndex: 10000 }}>
                  {[
                    { value: 'cash', label: t('orders.cash') || 'نقدي (كاش)' },
                    { value: 'electronic', label: t('orders.electronic') || 'إلكتروني (مدى/شبكة)' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`table-select-item ${paymentMethod === opt.value ? 'selected' : ''}`}
                      onClick={() => {
                        setPaymentMethod(opt.value);
                        setShowMethodDropdown(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('orders.paymentType') || 'نوع الدفعة'}</label>
            <div className="table-select-container" ref={typeDropdownRef} style={{ width: '100%' }}>
              <button
                type="button"
                className="table-select-trigger"
                style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.95rem',
                  width: '100%',
                  height: '46px',
                  borderRadius: '10px',
                  background: 'var(--bg-white)',
                  fontWeight: '500',
                  color: 'var(--text)'
                }}
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              >
                <span>
                  {paymentType === 'balance' ? (t('orders.balance') || 'دفع المتبقي') : (t('orders.deposit') || 'دفعة مقدمة إضافية')}
                </span>
              </button>
              {showTypeDropdown && (
                <div className="table-select-dropdown" style={{ zIndex: 10000 }}>
                  {[
                    { value: 'balance', label: t('orders.balance') || 'دفع المتبقي' },
                    { value: 'deposit', label: t('orders.deposit') || 'دفعة مقدمة إضافية' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`table-select-item ${paymentType === opt.value ? 'selected' : ''}`}
                      onClick={() => {
                        setPaymentType(opt.value);
                        setShowTypeDropdown(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-md">
            <Button variant="secondary" type="button" onClick={() => setShowPaymentModal(false)}>
              {t('orders.cancel') || 'إلغاء'}
            </Button>
            <Button variant="primary" type="submit" disabled={savingPayment}>
              {savingPayment ? t('orders.saving') || 'جاري الحفظ...' : t('orders.savePayment') || 'حفظ الدفعة'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* مودال عرض رمز QR للقطعة */}
      <Modal
        isOpen={!!qrModalItem}
        onClose={() => setQrModalItem(null)}
        title={t('orders.itemQRTitle', { code: qrModalItem?.qr_code || '' }) || `رمز QR للقطعة - ${qrModalItem?.qr_code || ''}`}
      >
        {qrModalItem && (
          <div className="flex flex-col items-center justify-center py-md text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1.5px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'inline-block', marginBottom: '16px' }}>
              <QRCodeCanvas
                value={qrModalItem.qr_code}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="font-bold text-lg mb-xs" style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '4px' }}>{qrModalItem.qr_code}</p>
            <p className="text-secondary mb-md" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {t('orders.itemTypeLabel') || 'نوع القطعة:'} {getItemTypeAr(qrModalItem.item_type)} {qrModalItem.size_name ? `(${qrModalItem.size_name})` : ''} | {t('orders.requiredService') || 'الخدمة:'} {qrModalItem.service_name_ar || qrModalItem.service?.name_ar}
            </p>
          </div>
        )}
      </Modal>

      {/* عناصر الطباعة غير المرئية على الشاشة */}
      {order && (
        <div className="hidden-print-container">
          <PrintInvoice order={order} />
          <PrintQRLabels items={order.items || []} orderId={order.id} />
        </div>
      )}

      {order && (
        <LocationPickerModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          initialLocation={
            order.delivery_lat && order.delivery_lng
              ? { lat: parseFloat(order.delivery_lat), lng: parseFloat(order.delivery_lng) }
              : order.customer_lat && order.customer_lng
              ? { lat: parseFloat(order.customer_lat), lng: parseFloat(order.customer_lng) }
              : null
          }
          initialAddress={order.delivery_address || order.customer_address || ''}
          onSelectLocation={async (locationData) => {
            try {
              // تحديث عنوان وإحداثيات توصيل الطلب
              await ordersAPI.update(id, {
                delivery_address: locationData.address,
                delivery_lat: locationData.latitude,
                delivery_lng: locationData.longitude
              });
              
              // تحديث تفاصيل العميل للمستقبل
              if (order.customer_id) {
                try {
                  await customersAPI.update(order.customer_id, {
                    address: locationData.address,
                    latitude: locationData.latitude,
                    longitude: locationData.longitude
                  });
                } catch (cErr) {
                  console.warn('Could not auto-update customer record:', cErr);
                }
              }
              
              showToast('تم تحديث وحفظ عنوان وموقع التوصيل بنجاح 📍', 'success');
              setShowMapModal(false);
              loadOrderDetails();
            } catch (err) {
              console.error('Failed to update order address/location:', err);
              showToast('حدث خطأ أثناء حفظ تفاصيل موقع التوصيل', 'error');
            }
          }}
        />
      )}

      {order && ((order.delivery_lat && order.delivery_lng) || (order.customer_lat && order.customer_lng)) && (
        <Modal
          isOpen={showViewMapModal}
          onClose={() => setShowViewMapModal(false)}
          title={t('orders.deliveryLocationTitle') || '📍 موقع التوصيل على الخريطة التفاعلية'}
        >
          <div style={{ padding: '0.5rem 0' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #64748b)', marginBottom: '0.75rem', direction: 'rtl', textAlign: 'right' }}>
              <strong>العنوان المحدد:</strong> {order.delivery_address || order.customer_address || ''}
            </p>
            <StaticOrderMap
              lat={order.delivery_lat || order.customer_lat}
              lng={order.delivery_lng || order.customer_lng}
              address={order.delivery_address || order.customer_address || ''}
              height="380px"
              interactive={true}
            />
            <div className="flex justify-end mt-md" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button variant="secondary" onClick={() => setShowViewMapModal(false)}>
                {t('orders.close') || 'إغلاق'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
