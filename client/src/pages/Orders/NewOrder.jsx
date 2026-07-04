import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Search, UserPlus, Printer, ArrowRight, Save, Calendar, FileText } from 'lucide-react';
import { customersAPI, servicesAPI, ordersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Modal from '../../components/UI/Modal';
import Table from '../../components/UI/Table';
import PrintInvoice from '../../components/Print/PrintInvoice';
import PrintQRLabels from '../../components/Print/PrintQRLabels';
import './NewOrder.css';

const COMMON_ITEMS = [
  { value: 'shirt', label: 'قميص / تيشرت' },
  { value: 'pants', label: 'بنطلون / جينز' },
  { value: 'thobe', label: 'ثوب' },
  { value: 'dress', label: 'فستان' },
  { value: 'suit', label: 'بدلة كاملة' },
  { value: 'jacket', label: 'جاكيت / معطف' },
  { value: 'blanket', label: 'بطانية' },
  { value: 'carpet', label: 'سجادة' },
  { value: 'other', label: 'أخرى / قطعة منوعة' }
];

export default function NewOrder() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [services, setServices] = useState([]);
  
  // بيانات العميل
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
  const [customerError, setCustomerError] = useState('');

  // عناصر الطلب
  const [items, setItems] = useState([
    { item_type: 'shirt', service_id: '', price: 0, notes: '' }
  ]);

  // تفاصيل الطلب المالية والتواريخ
  const [paidAmount, setPaidAmount] = useState(0);
  const [expectedHours, setExpectedHours] = useState(24); // افتراضي 24 ساعة
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // معالجة الطباعة والنجاح
  const [createdOrder, setCreatedOrder] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // تحميل الخدمات عند التحميل
  useEffect(() => {
    servicesAPI.getAll({ is_active: 1 })
      .then(res => {
        if (res.success) setServices(res.data);
      })
      .catch(err => console.error('خطأ في تحميل الخدمات', err));
  }, []);

  // البحث عن العميل
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(() => {
      customersAPI.search(searchQuery)
        .then(res => {
          if (res.success) setSearchResults(res.data);
        })
        .catch(err => console.error(err));
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // إضافة عميل جديد
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setCustomerError('');
    if (!newCustomer.name || !newCustomer.phone) {
      setCustomerError('الاسم ورقم الهاتف مطلوبان');
      return;
    }
    try {
      const res = await customersAPI.create(newCustomer);
      if (res.success) {
        setSelectedCustomer(res.data);
        setShowAddCustomerModal(false);
        setNewCustomer({ name: '', phone: '', address: '' });
        setSearchQuery('');
      } else {
        setCustomerError(res.message || 'حدث خطأ أثناء إضافة العميل');
      }
    } catch (err) {
      setCustomerError(err.message || 'حدث خطأ في الاتصال بالخادم');
    }
  };

  // تغيير الخدمة لقطعة معينة وتحديث السعر تلقائياً
  const handleServiceChange = (index, serviceId) => {
    const selectedService = services.find(s => s.id === parseInt(serviceId));
    const newItems = [...items];
    newItems[index].service_id = serviceId;
    newItems[index].price = selectedService ? parseFloat(selectedService.price) || 0 : 0;
    setItems(newItems);

    // تحديث ساعات التسليم المتوقعة بناءً على أطول مدة خدمة مطلوبة
    let maxHours = 12;
    newItems.forEach(item => {
      const serv = services.find(s => s.id === parseInt(item.service_id));
      const estimatedHours = serv ? parseInt(serv.estimated_hours) || 0 : 0;
      if (estimatedHours > maxHours) {
        maxHours = estimatedHours;
      }
    });
    setExpectedHours(maxHours);
  };

  const handleItemTypeChange = (index, val) => {
    const newItems = [...items];
    newItems[index].item_type = val;
    setItems(newItems);
  };

  const handleNotesChange = (index, val) => {
    const newItems = [...items];
    newItems[index].notes = val;
    setItems(newItems);
  };

  const handlePriceChange = (index, val) => {
    const newItems = [...items];
    newItems[index].price = parseFloat(val) || 0;
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([...items, { item_type: 'shirt', service_id: '', price: 0, notes: '' }]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  // حساب الإجماليات
  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
  const remainingAmount = totalAmount - paidAmount;

  // حفظ الطلب وإرساله للخادم
  const handleSubmitOrder = async () => {
    if (!selectedCustomer) {
      showToast('يرجى اختيار عميل أو إضافة عميل جديد أولاً', 'warning');
      return;
    }

    const invalidItems = items.some(item => !item.service_id);
    if (invalidItems) {
      showToast('يرجى اختيار الخدمة المطلوبة لجميع القطع المضافة', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      // حساب وقت التسليم المتوقع
      const expectedDate = new Date();
      expectedDate.setHours(expectedDate.getHours() + expectedHours);

      const orderData = {
        customer_id: selectedCustomer.id,
        items: items.map(item => ({
          item_type: item.item_type,
          service_id: parseInt(item.service_id),
          notes: item.notes,
          price: item.price
        })),
        paid_amount: parseFloat(paidAmount) || 0,
        payment_method: paymentMethod,
        expected_delivery_at: expectedDate.toISOString(),
        notes: orderNotes
      };

      const res = await ordersAPI.create(orderData);
      if (res.success) {
        const newOrderData = res.data;
        setCreatedOrder(newOrderData);
        showToast('تم حفظ وإنشاء الطلب بنجاح! 🎉', 'success');
        setShowPrintModal(true);

        // مشاركة تلقائية عبر واتساب
        const customerName = selectedCustomer.name || 'عميل';
        const customerPhone = selectedCustomer.phone || '';
        const orderId = newOrderData.id;
        const itemsCount = items.length;
        const formattedTotal = parseFloat(totalAmount).toFixed(2);
        const formattedRemaining = parseFloat(totalAmount - (parseFloat(paidAmount) || 0)).toFixed(2);
        
        const deliveryDateStr = expectedDate.toLocaleString('ar-EG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const trackingLink = `${window.location.origin}/portal?phone=${customerPhone}&id=${orderId}`;

        const text = `السلام عليكم يا ${customerName}، تم استلام طلبك رقم ${orderId} بنجاح.
تفاصيل الطلب:
- عدد القطع: ${itemsCount}
- إجمالي الفاتورة: ${formattedTotal} ر.س
- المتبقي للدفع: ${formattedRemaining} ر.س
- موعد التسليم المتوقع: ${deliveryDateStr}

يمكنك تتبع حالة غسيل وكي ملابسك مباشرة من رابط التتبع الخاص بك:
${trackingLink}

شكراً لثقتكم بنا! ✨`;

        const encodedText = encodeURIComponent(text);
        let sanitizedPhone = customerPhone.replace(/\D/g, '');
        if (sanitizedPhone.startsWith('05') && sanitizedPhone.length === 10) {
          sanitizedPhone = '966' + sanitizedPhone.substring(1);
        }

        // توجيه تلقائي لواتساب
        setTimeout(() => {
          window.open(`https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodedText}`, '_blank');
        }, 800);
      } else {
        showToast(res.message || 'فشل في حفظ الطلب', 'error');
      }
    } catch (err) {
      showToast(err.message || 'حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handlePrintInvoice = () => {
    printOrder(false);
  };

  const handleDownloadInvoicePdf = () => {
    printOrder(true);
  };

  return (
    <div className="page new-order-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">تسجيل طلب جديد</h1>
          <p className="page-subtitle">إنشاء طلب جديد، إسناد الخدمات وتوليد ملصقات التتبع</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/orders')}>
          <ArrowRight size={18} style={{ marginLeft: '8px' }} />
          العودة للطلبات
        </Button>
      </div>

      <div className="new-order-grid">
        {/* العمود الأيمن: اختيار العميل وإضافة الملاحظات */}
        <div className="new-order-sidebar">
          <Card title="بيانات العميل" className="mb-md">
            {!selectedCustomer ? (
              <div className="customer-selector">
                <div className="search-box">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search size={18} className="search-icon" />
                </div>

                {searchResults.length > 0 && (
                  <ul className="search-results-list">
                    {searchResults.map(c => (
                      <li key={c.id} onClick={() => {
                        setSelectedCustomer(c);
                        setSearchResults([]);
                        setSearchQuery('');
                      }}>
                        <span className="customer-name">{c.name}</span>
                        <span className="customer-phone">{c.phone}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="divider-or"><span>أو</span></div>

                <Button variant="secondary" className="w-full" onClick={() => setShowAddCustomerModal(true)}>
                  <UserPlus size={18} style={{ marginLeft: '8px' }} />
                  إضافة عميل جديد
                </Button>
              </div>
            ) : (
              <div className="selected-customer-card">
                <div className="customer-info-detail">
                  <h3>{selectedCustomer.name}</h3>
                  <p>رقم الهاتف: {selectedCustomer.phone}</p>
                  {selectedCustomer.address && <p>العنوان: {selectedCustomer.address}</p>}
                </div>
                <Button variant="ghost" className="text-error mt-sm w-full" onClick={() => setSelectedCustomer(null)}>
                  تغيير العميل
                </Button>
              </div>
            )}
          </Card>

          <Card title="تفاصيل التسليم والدفع">
            <div className="form-group">
              <label className="form-label">وقت التسليم المتوقع (بالساعات)</label>
              <input
                type="number"
                className="form-input"
                value={expectedHours}
                onChange={(e) => setExpectedHours(parseInt(e.target.value) || 0)}
                min="1"
              />
              <span className="help-text">تلقائياً بناءً على متوسط الخدمات المطلوبة</span>
            </div>

            <div className="form-group">
              <label className="form-label">ملاحظات الطلب</label>
              <textarea
                className="form-textarea"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="ملاحظات عامة حول الطلب..."
              />
            </div>
          </Card>
        </div>

        {/* العمود الأيسر: إضافة القطع وتفاصيل الدفع */}
        <div className="new-order-main">
          <Card title="قطع الملابس / السجاد المضافة للطلب">
            <div className="items-table-container">
              <table className="new-order-items-table">
                <thead>
                  <tr>
                    <th>نوع القطعة</th>
                    <th>الخدمة المطلوبة</th>
                    <th style={{ width: '100px' }}>السعر</th>
                    <th>ملاحظات على القطعة</th>
                    <th style={{ width: '50px' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <select
                          className="form-select"
                          value={item.item_type}
                          onChange={(e) => handleItemTypeChange(index, e.target.value)}
                        >
                          {COMMON_ITEMS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-select"
                          value={item.service_id}
                          onChange={(e) => handleServiceChange(index, e.target.value)}
                        >
                          <option value="">اختر الخدمة...</option>
                          {services.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name_ar} ({s.price} ر.س)
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          value={item.price}
                          onChange={(e) => handlePriceChange(index, e.target.value)}
                          min="0"
                          step="0.5"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          value={item.notes}
                          onChange={(e) => handleNotesChange(index, e.target.value)}
                          placeholder="مثال: بقعة زيت، تلف بالكم..."
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-remove-row text-error"
                          onClick={() => removeItemRow(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button variant="secondary" className="mt-md" onClick={addItemRow}>
              <Plus size={16} style={{ marginLeft: '6px' }} />
              إضافة قطعة أخرى
            </Button>
          </Card>

          {/* تفاصيل التكلفة النهائية */}
          <Card className="mt-md">
            <div className="financials-summary-box">
              <div className="financial-row">
                <span>إجمالي الطلب:</span>
                <span className="amount-val font-bold">{totalAmount.toFixed(2)} ر.س</span>
              </div>
              <div className="financial-row">
                <span>المبلغ المدفوع (مقدم):</span>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    className="form-input inline-input"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    max={totalAmount}
                    min="0"
                    step="0.5"
                  />
                  <span className="suffix">ر.س</span>
                </div>
              </div>
              <div className="financial-row">
                <span>المتبقي عند التسليم:</span>
                <span className={`amount-val font-bold ${remainingAmount > 0 ? 'text-warning' : 'text-success'}`}>
                  {remainingAmount.toFixed(2)} ر.س
                </span>
              </div>

              <div className="financial-row">
                <span>طريقة الدفع:</span>
                <div className="payment-method-toggle">
                  <label className={`method-option ${paymentMethod === 'cash' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                      className="sr-only"
                    />
                    نقدي (كاش)
                  </label>
                  <label className={`method-option ${paymentMethod === 'electronic' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="electronic"
                      checked={paymentMethod === 'electronic'}
                      onChange={() => setPaymentMethod('electronic')}
                      className="sr-only"
                    />
                    إلكتروني (مدى/شبكة)
                  </label>
                </div>
              </div>
            </div>

            <div className="submit-actions mt-lg">
              <Button
                variant="primary"
                size="large"
                className="w-full btn-save-order"
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
              >
                <Save size={18} style={{ marginLeft: '8px' }} />
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ الطلب وتوليد الفاتورة'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* مودال إضافة عميل جديد */}
      <Modal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        title="إضافة عميل جديد للنظام"
      >
        <form onSubmit={handleAddCustomer}>
          {customerError && <div className="alert-message error mb-sm">{customerError}</div>}
          <div className="form-group">
            <label className="form-label">اسم العميل *</label>
            <input
              type="text"
              className="form-input"
              required
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              placeholder="مثال: عبد الرحمن محمد"
            />
          </div>
          <div className="form-group">
            <label className="form-label">رقم الجوال *</label>
            <input
              type="text"
              className="form-input"
              required
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              placeholder="مثال: 0500000000"
            />
          </div>
          <div className="form-group">
            <label className="form-label">العنوان (اختياري)</label>
            <input
              type="text"
              className="form-input"
              value={newCustomer.address}
              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              placeholder="مثال: حي الصحافة، الرياض"
            />
          </div>
          <div className="flex justify-between mt-md">
            <Button variant="secondary" type="button" onClick={() => setShowAddCustomerModal(false)}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit">
              حفظ وتحديد العميل
            </Button>
          </div>
        </form>
      </Modal>

      {/* مودال الطباعة والنجاح */}
      {showPrintModal && createdOrder && (
        <Modal
          isOpen={showPrintModal}
          onClose={() => {
            setShowPrintModal(false);
            navigate('/orders');
          }}
          title="تم حفظ الطلب بنجاح"
          size="medium"
        >
          <div className="print-modal-content">
            <div className="success-banner text-center mb-md">
              <div className="success-icon-wrapper">✓</div>
              <h2>رقم الطلب: #{createdOrder.id}</h2>
              <p>تم تسجيل الطلب وإدخال {createdOrder.items?.length || 0} قطع بنجاح</p>
            </div>

            <div className="print-options-grid">
              <Button variant="primary" className="print-option-btn" onClick={handlePrintInvoice}>
                <Printer size={20} style={{ marginLeft: '8px' }} />
                طباعة الفاتورة والملصقات
              </Button>
              <Button variant="secondary" className="print-option-btn" onClick={handleDownloadInvoicePdf}>
                <FileText size={20} style={{ marginLeft: '8px' }} />
                تنزيل PDF للفاتورة
              </Button>
              <Button variant="secondary" onClick={() => {
                setShowPrintModal(false);
                navigate('/orders');
              }}>
                الذهاب لقائمة الطلبات
              </Button>
            </div>

            {/* العناصر غير المرئية المخصصة للطباعة فقط */}
            <div className="hidden-print-container">
              <PrintInvoice order={createdOrder} />
              <PrintQRLabels items={createdOrder.items || []} orderId={createdOrder.id} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
