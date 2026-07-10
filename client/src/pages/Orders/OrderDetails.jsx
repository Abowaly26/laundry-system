import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, Wallet, ArrowRight, CheckCircle2, User, Calendar, CreditCard, Clock, FileText, MessageSquare, Copy, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { ordersAPI, paymentsAPI, itemsAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import PrintInvoice from '../../components/Print/PrintInvoice';
import PrintQRLabels from '../../components/Print/PrintQRLabels';
import './OrderDetails.css';

export default function OrderDetails() {
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

  // حالة لتسليم الطلب
  const [delivering, setDelivering] = useState(false);
  const [openItemStatusDropdownId, setOpenItemStatusDropdownId] = useState(null);
  const [qrModalItem, setQrModalItem] = useState(null);

  const ITEM_STATUS_OPTIONS = [
    { value: 'pending', label: 'قيد الانتظار' },
    { value: 'processing', label: 'قيد التنفيذ' },
    { value: 'ready', label: 'جاهز للاستلام' },
    { value: 'delivered', label: 'تم التسليم' }
  ];

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.getById(id);
      if (res.success) {
        setOrder(res.data);
        setPaymentAmount(res.data.remaining_amount || 0);
      } else {
        showToast('لم يتم العثور على الطلب', 'error');
        navigate('/orders');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ في تحميل تفاصيل الطلب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    showToast('تم نسخ كود القطعة بنجاح! 📋', 'success');
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
    if (paymentAmount <= 0) {
      showToast('الرجاء إدخال مبلغ صحيح', 'warning');
      return;
    }
    if (paymentAmount > order.remaining_amount) {
      showToast('المبلغ المدفوع أكبر من المبلغ المتبقي على الطلب', 'warning');
      return;
    }

    setSavingPayment(true);
    try {
      const res = await paymentsAPI.create({
        order_id: parseInt(id),
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        type: paymentType
      });

      if (res.success) {
        setShowPaymentModal(false);
        showToast('تم تسجيل الدفعة بنجاح! 💸', 'success');
        loadOrderDetails();
      } else {
        showToast(res.message || 'فشل في حفظ الدفعة', 'error');
      }
    } catch (err) {
      showToast(err.message || 'خطأ في الاتصال بالخادم', 'error');
    } finally {
      setSavingPayment(false);
    }
  };

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest('.table-select-container')) {
        return;
      }
      setOpenItemStatusDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // تحديث حالة القطعة إلى حالة معينة
  const handleUpdateItemStatus = async (itemId, newStatus) => {
    try {
      const res = await itemsAPI.updateStatus(itemId, newStatus);
      if (res.success) {
        showToast('تم تحديث حالة القطعة بنجاح!', 'success');
        loadOrderDetails();
      } else {
        showToast(res.message || 'فشل في تحديث حالة القطعة', 'error');
      }
    } catch (err) {
      showToast(err.message || 'خطأ أثناء التحديث', 'error');
    } finally {
      setOpenItemStatusDropdownId(null);
    }
  };

  // ترقية حالة القطعة الفردية
  const handleAdvanceItemStatus = async (itemId) => {
    try {
      const res = await itemsAPI.advanceStatus(itemId);
      if (res.success) {
        showToast('تم تحديث حالة القطعة بنجاح!', 'success');
        loadOrderDetails();
      } else {
        showToast(res.message || 'فشل في تحديث حالة القطعة', 'error');
      }
    } catch (err) {
      showToast(err.message || 'خطأ أثناء التحديث', 'error');
    }
  };

  // تسليم الطلب كاملاً للعميل
  const handleDeliverOrder = async () => {
    // التأكد من أن كل القطع جاهزة
    const allReady = order.items.every(item => item.status === 'ready' || item.status === 'delivered');
    if (!allReady) {
      if (!window.confirm('تنبيه: بعض القطع ليست جاهزة بعد. هل تريد المتابعة وتسليم الطلب بأكمله؟')) {
        return;
      }
    }

    // إذا كان هناك متبقي مالي، يجب دفعه أولاً أو تأكيد ذلك يدوياً
    if (order.remaining_amount > 0) {
      if (!window.confirm(`يوجد مبلغ متبقي (${order.remaining_amount} ${settings.currency}). هل تريد تحصيل المبلغ وتسليم الطلب الآن؟`)) {
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
        showToast('حدث خطأ أثناء تسجيل الدفعة المتبقية: ' + err.message, 'error');
        setDelivering(false);
        return;
      }
    }

    try {
      setDelivering(true);
      const res = await ordersAPI.update(id, { status: 'delivered' });
      if (res.success) {
        showToast('تم تسليم الطلب وإغلاقه بنجاح! ✓', 'success');
        loadOrderDetails();
      } else {
        showToast(res.message || 'فشل في تحديث حالة الطلب', 'error');
      }
    } catch (err) {
      showToast(err.message || 'خطأ أثناء تحديث الطلب', 'error');
    } finally {
      setDelivering(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!order) return;
    const customerName = order.customer_name || order.customer?.name || 'عميل';
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
    let sanitizedPhone = customerPhone.replace(/\D/g, '');
    if (sanitizedPhone.startsWith('00')) {
      sanitizedPhone = sanitizedPhone.substring(2);
    }
    if (sanitizedPhone.startsWith('0')) {
      sanitizedPhone = '966' + sanitizedPhone.substring(1);
    } else if (!sanitizedPhone.startsWith('966')) {
      sanitizedPhone = '966' + sanitizedPhone;
    }
    
    window.open(`https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodedText}`, '_blank');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '-' : date.toLocaleString('ar-EG', {
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
            <h1 className="page-title" style={{ margin: 0 }}>تفاصيل الطلب #{order.id}</h1>
            <StatusBadge status={order.status} type="order" />
          </div>
          <p className="page-subtitle">تتبع القطع، معالجة الدفعات، وإجراءات التسليم</p>
        </div>
        <div className="flex gap-sm items-center" style={{ flexWrap: 'wrap', justifyContent: 'flex-start', marginTop: '10px' }}>
          <Button variant="secondary" onClick={() => navigate('/orders')}>
            <ArrowRight size={16} style={{ marginLeft: '6px' }} />
            الرجوع للطلبات
          </Button>
          <Button variant="primary" onClick={handlePrintInvoice}>
            <Printer size={16} style={{ marginLeft: '6px' }} />
            طباعة الفاتورة
          </Button>
          <Button variant="secondary" onClick={handlePrintLabels}>
            <FileText size={16} style={{ marginLeft: '6px' }} />
            طباعة الملصقات
          </Button>
          <Button variant="success" onClick={handleShareWhatsApp}>
            <MessageSquare size={16} style={{ marginLeft: '6px' }} />
            مشاركة واتساب
          </Button>
        </div>
      </div>

      {/* تفاصيل الطلب الأساسية */}
      <div className="order-details-grid">
        {/* تفاصيل العميل والماليات */}
        <div className="details-sidebar no-print">
          <Card title="معلومات العميل">
            <div className="detail-item">
              <div className="detail-item-left">
                <User size={16} className="detail-icon" />
                <span className="detail-label">الاسم:</span>
              </div>
              <span className="detail-value">{order.customer_name || order.customer?.name || 'عميل عام'}</span>
            </div>
            <div className="detail-item">
              <div className="detail-item-left">
                <CreditCard size={16} className="detail-icon" />
                <span className="detail-label">رقم الهاتف:</span>
              </div>
              <span className="detail-value">{order.customer_phone || order.customer?.phone || '-'}</span>
            </div>
            {(order.customer_address || order.customer?.address) && (
              <div className="detail-item">
                <div className="detail-item-left">
                  <Clock size={16} className="detail-icon" />
                  <span className="detail-label">العنوان:</span>
                </div>
                <span className="detail-value">{order.customer_address || order.customer?.address}</span>
              </div>
            )}
          </Card>

          <Card title="الملخص المالي" className="mt-md">
            <div className="summary-finance-rows">
              <div className="fin-row">
                <span>الإجمالي:</span>
                <span style={{ fontWeight: 'bold' }}>{parseFloat(order.total_amount).toFixed(2)} {settings.currency}</span>
              </div>
              <div className="fin-row" style={{ color: 'var(--success)' }}>
                <span>المدفوع:</span>
                <span style={{ fontWeight: 'bold' }}>{parseFloat(order.paid_amount).toFixed(2)} {settings.currency}</span>
              </div>
              <div className={`fin-row ${order.remaining_amount > 0 ? 'text-warning' : 'text-success'}`}>
                <span>المتبقي:</span>
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
                تسجيل دفعة جديدة
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
                {delivering ? 'جاري التسليم...' : 'تسليم الطلب للعميل'}
              </Button>
            )}
          </Card>

          <Card title="مواعيد وتواريخ" className="mt-md">
            <div className="detail-item">
              <div className="detail-item-left">
                <Calendar size={16} className="detail-icon" />
                <span className="detail-label">تاريخ الاستلام:</span>
              </div>
              <span className="detail-value">{formatDate(order.created_at)}</span>
            </div>
            <div className="detail-item">
              <div className="detail-item-left">
                <Clock size={16} className="detail-icon" />
                <span className="detail-label">موعد التسليم المتوقع:</span>
              </div>
              <span className="detail-value">{formatDate(order.expected_delivery_at)}</span>
            </div>
            {order.delivered_at && (
              <div className="detail-item">
                <div className="detail-item-left">
                  <CheckCircle2 size={16} className="detail-icon" />
                  <span className="detail-label">تاريخ التسليم الفعلي:</span>
                </div>
                <span className="detail-value">{formatDate(order.delivered_at)}</span>
              </div>
            )}
            {order.notes && (
              <div className="mt-sm pt-sm" style={{ borderTop: '1px solid var(--border)' }}>
                <strong>ملاحظات:</strong>
                <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>{order.notes}</p>
              </div>
            )}
          </Card>
        </div>

        {/* جدول تتبع القطع وسجل المدفوعات */}
        <div className="details-main no-print">
          <Card title={`القطع المشمولة في الطلب (${order.items?.length || 0} قطع)`}>
            <div className="table-container">
              <table className="items-tracking-table">
                <thead>
                  <tr>
                    <th>كود القطعة</th>
                    <th style={{ textAlign: 'center' }}>رمز QR</th>
                    <th>نوع القطعة</th>
                    <th>الخدمة المطلوبة</th>
                    <th>ملاحظات</th>
                    <th>السعر</th>
                    <th>حالة القطعة</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>تحديث الحالة</th>
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
                          title="عرض الـ QR"
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
          <Card title="سجل الدفعات والتحصيل" className="mt-md">
            {order.payments && order.payments.length === 0 ? (
              <p className="text-secondary" style={{ fontSize: '0.9rem' }}>لا توجد مدفوعات مسجلة بعد لهذا الطلب.</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>رقم الدفعة</th>
                      <th>المبلغ</th>
                      <th>طريقة الدفع</th>
                      <th>نوع الدفعة</th>
                      <th>التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.payments?.map((payment) => (
                      <tr key={payment.id}>
                        <td>#{payment.id}</td>
                        <td className="font-bold text-success">{parseFloat(payment.amount).toFixed(2)} {settings.currency}</td>
                        <td>{payment.method === 'cash' ? 'نقدي' : 'إلكتروني'}</td>
                        <td>
                          {payment.type === 'deposit' ? 'دفعة مقدمة' : 
                           payment.type === 'balance' ? 'متبقي الطلب' : 'سداد كامل'}
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
        title="تسجيل دفعة مالية جديدة"
      >
        <form onSubmit={handleSavePayment}>
          <div className="form-group">
            <label className="form-label">المبلغ المراد سداده ({settings.currency})</label>
            <input
              type="number"
              className="form-input"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              max={order?.remaining_amount}
              min="0.01"
              step="any"
              required
            />
            <span className="help-text">الحد الأقصى المتبقي: {order?.remaining_amount} {settings.currency}</span>
          </div>

          <div className="form-group">
            <label className="form-label">طريقة الدفع</label>
            <select
              className="form-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="cash">نقدي (كاش)</option>
              <option value="electronic">إلكتروني (مدى/شبكة)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">نوع الدفعة</label>
            <select
              className="form-select"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              <option value="balance">دفع المتبقي</option>
              <option value="deposit">دفعة مقدمة إضافية</option>
            </select>
          </div>

          <div className="flex justify-between mt-md">
            <Button variant="secondary" type="button" onClick={() => setShowPaymentModal(false)}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit" disabled={savingPayment}>
              {savingPayment ? 'جاري الحفظ...' : 'حفظ الدفعة'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* مودال عرض رمز QR للقطعة */}
      <Modal
        isOpen={!!qrModalItem}
        onClose={() => setQrModalItem(null)}
        title={`رمز QR للقطعة - ${qrModalItem?.qr_code || ''}`}
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
              نوع القطعة: {getItemTypeAr(qrModalItem.item_type)} {qrModalItem.size_name ? `(${qrModalItem.size_name})` : ''} | الخدمة: {qrModalItem.service_name_ar || qrModalItem.service?.name_ar}
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
    </div>
  );
}
