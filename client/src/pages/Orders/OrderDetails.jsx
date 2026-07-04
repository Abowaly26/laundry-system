import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, Wallet, ArrowRight, CheckCircle2, User, Calendar, CreditCard, Clock, FileText, MessageSquare } from 'lucide-react';
import { ordersAPI, paymentsAPI, itemsAPI } from '../../services/api';
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

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.getById(id);
      if (res.success) {
        setOrder(res.data);
        // تعيين المبلغ المتبقي كقيمة افتراضية للدفع
        setPaymentAmount(res.data.remaining_amount || 0);
      } else {
        alert('لم يتم العثور على الطلب');
        navigate('/orders');
      }
    } catch (err) {
      console.error(err);
      alert('خطأ في تحميل تفاصيل الطلب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetails();
  }, [id]);

  const printOrder = (invoiceOnly = false) => {
    const cleanup = () => {
      document.body.classList.remove('print-invoice-only');
      window.removeEventListener('afterprint', cleanup);
    };

    if (invoiceOnly) {
      document.body.classList.add('print-invoice-only');
      window.addEventListener('afterprint', cleanup);
    } else {
      document.body.classList.remove('print-invoice-only');
    }

    window.print();
    if (invoiceOnly) setTimeout(cleanup, 1000);
  };

  const handlePrint = () => {
    printOrder(false);
  };

  const handleDownloadInvoicePdf = () => {
    printOrder(true);
  };

  // تسجيل دفعة مالية جديدة
  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      alert('الرجاء إدخال مبلغ صحيح');
      return;
    }
    if (paymentAmount > order.remaining_amount) {
      alert('المبلغ المدفوع أكبر من المبلغ المتبقي على الطلب');
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
        loadOrderDetails();
      } else {
        alert(res.message || 'فشل في حفظ الدفعة');
      }
    } catch (err) {
      alert(err.message || 'خطأ في الاتصال بالخادم');
    } finally {
      setSavingPayment(false);
    }
  };

  // ترقية حالة القطعة الفردية
  const handleAdvanceItemStatus = async (itemId) => {
    try {
      const res = await itemsAPI.advanceStatus(itemId);
      if (res.success) {
        loadOrderDetails(); // إعادة تحميل الطلب لرؤية التحديثات
      } else {
        alert(res.message || 'فشل في تحديث حالة القطعة');
      }
    } catch (err) {
      alert(err.message || 'خطأ أثناء التحديث');
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
      if (!window.confirm(`يوجد مبلغ متبقي (${order.remaining_amount} ر.س). هل تريد تحصيل المبلغ وتسليم الطلب الآن؟`)) {
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
        alert('حدث خطأ أثناء تسجيل الدفعة المتبقية: ' + err.message);
        setDelivering(false);
        return;
      }
    }

    try {
      setDelivering(true);
      const res = await ordersAPI.update(id, { status: 'delivered' });
      if (res.success) {
        loadOrderDetails();
      } else {
        alert(res.message || 'فشل في تحديث حالة الطلب');
      }
    } catch (err) {
      alert(err.message || 'خطأ أثناء تحديث الطلب');
    } finally {
      setDelivering(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!order) return;
    const customerName = order.customer?.name || 'عميل';
    const customerPhone = order.customer?.phone || '';
    const orderId = order.id;
    const itemsCount = order.items?.length || 0;
    const totalAmount = parseFloat(order.total_amount).toFixed(2);
    const remainingAmount = parseFloat(order.remaining_amount).toFixed(2);
    const deliveryDate = formatDate(order.expected_delivery_at);
    const trackingLink = `${window.location.origin}/portal?phone=${customerPhone}&id=${orderId}`;

    const text = `السلام عليكم يا ${customerName}، تم استلام طلبك رقم ${orderId} بنجاح.
تفاصيل الطلب:
- عدد القطع: ${itemsCount}
- إجمالي الفاتورة: ${totalAmount} ر.س
- المتبقي للدفع: ${remainingAmount} ر.س
- موعد التسليم المتوقع: ${deliveryDate}

يمكنك تتبع حالة غسيل وكي ملابسك مباشرة من رابط التتبع الخاص بك:
${trackingLink}

شكراً لثقتكم بنا! ✨`;

    const encodedText = encodeURIComponent(text);
    let sanitizedPhone = customerPhone.replace(/\D/g, '');
    if (sanitizedPhone.startsWith('05') && sanitizedPhone.length === 10) {
      sanitizedPhone = '966' + sanitizedPhone.substring(1);
    }
    
    window.open(`https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodedText}`, '_blank');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ar-EG', {
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

  if (loading && !order) {
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
        <div>
          <div className="flex items-center gap-sm">
            <h1 className="page-title">تفاصيل الطلب #{order.id}</h1>
            <StatusBadge status={order.status} type="order" />
          </div>
          <p className="page-subtitle">تتبع القطع، معالجة الدفعات، وإجراءات التسليم</p>
        </div>
        <div className="flex gap-sm">
          <Button variant="secondary" onClick={() => navigate('/orders')}>
            <ArrowRight size={18} style={{ marginLeft: '8px' }} />
            قائمة الطلبات
          </Button>
          <Button variant="secondary" onClick={handlePrint}>
            <Printer size={18} style={{ marginLeft: '8px' }} />
            طباعة الفاتورة والملصقات
          </Button>
          <Button variant="secondary" onClick={handleDownloadInvoicePdf}>
            <FileText size={18} style={{ marginLeft: '8px' }} />
            تنزيل PDF للفاتورة
          </Button>
          <Button variant="success" onClick={handleShareWhatsApp}>
            <MessageSquare size={18} style={{ marginLeft: '8px' }} />
            مشاركة عبر واتساب
          </Button>
        </div>
      </div>

      {/* تفاصيل الطلب الأساسية */}
      <div className="order-details-grid">
        {/* تفاصيل العميل والماليات */}
        <div className="details-sidebar no-print">
          <Card title="معلومات العميل">
            <div className="detail-item">
              <User size={16} className="detail-icon" />
              <div>
                <span className="detail-label">الاسم:</span>
                <span className="detail-value">{order.customer?.name || 'عميل عام'}</span>
              </div>
            </div>
            <div className="detail-item">
              <CreditCard size={16} className="detail-icon" />
              <div>
                <span className="detail-label">رقم الهاتف:</span>
                <span className="detail-value">{order.customer?.phone || '-'}</span>
              </div>
            </div>
            {order.customer?.address && (
              <div className="detail-item">
                <Clock size={16} className="detail-icon" />
                <div>
                  <span className="detail-label">العنوان:</span>
                  <span className="detail-value">{order.customer?.address}</span>
                </div>
              </div>
            )}
          </Card>

          <Card title="الملخص المالي" className="mt-md">
            <div className="summary-finance-rows">
              <div className="fin-row">
                <span>الإجمالي الكلي:</span>
                <span>{parseFloat(order.total_amount).toFixed(2)} ر.س</span>
              </div>
              <div className="fin-row text-success">
                <span>المبلغ المدفوع:</span>
                <span>{parseFloat(order.paid_amount).toFixed(2)} ر.س</span>
              </div>
              <div className="fin-row text-warning font-bold">
                <span>المبلغ المتبقي:</span>
                <span>{parseFloat(order.remaining_amount).toFixed(2)} ر.س</span>
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

            {order.status !== 'delivered' && order.status !== 'cancelled' && (
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
              <Calendar size={16} className="detail-icon" />
              <div>
                <span className="detail-label">تاريخ الاستلام:</span>
                <span className="detail-value">{formatDate(order.created_at)}</span>
              </div>
            </div>
            <div className="detail-item">
              <Clock size={16} className="detail-icon" />
              <div>
                <span className="detail-label">موعد التسليم المتوقع:</span>
                <span className="detail-value">{formatDate(order.expected_delivery_at)}</span>
              </div>
            </div>
            {order.delivered_at && (
              <div className="detail-item">
                <CheckCircle2 size={16} className="detail-icon" />
                <div>
                  <span className="detail-label">تاريخ التسليم الفعلي:</span>
                  <span className="detail-value">{formatDate(order.delivered_at)}</span>
                </div>
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
                    <th>كود القطعة QR</th>
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
                      <td><strong>{item.qr_code}</strong></td>
                      <td>{getItemTypeAr(item.item_type)}</td>
                      <td>{item.service_name_ar || item.service?.name_ar}</td>
                      <td>{item.notes || '-'}</td>
                      <td>{parseFloat(item.price).toFixed(2)} ر.س</td>
                      <td>
                        <StatusBadge status={item.status} type="item" />
                      </td>
                      <td className="text-center">
                        {item.status !== 'delivered' && (
                          <Button 
                            variant="secondary" 
                            size="small"
                            onClick={() => handleAdvanceItemStatus(item.id)}
                          >
                            ترقية الحالة
                          </Button>
                        )}
                        {item.status === 'delivered' && <span className="text-success">مكتملة ✓</span>}
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
                        <td className="font-bold text-success">{parseFloat(payment.amount).toFixed(2)} ر.س</td>
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
            <label className="form-label">المبلغ المراد سداده (ر.س)</label>
            <input
              type="number"
              className="form-input"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              max={order?.remaining_amount}
              min="0.1"
              step="0.5"
              required
            />
            <span className="help-text">الحد الأقصى المتبقي: {order?.remaining_amount} ر.س</span>
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
