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
  
  const getFormattedDayDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    return `${day}/${month}`;
  };

  const getWorkloadLevel = (count) => {
    if (count < 10) return { className: 'workload-low', text: 'خفيف' };
    if (count <= 25) return { className: 'workload-medium', text: 'متوسط' };
    return { className: 'workload-high', text: 'مزدحم' };
  };

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

  // تفاصيل الجدولة
  const getTomorrowDate = () => {
    const target = new Date();
    target.setDate(target.getDate() + 1);
    return target.toISOString().split('T')[0];
  };

  const [deliveryDate, setDeliveryDate] = useState(getTomorrowDate());
  const [deliveryTime, setDeliveryTime] = useState('16:00'); // الساعة 4:00 عصراً افتراضي
  const [activeTimePreset, setActiveTimePreset] = useState('afternoon');
  const [isCustomDelivery, setIsCustomDelivery] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState(0);

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

  // تطبيق الاختيار السريع للوقت
  const applyTimePreset = (type) => {
    setActiveTimePreset(type);
    if (type === 'morning') {
      setDeliveryTime('10:00');
    } else if (type === 'afternoon') {
      setDeliveryTime('16:00');
    } else if (type === 'evening') {
      setDeliveryTime('20:00');
    } else if (type === 'rush3') {
      // بعد 3 ساعات
      const target = new Date();
      target.setHours(target.getHours() + 3);
      setDeliveryDate(target.toISOString().split('T')[0]);
      const hh = String(target.getHours()).padStart(2, '0');
      const mm = String(target.getMinutes()).padStart(2, '0');
      setDeliveryTime(`${hh}:${mm}`);
    } else if (type === 'rush1') {
      // بعد ساعة
      const target = new Date();
      target.setHours(target.getHours() + 1);
      setDeliveryDate(target.toISOString().split('T')[0]);
      const hh = String(target.getHours()).padStart(2, '0');
      const mm = String(target.getMinutes()).padStart(2, '0');
      setDeliveryTime(`${hh}:${mm}`);
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
      <div className="new-order-layout">
        {/* الصف العلوي: العميل والجدولة */}
        <div className="new-order-top-row">
          <div className="layout-card-wrapper">
            <Card 
              title="بيانات العميل"
              actions={
                <button 
                  type="button" 
                  className="btn-card-back" 
                  onClick={() => navigate('/orders')} 
                  title="العودة للطلبات"
                >
                  <ArrowRight size={18} />
                </button>
              }
            >
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

              <div className="form-group mt-sm">
                <label className="form-label label-compact">ملاحظات الطلب</label>
                <textarea
                  className="form-textarea form-textarea-compact"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="ملاحظات عامة حول الطلب..."
                  rows={2}
                />
              </div>
            </Card>
          </div>

          <div className="layout-card-wrapper">
            <Card title="تفاصيل التسليم والجدولة">
              <div className="form-group">
                {weeklyWorkload && weeklyWorkload.length > 0 && (
                  <div className="weekly-workload-cards-section">
                    <span className="help-text-label font-bold mb-xs" style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      اختر يوم التسليم (مقياس ضغط العمل للـ 14 يوماً القادمة):
                    </span>
                    <div className="workload-days-grid">
                      {weeklyWorkload.map((day) => {
                        const isSelected = deliveryDate === day.date;
                        const level = getWorkloadLevel(day.count);
                        
                        return (
                          <div 
                            key={day.date} 
                            className={`workload-day-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setDeliveryDate(day.date);
                              if (activeTimePreset === 'rush3') {
                                setActiveTimePreset('custom');
                              }
                            }}
                          >
                            <span className="day-name">{day.dayName}</span>
                            <span className="day-date">{getFormattedDayDate(day.date)}</span>
                            <div className={`workload-status-badge ${level.className}`}>
                              <span className="status-dot"></span>
                              <span className="status-count">{day.count} قطعة</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="scheduler-ux-bottom mt-sm">
                  {!isCustomDelivery ? (
                    <div className="scheduler-fields-grid">
                      {/* أزرار الفترات الزمنية السريعة */}
                      <div>
                        <span className="help-text">فترة التسليم</span>
                        <div className="schedule-presets-grid">
                          <button 
                            type="button" 
                            className={`preset-pill ${(activeTimePreset === 'morning') ? 'active' : ''}`}
                            onClick={() => applyTimePreset('morning')}
                          >
                            صباحاً (10 ص)
                          </button>
                          <button 
                            type="button" 
                            className={`preset-pill ${(activeTimePreset === 'afternoon') ? 'active' : ''}`}
                            onClick={() => applyTimePreset('afternoon')}
                          >
                            عصراً (4 م)
                          </button>
                          <button 
                            type="button" 
                            className={`preset-pill ${(activeTimePreset === 'evening') ? 'active' : ''}`}
                            onClick={() => applyTimePreset('evening')}
                          >
                            مساءً (8 م)
                          </button>
                          {activeTimePreset === 'custom' ? (
                            <button 
                              type="button" 
                              className="preset-pill active"
                              onClick={() => applyTimePreset('rush3')}
                            >
                              آخر
                            </button>
                          ) : (
                            <button 
                              type="button" 
                              className={`preset-pill preset-pill-rush ${(activeTimePreset === 'rush3') ? 'active' : ''}`}
                              onClick={() => applyTimePreset('rush3')}
                            >
                              مستعجل (3س)
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ساعة التسليم الدقيقة */}
                      <div>
                        <span className="help-text">ساعة التسليم</span>
                        <input
                          type="time"
                          className="form-input form-input-compact"
                          value={deliveryTime}
                          onChange={(e) => {
                            setDeliveryTime(e.target.value);
                            setActiveTimePreset('custom');
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="custom-datetime-container">
                      <div className="flex gap-sm">
                        <div style={{ flex: 1 }}>
                          <span className="help-text">تاريخ التسليم</span>
                          <input
                            type="date"
                            className="form-input form-input-compact"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <span className="help-text">وقت التسليم</span>
                          <input
                            type="time"
                            className="form-input form-input-compact"
                            value={deliveryTime}
                            onChange={(e) => setDeliveryTime(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="scheduler-result-bar">
                    {deliveryDate && deliveryTime && (
                      <div className="scheduler-result-text">
                        <span className="result-label">الموعد المحدد:</span>
                        <span className="result-value">
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
                    <button 
                      type="button" 
                      className="btn-custom-date-toggle"
                      onClick={() => setIsCustomDelivery(!isCustomDelivery)}
                    >
                      {isCustomDelivery ? 'تحديد سريع' : 'موعد مخصص'}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* الصف السفلي: قطع الملابس والملخص المالي */}
        <div className="new-order-bottom-row">
          <div className="bottom-items-wrapper">
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
                            className="form-select select-compact"
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
                            className="form-select select-compact"
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
                            className="form-input form-input-compact"
                            value={item.price}
                            onChange={(e) => handlePriceChange(index, e.target.value)}
                            min="0"
                            step="0.5"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input form-input-compact"
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

              <button type="button" className="btn-add-item-dashed mt-md" onClick={addItemRow}>
                <Plus size={16} style={{ marginLeft: '6px' }} />
                إضافة قطعة جديدة للطلب
              </button>
            </Card>
          </div>

          <div className="bottom-checkout-wrapper">
            {/* تفاصيل التكلفة والدفع */}
            <Card title="تفاصيل الفاتورة والدفع">
              <div className="financials-summary-box">
                <div className="financial-row">
                  <span>إجمالي الطلب:</span>
                  <span className="amount-val-total">{totalAmount.toFixed(2)} {settings.currency}</span>
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
                  <span className={`amount-badge ${remainingAmount > 0 ? 'unpaid' : 'paid'}`}>
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
