import { Fragment, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Search, UserPlus, Printer, ArrowRight, Save, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { customersAPI, servicesAPI, ordersAPI, itemTypesAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Modal from '../../components/UI/Modal';
import PrintInvoice from '../../components/Print/PrintInvoice';
import PrintQRLabels from '../../components/Print/PrintQRLabels';
import './NewOrder.css';

const getTimeOptions = (t) => {
  const options = [];
  for (let h = 8; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const isPM = h >= 12;
      const displayH = h > 12 ? h - 12 : h;
      const amPmStr = isPM ? (t('orders.pm') || 'م') : (t('orders.am') || 'ص');
      const timeVal = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const timeLabel = `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${amPmStr}`;
      options.push({ value: timeVal, label: timeLabel });
    }
  }
  return options;
};

export default function NewOrder() {
  const { t, i18n } = useTranslation();
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

  const getTimeLabel = (timeVal) => {
    const option = getTimeOptions(t).find(opt => opt.value === timeVal);
    if (option) return option.label;
    
    if (!timeVal) return '';
    const parts = timeVal.split(':');
    if (parts.length < 2) return timeVal;
    let hh = parseInt(parts[0]);
    const mm = parts[1];
    const period = hh >= 12 ? 'م' : 'ص';
    if (hh > 12) hh -= 12;
    if (hh === 0) hh = 12;
    const formattedHour = String(hh).padStart(2, '0');
    return `${formattedHour}:${mm} ${period}`;
  };

  const renderTimeLabel = (timeVal) => {
    const rawLabel = getTimeLabel(timeVal);
    if (!rawLabel) return null;
    const parts = rawLabel.split(' ');
    const digits = parts[0];
    const period = parts[1] || '';
    
    return (
      <span className="time-label-flex">
        <span className="time-label-digits">{digits}</span>
        {period && <span className="time-label-period">{period}</span>}
      </span>
    );
  };

  const [showQuickTimeDropdown, setShowQuickTimeDropdown] = useState(false);
  const [showCustomTimeDropdown, setShowCustomTimeDropdown] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  const quickTimeRef = useRef(null);
  const customTimeRef = useRef(null);
  const dateRef = useRef(null);

  const [openItemTypeIndex, setOpenItemTypeIndex] = useState(null);
  const [openServiceIndex, setOpenServiceIndex] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showQuickTimeDropdown && quickTimeRef.current && !quickTimeRef.current.contains(event.target)) {
        setShowQuickTimeDropdown(false);
      }
      if (showCustomTimeDropdown && customTimeRef.current && !customTimeRef.current.contains(event.target)) {
        setShowCustomTimeDropdown(false);
      }
      if (showDateDropdown && dateRef.current && !dateRef.current.contains(event.target)) {
        setShowDateDropdown(false);
      }
      
      if (!event.target.closest('.table-select-container')) {
        setOpenItemTypeIndex(null);
        setOpenServiceIndex(null);
        setOpenSizeIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQuickTimeDropdown, showCustomTimeDropdown, showDateDropdown]);

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

  const getFormattedDateLabel = (dateStr) => {
    if (!dateStr) return '';
    try {
      const dateObj = new Date(dateStr);
      return dateObj.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (err) {
      return dateStr;
    }
  };

  const handleSelectDate = (targetDate) => {
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    setDeliveryDate(`${yyyy}-${mm}-${dd}`);
    setShowDateDropdown(false);
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const WEEKDAYS = ['أح', 'اث', 'ثلا', 'أر', 'خم', 'جم', 'سب'];

  // بيانات العميل
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
  const [customerError, setCustomerError] = useState('');

  // عناصر الطلب
  const [items, setItems] = useState([
    { item_type: '', size_name: '', service_id: '', price: 0, notes: '' }
  ]);
  const [itemTypes, setItemTypes] = useState([]);
  const [openSizeIndex, setOpenSizeIndex] = useState(null);

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

    itemTypesAPI.getAll()
      .then(res => {
        if (res.success) {
          setItemTypes(res.data);
          // تهيئة السطر الأول بالقيمة الافتراضية لأول نوع قطعة متوفر
          if (res.data && res.data.length > 0) {
            const firstType = res.data[0];
            const defaultSize = firstType.sizes && firstType.sizes.length > 0 ? firstType.sizes[0].size_name : 'عادي';
            setItems([
              { item_type: firstType.name_ar, size_name: defaultSize, service_id: '', price: 0, notes: '' }
            ]);
          }
        }
      })
      .catch(err => console.error('خطأ في تحميل أنواع الملابس', err));

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
    const defaultType = itemTypes.length > 0 ? itemTypes[0].name_ar : '';
    const defaultSize = itemTypes.length > 0 && itemTypes[0].sizes && itemTypes[0].sizes.length > 0 ? itemTypes[0].sizes[0].size_name : 'عادي';
    setItems([...items, { item_type: defaultType, size_name: defaultSize, service_id: '', price: 0, notes: '' }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  // دالة مساعدة لتحديث السعر بناء على نوع القطعة والحجم والخدمة
  const updateItemPrice = (newItems, index) => {
    const item = newItems[index];
    const foundType = itemTypes.find(t => t.name_ar === item.item_type);
    
    if (foundType && item.service_id) {
      const foundSize = (foundType.sizes || []).find(s => s.size_name === item.size_name) 
        || (foundType.sizes && foundType.sizes.length > 0 ? foundType.sizes[0] : null);
        
      if (foundSize) {
        const foundPrice = (foundSize.prices || []).find(p => p.service_id === parseInt(item.service_id));
        if (foundPrice) {
          item.price = foundPrice.price;
          return;
        }
      }
    }
    
    // Fallback لأسعار الخدمة العامة
    const service = services.find(s => s.id === parseInt(item.service_id));
    if (service) {
      item.price = service.price;
    } else {
      item.price = 0;
    }
  };

  const handleItemTypeChange = (index, value) => {
    const newItems = [...items];
    newItems[index].item_type = value;
    
    // تحديد الحجم الافتراضي الأول للقطعة الجديدة
    const foundType = itemTypes.find(t => t.name_ar === value);
    if (foundType && foundType.sizes && foundType.sizes.length > 0) {
      newItems[index].size_name = foundType.sizes[0].size_name;
    } else {
      newItems[index].size_name = 'عادي';
    }

    updateItemPrice(newItems, index);
    setItems(newItems);
  };

  const handleSizeChange = (index, sizeName) => {
    const newItems = [...items];
    newItems[index].size_name = sizeName;
    updateItemPrice(newItems, index);
    setItems(newItems);
  };

  const handleServiceChange = (index, serviceId) => {
    const newItems = [...items];
    newItems[index].service_id = serviceId;
    updateItemPrice(newItems, index);
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

  const fitItemNotesField = (element) => {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
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
          size_name: item.size_name,
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
        
        const deliveryDateStr = expectedDate.toLocaleString(i18n.language === 'en' ? 'en-US' : 'ar-EG', {
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
              title={t('orders.customerData') || 'بيانات العميل'}
            >
              {!selectedCustomer ? (
                <div className="customer-selector">
                  <div className="search-box">
                    <input
                      type="text"
                      className="form-input"
                      placeholder={t('orders.searchCustomer') || 'ابحث بالاسم أو رقم الهاتف...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search size={18} className="search-icon" />

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
                  </div>

                  <div className="divider-or"><span>{t('orders.or') || 'أو'}</span></div>

                  <Button variant="secondary" className="w-full" onClick={() => setShowAddCustomerModal(true)}>
                    <UserPlus size={18} style={{ marginInlineStart: '8px' }} />
                    {t('orders.addNewCustomer') || 'إضافة عميل جديد'}
                  </Button>
                </div>
              ) : (
                <div className="selected-customer-card">
                  <div className="customer-info-detail">
                    <h3>{selectedCustomer.name}</h3>
                    <p>{t('orders.phone') || 'رقم الهاتف'}: {selectedCustomer.phone}</p>
                    {selectedCustomer.address && <p>{t('orders.address') || 'العنوان'}: {selectedCustomer.address}</p>}
                  </div>
                  <Button variant="ghost" className="text-error mt-sm w-full" onClick={() => setSelectedCustomer(null)}>
                    {t('orders.changeCustomer') || 'تغيير العميل'}
                  </Button>
                </div>
              )}

              <div className="form-group mt-sm">
                <label className="form-label label-compact">{t('orders.orderNotes') || 'ملاحظات الطلب'}</label>
                <textarea
                  className="form-textarea form-textarea-compact"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder={t('orders.orderNotesPlaceholder') || 'ملاحظات عامة حول الطلب...'}
                  rows={2}
                />
              </div>
            </Card>
          </div>

          <div className="layout-card-wrapper">
            <Card title={t('orders.deliveryDetails') || 'تفاصيل التسليم والجدولة'}>
              <div className="form-group">
                {weeklyWorkload && weeklyWorkload.length > 0 && (
                  <div className="weekly-workload-cards-section">
                    <span className="help-text-label font-bold mb-xs" style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {t('orders.chooseDeliveryDate') || 'اختر يوم التسليم (مقياس ضغط العمل للـ 7 أيام القادمة):'}
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
                              <span className="status-count">{day.count} {t('dashboard.items', 'قطعة')}</span>
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
                        <span className="help-text">{t('orders.deliveryPeriod') || 'فترة التسليم'}</span>
                        <div className="schedule-presets-grid">
                          <button 
                            type="button" 
                            className={`preset-pill ${(activeTimePreset === 'morning') ? 'active' : ''}`}
                            onClick={() => applyTimePreset('morning')}
                          >
                            {t('orders.morning') || 'صباحاً (10 ص)'}
                          </button>
                          <button 
                            type="button" 
                            className={`preset-pill ${(activeTimePreset === 'afternoon') ? 'active' : ''}`}
                            onClick={() => applyTimePreset('afternoon')}
                          >
                            {t('orders.afternoon') || 'عصراً (4 م)'}
                          </button>
                          <button 
                            type="button" 
                            className={`preset-pill ${(activeTimePreset === 'evening') ? 'active' : ''}`}
                            onClick={() => applyTimePreset('evening')}
                          >
                            {t('orders.evening') || 'مساءً (8 م)'}
                          </button>
                          {activeTimePreset === 'custom' ? (
                            <button 
                              type="button" 
                              className="preset-pill active"
                              onClick={() => applyTimePreset('rush3')}
                            >
                              {t('orders.other') || 'آخر'}
                            </button>
                          ) : (
                            <button 
                              type="button" 
                              className={`preset-pill preset-pill-rush ${(activeTimePreset === 'rush3') ? 'active' : ''}`}
                              onClick={() => applyTimePreset('rush3')}
                            >
                              {t('orders.rush') || 'مستعجل (3س)'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ساعة التسليم الدقيقة */}
                      <div>
                        <span className="help-text">{t('orders.deliveryTime') || 'ساعة التسليم'}</span>
                        <div className="custom-time-select-container" ref={quickTimeRef}>
                          <button
                            type="button"
                            className="time-select-trigger"
                            onClick={() => setShowQuickTimeDropdown(!showQuickTimeDropdown)}
                          >
                            {renderTimeLabel(deliveryTime)}
                          </button>
                          {showQuickTimeDropdown && (
                            <div className="time-select-dropdown">
                              {getTimeOptions(t).map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  className={`time-select-item ${deliveryTime === opt.value ? 'selected' : ''}`}
                                  onClick={() => {
                                    setDeliveryTime(opt.value);
                                    setActiveTimePreset('custom');
                                    setShowQuickTimeDropdown(false);
                                  }}
                                >
                                  {renderTimeLabel(opt.value)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="custom-datetime-container">
                      <div className="flex gap-sm">
                        <div style={{ flex: 1 }}>
                          <span className="help-text">{t('orders.deliveryDate') || 'تاريخ التسليم'}</span>
                          <div className="custom-date-select-container" ref={dateRef}>
                            <button
                              type="button"
                              className="date-select-trigger"
                              onClick={() => setShowDateDropdown(!showDateDropdown)}
                            >
                              {getFormattedDateLabel(deliveryDate) || t('orders.chooseDate') || 'اختر التاريخ...'}
                            </button>
                            {showDateDropdown && (
                              <div className="date-select-dropdown">
                                <div className="calendar-header">
                                  <button type="button" className="btn-month-nav" onClick={handlePrevMonth}>
                                    <ChevronRight size={16} />
                                  </button>
                                  <span className="month-year-label">
                                    {viewDate.toLocaleString(i18n.language === 'en' ? 'en-US' : 'ar-EG', { month: 'long', year: 'numeric' })}
                                  </span>
                                  <button type="button" className="btn-month-nav" onClick={handleNextMonth}>
                                    <ChevronLeft size={16} />
                                  </button>
                                </div>
                                <div className="calendar-grid-weekdays">
                                  {WEEKDAYS.map(day => (
                                    <div key={day} className="weekday-header">{day}</div>
                                  ))}
                                </div>
                                <div className="calendar-grid-days">
                                  {getDaysInMonthGrid(viewDate).map((cell, idx) => {
                                    const cellDateStr = cell.date.toISOString().split('T')[0];
                                    const isSelected = deliveryDate === cellDateStr;
                                    const isToday = new Date().toISOString().split('T')[0] === cellDateStr;
                                    const isPast = cell.date < new Date(new Date().setHours(0,0,0,0));
                                    
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        disabled={isPast}
                                        className={`calendar-day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                                        onClick={() => handleSelectDate(cell.date)}
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
                        <div style={{ flex: 1 }}>
                          <span className="help-text">وقت التسليم</span>
                          <div className="custom-time-select-container" ref={customTimeRef}>
                            <button
                              type="button"
                              className="time-select-trigger"
                              onClick={() => setShowCustomTimeDropdown(!showCustomTimeDropdown)}
                            >
                              {renderTimeLabel(deliveryTime)}
                            </button>
                            {showCustomTimeDropdown && (
                              <div className="time-select-dropdown">
                                {getTimeOptions(t).map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    className={`time-select-item ${deliveryTime === opt.value ? 'selected' : ''}`}
                                    onClick={() => {
                                      setDeliveryTime(opt.value);
                                      setShowCustomTimeDropdown(false);
                                    }}
                                  >
                                    {renderTimeLabel(opt.value)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="scheduler-result-bar">
                    {deliveryDate && deliveryTime && (
                      <div className="scheduler-result-text">
                        <span className="result-label">الموعد المحدد:</span>
                        <span className="result-value">
                          {new Date(`${deliveryDate}T${deliveryTime}`).toLocaleString(i18n.language === 'en' ? 'en-US' : 'ar-EG', {
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
            <Card title={t('orders.itemsAdded') || 'قطع الملابس / السجاد المضافة للطلب'}>
              <div className="items-table-container">
                <table className="new-order-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: '27%' }}>{t('orders.itemType') || 'نوع القطعة'}</th>
                      <th style={{ width: '16%' }}>{t('orders.size') || 'الحجم'}</th>
                      <th style={{ width: '30%' }}>{t('orders.requiredService') || 'الخدمة المطلوبة'}</th>
                      <th style={{ width: '17%', minWidth: '110px' }}>{t('orders.price') || 'السعر'}</th>
                      <th style={{ width: '10%' }}>{t('orders.action') || 'إجراء'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <Fragment key={index}>
                      <tr className="item-main-row">
                        <td>
                          <div className="table-select-container">
                            <button
                              type="button"
                              className="table-select-trigger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenServiceIndex(null);
                                setOpenSizeIndex(null);
                                setOpenItemTypeIndex(openItemTypeIndex === index ? null : index);
                              }}
                            >
                              {item.item_type || t('orders.chooseItem') || 'اختر القطعة...'}
                            </button>
                            {openItemTypeIndex === index && (
                              <div className="table-select-dropdown">
                                {itemTypes.map((t) => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    className={`table-select-item ${item.item_type === t.name_ar ? 'selected' : ''}`}
                                    onClick={() => {
                                      handleItemTypeChange(index, t.name_ar);
                                      setOpenItemTypeIndex(null);
                                    }}
                                  >
                                    {t.name_ar}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="table-select-container">
                            <button
                              type="button"
                              className="table-select-trigger"
                              disabled={!item.item_type}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenItemTypeIndex(null);
                                setOpenServiceIndex(null);
                                setOpenSizeIndex(openSizeIndex === index ? null : index);
                              }}
                            >
                              {item.size_name || t('orders.normalSize') || 'عادي'}
                            </button>
                            {openSizeIndex === index && item.item_type && (
                              <div className="table-select-dropdown">
                                {(itemTypes.find(t => t.name_ar === item.item_type)?.sizes || []).map((sz) => (
                                  <button
                                    key={sz.id}
                                    type="button"
                                    className={`table-select-item ${item.size_name === sz.size_name ? 'selected' : ''}`}
                                    onClick={() => {
                                      handleSizeChange(index, sz.size_name);
                                      setOpenSizeIndex(null);
                                    }}
                                  >
                                    {sz.size_name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="table-select-container">
                            <button
                              type="button"
                              className="table-select-trigger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenItemTypeIndex(null);
                                setOpenSizeIndex(null);
                                setOpenServiceIndex(openServiceIndex === index ? null : index);
                              }}
                            >
                              {services.find(s => s.id === parseInt(item.service_id))?.name_ar || t('orders.chooseService') || 'اختر الخدمة...'}
                            </button>
                            {openServiceIndex === index && (
                              <div className="table-select-dropdown">
                                <button
                                  type="button"
                                  className={`table-select-item ${!item.service_id ? 'selected' : ''}`}
                                  onClick={() => {
                                    handleServiceChange(index, '');
                                    setOpenServiceIndex(null);
                                  }}
                                >
                                  {t('orders.chooseService') || 'اختر الخدمة...'}
                                </button>
                                {services.map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    className={`table-select-item ${item.service_id === String(s.id) ? 'selected' : ''}`}
                                    onClick={() => {
                                      handleServiceChange(index, String(s.id));
                                      setOpenServiceIndex(null);
                                    }}
                                  >
                                    {s.name_ar}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="price-input-wrapper">
                            <input
                              type="number"
                              className="form-input form-input-compact price-input"
                              value={item.price === 0 ? '' : item.price}
                              onChange={(e) => handlePriceChange(index, e.target.value)}
                              min="0"
                              step="any"
                              placeholder="0"
                            />
                            <span className="price-suffix">{t('dashboard.currency', 'ر.س')}</span>
                          </div>
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
                      <tr className="item-notes-row">
                        <td colSpan={5}>
                          <div className="item-notes-field">
                            <span className="item-notes-label">{t('orders.itemNotes') || 'ملاحظات على القطعة'}</span>
                            <textarea
                              className="form-input form-input-compact item-notes-input"
                              value={item.notes}
                              onChange={(e) => {
                                handleNotesChange(index, e.target.value);
                                fitItemNotesField(e.target);
                              }}
                              onInput={(e) => fitItemNotesField(e.target)}
                              ref={fitItemNotesField}
                              placeholder={t('orders.itemNotesPlaceholder') || 'مثال: بقعة زيت، تلف بالكم...'}
                              rows={1}
                            />
                          </div>
                        </td>
                      </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <button type="button" className="btn-add-item-dashed mt-md" onClick={addItemRow}>
                <Plus size={16} style={{ marginLeft: '6px' }} />
                {t('orders.addNewItem') || 'إضافة قطعة جديدة للطلب'}
              </button>
            </Card>
          </div>

          <div className="bottom-checkout-wrapper">
            {/* تفاصيل التكلفة والدفع */}
            <Card title={t('orders.invoiceDetails') || 'تفاصيل الفاتورة والدفع'}>
              <div className="financials-summary-box">
                <div className="financial-row">
                  <span>{t('orders.totalOrder') || 'إجمالي الطلب:'}</span>
                  <span className="amount-val-total">{totalAmount.toFixed(2)} {settings.currency}</span>
                </div>
                <div className="financial-row">
                  <span>{t('orders.paidAmount') || 'المبلغ المدفوع (مقدم):'}</span>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      className="form-input inline-input"
                      value={paidAmount === 0 ? '' : paidAmount}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      max={totalAmount}
                      min="0"
                      step="any"
                      placeholder="0"
                    />
                    <span className="suffix">{settings.currency}</span>
                  </div>
                </div>
                <div className="financial-row">
                  <span>{t('orders.remainingAmount') || 'المتبقي عند التسليم:'}</span>
                  <span className={`amount-badge ${remainingAmount > 0 ? 'unpaid' : 'paid'}`}>
                    {remainingAmount.toFixed(2)} {settings.currency}
                  </span>
                </div>

                <div className="financial-row">
                  <span>{t('orders.paymentMethod') || 'طريقة الدفع:'}</span>
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
                      {t('orders.cash') || 'نقدي (كاش)'}
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
                      {t('orders.electronic') || 'إلكتروني'}
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
                  {isSubmitting ? t('orders.saving') || 'جاري الحفظ...' : t('orders.saveOrder') || 'حفظ الطلب وتوليد الفاتورة'}
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
        title={t('orders.addCustomerModalTitle') || 'إضافة عميل جديد للنظام'}
      >
        <form onSubmit={handleAddCustomer}>
          {customerError && <div className="alert-message error mb-sm">{customerError}</div>}
          <div className="form-group">
            <label className="form-label">{t('orders.customerNameLabel') || 'اسم العميل *'}</label>
            <input
              type="text"
              className="form-input"
              required
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              placeholder={t('orders.customerNamePlaceholder') || 'مثال: عبد الرحمن محمد'}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('orders.phoneLabel') || 'رقم الجوال *'}</label>
            <input
              type="text"
              className="form-input"
              required
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              placeholder={t('orders.phonePlaceholder') || 'مثال: 0500000000'}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('orders.addressOptional') || 'العنوان (اختياري)'}</label>
            <input
              type="text"
              className="form-input"
              value={newCustomer.address}
              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              placeholder={t('orders.addressPlaceholder') || 'مثال: حي الصحافة، الرياض'}
            />
          </div>
          <div className="flex justify-between mt-md">
            <Button variant="secondary" type="button" onClick={() => setShowAddCustomerModal(false)}>
              {t('orders.cancel') || 'إلغاء'}
            </Button>
            <Button variant="primary" type="submit">
              {t('orders.saveSelectCustomer') || 'حفظ وتحديد العميل'}
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
          title={t('orders.orderSavedSuccess') || 'تم حفظ الطلب بنجاح'}
          size="medium"
        >
          <div className="print-modal-content">
            <div className="success-banner text-center mb-md">
              <div className="success-icon-wrapper">✓</div>
              <h2>{t('orders.orderNum', { id: createdOrder.id }) || `رقم الطلب: #${createdOrder.id}`}</h2>
              <p>{t('orders.orderSavedMsg', { count: createdOrder.items?.length || 0 }) || `تم تسجيل الطلب وإدخال ${createdOrder.items?.length || 0} قطع بنجاح`}</p>
            </div>

            <div className="print-options-grid">
              <Button variant="primary" className="print-option-btn" onClick={handlePrintInvoice}>
                <Printer size={20} style={{ marginLeft: '8px' }} />
                {t('orders.printInvoice') || 'طباعة الفاتورة'}
              </Button>
              <Button variant="secondary" className="print-option-btn" onClick={handlePrintLabels}>
                <FileText size={20} style={{ marginLeft: '8px' }} />
                {t('orders.printLabels') || 'طباعة ملصقات القطع'}
              </Button>
              <Button variant="secondary" onClick={() => {
                setShowPrintModal(false);
                navigate('/orders');
              }}>
                {t('orders.goToOrdersList') || 'الذهاب لقائمة الطلبات'}
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
