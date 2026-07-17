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
import LocationPickerModal from '../../components/Map/LocationPickerModal';
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

  const getLocalizedDayName = (dayNameAr) => {
    const map = {
      'اليوم': t('orders.today') || 'Today',
      'غداً': t('orders.tomorrow') || 'Tomorrow',
      'غدا': t('orders.tomorrow') || 'Tomorrow',
      'الأحد': t('days.sunday') || 'Sunday',
      'الاثنين': t('days.monday') || 'Monday',
      'الإثنين': t('days.monday') || 'Monday',
      'الثلاثاء': t('days.tuesday') || 'Tuesday',
      'الأربعاء': t('days.wednesday') || 'Wednesday',
      'الخميس': t('days.thursday') || 'Thursday',
      'الجمعة': t('days.friday') || 'Friday',
      'السبت': t('days.saturday') || 'Saturday',
    };
    return map[dayNameAr] || dayNameAr;
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
    // JS standard getDay() returns 0 for Sunday, 1 for Monday, etc.
    // Sunday is index 0 in WEEKDAYS ['أح', 'إث', 'ثلا', 'أر', 'خم', 'جم', 'سب']
    const startDayOfWeek = firstDay.getDay(); 
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();
    const daysGrid = [];
    
    // First, fill in days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayVal = prevTotalDays - i;
      daysGrid.push({
        dayNum: dayVal,
        isCurrentMonth: false,
        date: new Date(year, month - 1, dayVal)
      });
    }
    
    // Second, fill in days of current month
    for (let i = 1; i <= totalDays; i++) {
      daysGrid.push({
        dayNum: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    // Finally, pad with days of next month to complete the 42-day (6x7) calendar grid
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

  const WEEKDAYS = i18n.language === 'en' 
    ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] 
    : ['أح', 'إث', 'ثلا', 'أر', 'خم', 'جم', 'سب'];

  // دالة مساعدة للحصول على مسودة من localStorage
  const getDraftValue = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === null || saved === undefined) return defaultValue;
      return saved;
    } catch {
      return defaultValue;
    }
  };

  const getDraftJSON = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return defaultValue;
      return JSON.parse(saved);
    } catch {
      return defaultValue;
    }
  };

  // بيانات العميل
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(() => getDraftJSON('draft_order_customer', null));
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapTarget, setMapTarget] = useState('selected'); // 'selected' أو 'new'
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', latitude: null, longitude: null });
  const [customerError, setCustomerError] = useState('');

  // الحصول على إحداثيات المغسلة الحالية من بيانات تسجيل الدخول لتحديد نطاق الخريطة
  const getLaundryLocation = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.laundry_lat && user.laundry_lng) {
          return { lat: parseFloat(user.laundry_lat), lng: parseFloat(user.laundry_lng) };
        }
      }
    } catch (e) {
      console.error('Failed to get laundry coordinates', e);
    }
    return undefined;
  };
  const laundryLocation = getLaundryLocation();

  // عناصر الطلب
  const [items, setItems] = useState(() => getDraftJSON('draft_order_items', [
    { item_type: '', size_name: '', service_id: '', price: 0, notes: '' }
  ]));
  const [itemTypes, setItemTypes] = useState([]);
  const [openSizeIndex, setOpenSizeIndex] = useState(null);

  // تفاصيل الجدولة
  const getTomorrowDate = () => {
    const target = new Date();
    target.setDate(target.getDate() + 1);
    return target.toISOString().split('T')[0];
  };

  const [deliveryDate, setDeliveryDate] = useState(() => getDraftValue('draft_order_deliveryDate', getTomorrowDate()));
  const [deliveryTime, setDeliveryTime] = useState(() => getDraftValue('draft_order_deliveryTime', '16:00')); // الساعة 4:00 عصراً افتراضي
  const [activeTimePreset, setActiveTimePreset] = useState(() => getDraftValue('draft_order_activeTimePreset', 'afternoon'));
  const [isCustomDelivery, setIsCustomDelivery] = useState(() => getDraftJSON('draft_order_isCustomDelivery', false));
  const [orderNotes, setOrderNotes] = useState(() => getDraftValue('draft_order_orderNotes', ''));
  const [paymentMethod, setPaymentMethod] = useState(() => getDraftValue('draft_order_paymentMethod', 'cash'));
  const [paidAmount, setPaidAmount] = useState(() => {
    const val = getDraftValue('draft_order_paidAmount', '0');
    return parseFloat(val) || 0;
  });

  // معالجة الطباعة والنجاح
  const [createdOrder, setCreatedOrder] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workloadStatus, setWorkloadStatus] = useState(null);
  const [weeklyWorkload, setWeeklyWorkload] = useState([]);

  // حفظ مسودة الطلب تلقائياً في localStorage عند تغيير أي من حقول المدخلات
  useEffect(() => {
    try {
      localStorage.setItem('draft_order_customer', selectedCustomer ? JSON.stringify(selectedCustomer) : '');
      localStorage.setItem('draft_order_items', JSON.stringify(items));
      localStorage.setItem('draft_order_deliveryDate', deliveryDate || '');
      localStorage.setItem('draft_order_deliveryTime', deliveryTime || '');
      localStorage.setItem('draft_order_activeTimePreset', activeTimePreset || '');
      localStorage.setItem('draft_order_isCustomDelivery', JSON.stringify(isCustomDelivery));
      localStorage.setItem('draft_order_orderNotes', orderNotes || '');
      localStorage.setItem('draft_order_paymentMethod', paymentMethod || '');
      localStorage.setItem('draft_order_paidAmount', String(paidAmount || 0));
    } catch (e) {
      console.error('Failed to save order draft', e);
    }
  }, [
    selectedCustomer,
    items,
    deliveryDate,
    deliveryTime,
    activeTimePreset,
    isCustomDelivery,
    orderNotes,
    paymentMethod,
    paidAmount
  ]);

  // دالة لمسح مسودة الطلب من localStorage
  const clearOrderDraft = () => {
    try {
      localStorage.removeItem('draft_order_customer');
      localStorage.removeItem('draft_order_items');
      localStorage.removeItem('draft_order_deliveryDate');
      localStorage.removeItem('draft_order_deliveryTime');
      localStorage.removeItem('draft_order_activeTimePreset');
      localStorage.removeItem('draft_order_isCustomDelivery');
      localStorage.removeItem('draft_order_orderNotes');
      localStorage.removeItem('draft_order_paymentMethod');
      localStorage.removeItem('draft_order_paidAmount');
    } catch (e) {
      console.error('Failed to clear order draft', e);
    }
  };

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
          // تهيئة السطر الأول بالقيمة الافتراضية لأول نوع قطعة متوفر فقط إذا لم تكن هناك مسودة محفوظة
          const savedItems = localStorage.getItem('draft_order_items');
          if (!savedItems && res.data && res.data.length > 0) {
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
    setItems([...items, { item_type: '', size_name: '', service_id: '', price: 0, notes: '' }]);
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

  const handleSizeTextChange = (index, value) => {
    const newItems = [...items];
    newItems[index].size_name = value;
    setItems(newItems);
  };

  // rug calculator state per item
  const [rugCalc, setRugCalc] = useState({}); // { [index]: { open, w, h } }
  const toggleRugCalc = (index) => {
    setRugCalc(prev => ({ ...prev, [index]: { open: !prev[index]?.open, w: prev[index]?.w || '', h: prev[index]?.h || '' } }));
  };
  const setRugCalcVal = (index, field, val) => {
    setRugCalc(prev => ({ ...prev, [index]: { ...prev[index], [field]: val } }));
  };
  const applyRugCalc = (index) => {
    const w = parseFloat(rugCalc[index]?.w) || 0;
    const h = parseFloat(rugCalc[index]?.h) || 0;
    if (w > 0 && h > 0) {
      const meters = (w * h).toFixed(2);
      handleSizeTextChange(index, `${w}×${h} م (${meters} م²)`);
      setRugCalc(prev => ({ ...prev, [index]: { ...prev[index], open: false } }));
    }
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
        setNewCustomer({ name: '', phone: '', address: '', latitude: null, longitude: null });
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

    // التحقق من اكتمال بيانات كل قطعة (نوع القطعة إلزامي فقط)
    const emptyItems = items
      .map((item, i) => ({ index: i + 1, item }))
      .filter(({ item }) => !item.item_type?.trim());

    if (emptyItems.length > 0) {
      const labels = emptyItems.map(({ index }) => `القطعة ${index}`).join(' و ');
      showToast(
        emptyItems.length === 1
          ? `${labels}: يرجى إدخال نوع القطعة قبل حفظ الطلب`
          : `${labels}: يرجى إدخال نوع كل قطعة قبل حفظ الطلب`,
        'warning'
      );
      return;
    }

    if (!deliveryDate || !deliveryTime) {
      showToast('يرجى تحديد تاريخ ووقت التسليم', 'error');
      return;
    }

    const expectedDate = new Date(`${deliveryDate}T${deliveryTime}`);
    if (isNaN(expectedDate.getTime())) {
      showToast('تاريخ ووقت التسليم غير صالحين', 'error');
      return;
    }

    setIsSubmitting(true);
    try {

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
        notes: orderNotes,
        delivery_address: selectedCustomer.address || '',
        delivery_lat: selectedCustomer.latitude || null,
        delivery_lng: selectedCustomer.longitude || null
      };

      const res = await ordersAPI.create(orderData);
      if (res.success) {
        const newOrderData = res.data;
        setCreatedOrder(newOrderData);
        showToast('تم حفظ وإنشاء الطلب بنجاح! 🎉', 'success');
        setShowPrintModal(true);
        clearOrderDraft();

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

                  {/* صندوق العنوان والموقع التفاعلي للطلب */}
                  <div className="order-customer-map-box mt-sm p-sm rounded-lg" style={{ background: 'var(--bg-body, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div className="flex items-center justify-between mb-xs">
                      <span className="text-xs font-bold text-primary flex items-center gap-xs">
                        📍 عنوان وموقع التوصيل على الخريطة
                      </span>
                      {selectedCustomer.latitude && selectedCustomer.longitude ? (
                        <span className="badge badge-success text-xs">تم تحديد الإحداثيات ✓</span>
                      ) : (
                        <span className="badge badge-warning text-xs">لم يتم التحديد بدقة</span>
                      )}
                    </div>
                    {selectedCustomer.address ? (
                      <p className="text-sm font-medium mb-xs">{selectedCustomer.address}</p>
                    ) : (
                      <p className="text-xs text-muted mb-xs">لم يتم إدخال عنوان لهذا العميل بعد</p>
                    )}
                    <Button 
                      type="button" 
                      variant="secondary" 
                      size="sm" 
                      className="w-full mt-xs flex items-center justify-center gap-xs"
                      style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff', border: 'none' }}
                      onClick={() => {
                        setMapTarget('selected');
                        setShowMapModal(true);
                      }}
                    >
                      🗺️ {selectedCustomer.latitude ? 'تعديل موقع التوصيل على الخريطة التفاعلية' : 'تحديد الموقع على الخريطة التفاعلية للمندوب'}
                    </Button>
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
                            <span className="day-name">{getLocalizedDayName(day.dayName)}</span>
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
                              <div style={{ gridColumn: 'span 3', padding: '6px 0 10px 0', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px' }} onClick={e => e.stopPropagation()}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                                  أو اختر وقت مخصص:
                                </span>
                                <input
                                  type="time"
                                  className="form-input"
                                  style={{ height: '36px', padding: '0 8px', fontSize: '0.85rem', direction: 'ltr', textAlign: 'center', margin: 0 }}
                                  value={deliveryTime || ''}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setDeliveryTime(e.target.value);
                                      setActiveTimePreset('custom');
                                    }
                                  }}
                                />
                              </div>
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
                                    const yyyy = cell.date.getFullYear();
                                    const mm = String(cell.date.getMonth() + 1).padStart(2, '0');
                                    const dd = String(cell.date.getDate()).padStart(2, '0');
                                    const cellDateStr = `${yyyy}-${mm}-${dd}`;
                                    
                                    const isSelected = deliveryDate === cellDateStr;
                                    
                                    const todayObj = new Date();
                                    const tY = todayObj.getFullYear();
                                    const tM = String(todayObj.getMonth() + 1).padStart(2, '0');
                                    const tD = String(todayObj.getDate()).padStart(2, '0');
                                    const todayStr = `${tY}-${tM}-${tD}`;
                                    const isToday = todayStr === cellDateStr;
                                    
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
                                <div style={{ gridColumn: 'span 3', padding: '6px 0 10px 0', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px' }} onClick={e => e.stopPropagation()}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                                    أو اختر وقت مخصص:
                                  </span>
                                  <input
                                    type="time"
                                    className="form-input"
                                    style={{ height: '36px', padding: '0 8px', fontSize: '0.85rem', direction: 'ltr', textAlign: 'center', margin: 0 }}
                                    value={deliveryTime || ''}
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        setDeliveryTime(e.target.value);
                                      }
                                    }}
                                  />
                                </div>
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
                        <span className="result-label">{t('orders.selectedDate') || 'الموعد المحدد:'}</span>
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
                      {isCustomDelivery ? (t('orders.quickSelect') || 'تحديد سريع') : (t('orders.customDate') || 'موعد مخصص')}
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
              <div className="order-items-list-container">
                {/* Desktop Headers */}
                <div className="order-items-header-row">
                  <div className="header-col item-type-col">{t('orders.itemType') || 'نوع القطعة'}</div>
                  <div className="header-col size-col">{t('orders.size') || 'الحجم'}</div>
                  <div className="header-col service-col">{t('orders.requiredService') || 'الخدمة المطلوبة'}</div>
                  <div className="header-col price-col">{t('orders.price') || 'السعر'}</div>
                  <div className="header-col action-col">{t('orders.action') || 'إجراء'}</div>
                </div>

                {/* Items Cards List */}
                <div className="order-items-cards-list">
                  {items.map((item, index) => (
                    <div className="order-item-card" key={index}>

                      {/* Card Header: number + delete */}
                      <div className="item-card-header">
                        <span className="item-card-number">
                          قطعة #{index + 1}
                        </span>
                        <button
                          type="button"
                          className="btn-remove-row text-error"
                          onClick={() => removeItemRow(index)}
                          disabled={items.length === 1}
                          title="حذف هذه القطعة"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Main Fields Row */}
                      <div className="order-item-grid">

                        {/* Item Type */}
                        <div className="order-item-col item-type-col" data-label={t('orders.itemType') || 'نوع القطعة'}>
                          <div className="item-field-group">
                            <label className="item-field-label">{t('orders.itemType') || 'نوع القطعة'} <span className="field-required">*</span></label>
                            <div className="item-type-input-wrapper">
                              <input
                                type="text"
                                list={`item-type-list-${index}`}
                                className="form-input item-type-free-input"
                                value={item.item_type}
                                onChange={(e) => handleItemTypeChange(index, e.target.value)}
                                placeholder="بطانية، سجادة، قميص..."
                                autoComplete="off"
                              />
                              <datalist id={`item-type-list-${index}`}>
                                {itemTypes.map((it) => (
                                  <option key={it.id} value={it.name_ar} />
                                ))}
                              </datalist>
                            </div>
                          </div>
                        </div>

                        {/* Size + Rug Calculator */}
                        <div className="order-item-col size-col" data-label={t('orders.size') || 'الحجم'}>
                          <div className="item-field-group">
                            <label className="item-field-label">
                              {t('orders.size') || 'الحجم'}
                              <span className="field-optional">اختياري</span>
                            </label>
                            <div className="size-field-wrapper">
                              <div className="size-input-row">
                                <input
                                  type="text"
                                  className="form-input size-free-input"
                                  value={item.size_name}
                                  onChange={(e) => handleSizeTextChange(index, e.target.value)}
                                  placeholder="مثال: كبير، L"
                                />
                                <button
                                  type="button"
                                  className={`rug-calc-toggle-btn ${rugCalc[index]?.open ? 'active' : ''}`}
                                  title="حاسبة مساحة السجادة"
                                  onClick={() => toggleRugCalc(index)}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20"/><path d="M4 4v16"/><path d="M20 4v16"/><path d="M4 12h16"/><path d="M9 4v8"/><path d="M15 12v8"/></svg>
                                </button>
                              </div>

                              {rugCalc[index]?.open && (
                                <div className="rug-calculator-popover" onClick={e => e.stopPropagation()}>
                                  <div className="rug-calc-header">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 20h20"/><path d="M4 4v16"/><path d="M20 4v16"/><path d="M4 12h16"/><path d="M9 4v8"/><path d="M15 12v8"/></svg>
                                    حاسبة مساحة السجادة
                                  </div>
                                  <div className="rug-calc-inputs">
                                    <div className="rug-calc-field">
                                      <label>العرض (م)</label>
                                      <input
                                        type="number"
                                        className="form-input rug-calc-input"
                                        value={rugCalc[index]?.w || ''}
                                        onChange={(e) => setRugCalcVal(index, 'w', e.target.value)}
                                        placeholder="2"
                                        step="0.5"
                                        min="0"
                                      />
                                    </div>
                                    <div className="rug-calc-multiply">×</div>
                                    <div className="rug-calc-field">
                                      <label>الطول (م)</label>
                                      <input
                                        type="number"
                                        className="form-input rug-calc-input"
                                        value={rugCalc[index]?.h || ''}
                                        onChange={(e) => setRugCalcVal(index, 'h', e.target.value)}
                                        placeholder="3"
                                        step="0.5"
                                        min="0"
                                      />
                                    </div>
                                    <div className="rug-calc-field rug-calc-equals-field">
                                      <label>المساحة</label>
                                      <div className="rug-calc-area-display">
                                        {(rugCalc[index]?.w && rugCalc[index]?.h)
                                          ? `${(parseFloat(rugCalc[index].w) * parseFloat(rugCalc[index].h)).toFixed(2)} م²`
                                          : '— م²'}
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="rug-calc-apply-btn"
                                    onClick={() => applyRugCalc(index)}
                                    disabled={!rugCalc[index]?.w || !rugCalc[index]?.h}
                                  >
                                    تطبيق على حقل الحجم
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Service */}
                        <div className="order-item-col service-col" data-label={t('orders.requiredService') || 'الخدمة المطلوبة'}>
                          <div className="item-field-group">
                            <label className="item-field-label">
                              {t('orders.requiredService') || 'الخدمة المطلوبة'}
                              <span className="field-optional">اختياري</span>
                            </label>
                            <div className="table-select-container" style={{ zIndex: openServiceIndex === index ? 100 : 1 }}>
                              <button
                                type="button"
                                className={`table-select-trigger service-trigger ${!item.service_id ? 'service-empty' : 'service-selected'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenItemTypeIndex(null);
                                  setOpenSizeIndex(null);
                                  setOpenServiceIndex(openServiceIndex === index ? null : index);
                                }}
                              >
                                {item.service_id
                                  ? services.find(s => s.id === parseInt(item.service_id))?.name_ar || 'اختر الخدمة...'
                                  : 'اختر خدمة...'
                                }
                              </button>
                              {openServiceIndex === index && (() => {
                                const foundType = itemTypes.find(t => t.name_ar === item.item_type);
                                const foundSize = foundType ? ((foundType.sizes || []).find(sz => sz.size_name === item.size_name)
                                  || (foundType.sizes && foundType.sizes.length > 0 ? foundType.sizes[0] : null)) : null;
                                const hasConfiguredPrices = foundSize && (foundSize.prices || []).length > 0;
                                const dropdownServices = services.filter(s =>
                                  s.is_active &&
                                  (!hasConfiguredPrices || (foundSize.prices || []).some(pr => pr.service_id === s.id))
                                );
                                return (
                                  <div className="table-select-dropdown">
                                    <button
                                      type="button"
                                      className={`table-select-item ${!item.service_id ? 'selected' : ''}`}
                                      onClick={() => { handleServiceChange(index, ''); setOpenServiceIndex(null); }}
                                    >
                                      بدون خدمة محددة
                                    </button>
                                    {dropdownServices.map((s) => (
                                      <button
                                        key={s.id}
                                        type="button"
                                        className={`table-select-item ${item.service_id === String(s.id) ? 'selected' : ''}`}
                                        onClick={() => { handleServiceChange(index, String(s.id)); setOpenServiceIndex(null); }}
                                      >
                                        {s.name_ar}
                                      </button>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="order-item-col price-col" data-label={t('orders.price') || 'السعر'}>
                          <div className="item-field-group">
                            <label className="item-field-label">{t('orders.price') || 'السعر'}</label>
                            <div className="price-input-wrapper">
                              <input
                                type="number"
                                className="form-input price-input"
                                value={item.price === 0 ? '' : item.price}
                                onChange={(e) => handlePriceChange(index, e.target.value)}
                                onFocus={(e) => {
                                  if (parseFloat(e.target.value) === 0 || item.price === 0) {
                                    handlePriceChange(index, '');
                                  } else {
                                    e.target.select();
                                  }
                                }}
                                min="0"
                                step="any"
                                placeholder="0"
                              />
                              <span className="price-suffix">{settings?.currency || 'ر.س'}</span>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Notes row */}
                      <div className="order-item-notes-wrapper">
                        <div className="item-notes-field">
                          <span className="item-notes-label">{t('orders.itemNotes') || 'ملاحظات'}</span>
                          <textarea
                            className="form-input item-notes-input"
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
                      </div>

                    </div>
                  ))}
                </div>
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
                      onChange={(e) => setPaidAmount(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                      onFocus={(e) => {
                        if (parseFloat(e.target.value) === 0 || paidAmount === 0) {
                          setPaidAmount('');
                        } else {
                          e.target.select();
                        }
                      }}
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
            <div className="flex items-center justify-between mb-xs">
              <label className="form-label mb-0">{t('orders.addressOptional') || 'العنوان (اختياري)'}</label>
              {newCustomer.latitude && (
                <span className="badge badge-success text-xs">📍 تم تحديد الإحداثيات بدقة</span>
              )}
            </div>
            <div className="flex gap-sm">
              <input
                type="text"
                className="form-input flex-1"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                placeholder={t('orders.addressPlaceholder') || 'مثال: حي الصحافة، الرياض'}
              />
              <Button
                type="button"
                variant="secondary"
                className="flex items-center gap-xs px-md shrink-0"
                style={{ background: '#3b82f6', color: '#fff', border: 'none' }}
                onClick={() => {
                  setMapTarget('new');
                  setShowMapModal(true);
                }}
                title="تحديد على الخريطة"
              >
                🗺️ الخريطة
              </Button>
            </div>
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
          size="lg"
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

      {/* مودال اختيار الموقع التفاعلي على الخريطة */}
      <LocationPickerModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        laundryLocation={laundryLocation}
        initialLocation={
          mapTarget === 'selected' && selectedCustomer?.latitude
            ? { lat: parseFloat(selectedCustomer.latitude), lng: parseFloat(selectedCustomer.longitude) }
            : mapTarget === 'new' && newCustomer?.latitude
            ? { lat: parseFloat(newCustomer.latitude), lng: parseFloat(newCustomer.longitude) }
            : null
        }
        initialAddress={
          mapTarget === 'selected' ? selectedCustomer?.address || '' : newCustomer?.address || ''
        }
        onSelectLocation={async (locationData) => {
          if (mapTarget === 'selected' && selectedCustomer) {
            const updated = {
              ...selectedCustomer,
              address: locationData.address,
              latitude: locationData.latitude,
              longitude: locationData.longitude
            };
            setSelectedCustomer(updated);
            
            // تحديث تلقائي لقاعدة البيانات للعميل إذا كان مسجلاً
            if (selectedCustomer.id) {
              try {
                await customersAPI.update(selectedCustomer.id, {
                  address: locationData.address,
                  latitude: locationData.latitude,
                  longitude: locationData.longitude
                });
                showToast('تم تحديث وحفظ عنوان وإحداثيات العميل بنجاح 📍', 'success');
              } catch (err) {
                console.warn('Could not auto-update customer record:', err);
                showToast('تم تحديد الموقع على الخريطة للطلب الحالي 📍', 'success');
              }
            } else {
              showToast('تم تحديد الموقع على الخريطة للطلب الحالي 📍', 'success');
            }
          } else if (mapTarget === 'new') {
            setNewCustomer({
              ...newCustomer,
              address: locationData.address,
              latitude: locationData.latitude,
              longitude: locationData.longitude
            });
            showToast('تم تحديد عنوان العميل الجديد على الخريطة 📍', 'success');
          }
        }}
      />
    </div>
  );
}
