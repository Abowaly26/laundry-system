import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Search, UserPlus, Printer, ArrowRight, Save, FileText } from 'lucide-react';
import { customersAPI, servicesAPI, ordersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Modal from '../../components/UI/Modal';
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
  const { settings } = useSettings();
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
  const [daysOffset, setDaysOffset] = useState(1); // افتراضي يوم واحد
  const [hoursOffset, setHoursOffset] = useState(0); // 0 ساعة إضافية
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');

  useEffect(() => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    target.setHours(target.getHours() + hoursOffset);
    
    setDeliveryDate(target.toISOString().split('T')[0]);
    const hh = String(target.getHours()).padStart(2, '0');
    const mm = String(target.getMinutes()).padStart(2, '0');
    setDeliveryTime(`${hh}:${mm}`);
  }, [daysOffset, hoursOffset]);

  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // معالجة الطباعة والنجاح
  const [createdOrder, setCreatedOrder] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workloadStatus, setWorkloadStatus] = useState(null);
  const [weeklyWorkload, setWeeklyWorkload] = useState([]);

  // تحميل الخدمات وضغط العمل عند التحميل
  useEffect(() => {
    servicesAPI.getAll({ is_active: 1 })
      .then(res => {
        if (res.success) setServices(res.data);
      })
      .catch(err => console.error('خطأ في تحميل الخدمات', err));

    ordersAPI.getWorkloadStatus()
      .then(res => {
        if (res.success) setWorkloadStatus(res.data);
      })
      .catch(err => console.error('خطأ في تحميل ضغط العمل', err));

    ordersAPI.getWeeklyWorkload()
      .then(res => {
        if (res.success) setWeeklyWorkload(res.data);
      })
      .catch(err => console.error('خطأ في تحميل ضغط العمل الأسبوعي', err));
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
        .catch(err => console.error('خطأ في البحث عن العميل', err));
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // إجمالي التكلفة
  const totalAmount = items.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);
  const remainingAmount = Math.max(0, totalAmount - (parseFloat(paidAmount) || 0));

  // إدارة عناصر الفاتورة
  const addItemRow = () => {
    setItems([...items, { item_type: 'shirt', service_id: '', price: 0, notes: '' }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const handleItemTypeChange = (index, value) => {
    const newItems = [...items];
    newItems[index].item_type = value;
    setItems(newItems);
  };

  const handleServiceChange = (index, serviceId) => {
    const newItems = [...items];
    newItems[index].service_id = serviceId;
    
    // جلب سعر الخدمة المحدد تلقائياً
    const service = services.find(s => s.id === parseInt(serviceId));
    if (service) {
      newItems[index].price = service.price;
    } else {
      newItems[index].price = 0;
    }
    
    setItems(newItems);
  };

  const handlePriceChange = (index, value) => {
    const newItems = [...items];
    newItems[index].price = parseFloat(value) || 0;
    setItems(newItems);
  };

  const handleNotesChange = (index, value) => {
    const newItems = [...items];
    newItems[index].notes = value;
    setItems(newItems);
  };

  // إضافة عميل سريع
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setCustomerError('');
    if (!newCustomer.name || !newCustomer.phone) {
      setCustomerError('الرجاء إدخال الاسم ورقم الجوال');
      return;
    }

    try {
      const res = await customersAPI.create(newCustomer);
      if (res.success) {
        setSelectedCustomer(res.data);
        setShowAddCustomerModal(false);
        setNewCustomer({ name: '', phone: '', address: '' });
        showToast('تمت إضافة العميل وتحديده بنجاح!', 'success');
      } else {
        setCustomerError(res.message || 'فشل في إنشاء العميل');
      }
    } catch (err) {
      setCustomerError(err.message || 'خطأ في الاتصال بالخادم');
    }
  };

  // حفظ الطلب
  const handleSubmitOrder = async () => {
    if (!selectedCustomer) {
      showToast('الرجاء اختيار أو إضافة عميل أولاً', 'warning');
      return;
    }

    const invalidItems = items.some(item => !item.service_id);
    if (invalidItems) {
      showToast('الرجاء اختيار الخدمة لكل القطع المضافة', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      // وقت التسليم المتوقع المحدد يدوياً
      const expectedDate = new Date(`${deliveryDate}T${deliveryTime}`);

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

        let text = settings.whatsappTemplate || '';
        text = text
          .replace(/{customer_name}/g, customerName)
          .replace(/{order_id}/g, orderId)
          .replace(/{items_count}/g, itemsCount)
          .replace(/{total_amount}/g, formattedTotal)
          .replace(/{remaining_amount}/g, formattedRemaining)
          .replace(/{currency}/g, settings.currency)
          .replace(/{delivery_date}/g, deliveryDateStr)
          .replace(/{tracking_link}/g, trackingLink);

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
        {/* العمود الأيمن (الرئيسي): إضافة القطع */}
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
                              {s.name_ar} ({s.price} {settings.currency})
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
        </div>

        {/* العمود الأيسر (الجانبي): اختيار العميل، الجدولة، والمالية */}
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

          <Card title="تفاصيل التسليم والجدولة" className="mb-md">
            <div className="form-group">
              <label className="form-label">وقت التسليم المتوقع (بالأيام والساعات)</label>
              <div className="flex gap-sm mb-xs">
                <div style={{ flex: 1 }}>
                  <span className="help-text">الأيام</span>
                  <input
                    type="number"
                    className="form-input"
                    value={daysOffset}
                    onChange={(e) => setDaysOffset(parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="help-text">الساعات الإضافية</span>
                  <input
                    type="number"
                    className="form-input"
                    value={hoursOffset}
                    onChange={(e) => setHoursOffset(parseInt(e.target.value) || 0)}
                    min="0"
                    max="23"
                  />
                </div>
              </div>

              {deliveryDate && deliveryTime && (
                <div className="mt-sm p-sm" style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <span className="help-text-label font-bold" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>موعد التسليم الناتج:</span>
                  <span className="text-primary font-bold" style={{ fontSize: '0.9rem' }}>
                    {new Date(`${deliveryDate}T${deliveryTime}`).toLocaleString('ar-EG', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}

              {weeklyWorkload && weeklyWorkload.length > 0 && (
                <div className="weekly-workload-mini-chart mt-md">
                  <span className="help-text-label font-bold mb-xs" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    مقياس ضغط العمل (القطع المجدولة للـ 7 أيام القادمة):
                  </span>
                  <div className="mini-chart-bars-container">
                    {weeklyWorkload.map((day, idx) => {
                      const maxCount = Math.max(...weeklyWorkload.map(d => d.count), 1);
                      const barHeightPercent = Math.min(100, (day.count / maxCount) * 70 + 10);
                      const isSelected = daysOffset === idx;
                      
                      return (
                        <div 
                          key={day.date} 
                          className={`mini-chart-bar-col ${isSelected ? 'selected' : ''}`}
                          onClick={() => setDaysOffset(idx)}
                          title={`${day.dayName}: ${day.count} قطعة`}
                        >
                          <div className="mini-bar-wrapper">
                            <div 
                              className="mini-bar-fill" 
                              style={{ height: `${day.count === 0 ? 4 : barHeightPercent}%` }}
                            >
                              {day.count > 0 && <span className="mini-bar-tooltip">{day.count}</span>}
                            </div>
                          </div>
                          <span className="mini-bar-label">{day.dayName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="form-group mt-md">
              <label className="form-label">ملاحظات الطلب</label>
              <textarea
                className="form-textarea"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="ملاحظات عامة حول الطلب..."
              />
            </div>
          </Card>

          {/* تفاصيل التكلفة والدفع */}
          <Card title="تفاصيل الفاتورة والدفع">
            <div className="financials-summary-box">
              <div className="financial-row">
                <span>إجمالي الطلب:</span>
                <span className="amount-val font-bold">{totalAmount.toFixed(2)} {settings.currency}</span>
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
                  <span className="suffix">{settings.currency}</span>
                </div>
              </div>
              <div className="financial-row">
                <span>المتبقي عند التسليم:</span>
                <span className={`amount-val font-bold ${remainingAmount > 0 ? 'text-warning' : 'text-success'}`}>
                  {remainingAmount.toFixed(2)} {settings.currency}
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
                    إلكتروني (شبكة)
                  </label>
                </div>
              </div>
            </div>

            <div className="submit-actions mt-md">
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
                طباعة الفاتورة
              </Button>
              <Button variant="secondary" className="print-option-btn" onClick={handlePrintLabels}>
                <FileText size={20} style={{ marginLeft: '8px' }} />
                طباعة ملصقات القطع
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
