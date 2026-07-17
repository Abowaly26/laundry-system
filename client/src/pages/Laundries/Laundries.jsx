import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Store, Users, ShoppingBag, TrendingUp,
  Edit2, Power, Eye, X, ChevronDown, ChevronUp,
  Crown, MapPin, Phone, User, Lock, Mail, Coins, Compass
} from 'lucide-react';
import { laundriesAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import LocationPickerModal from '../../components/Map/LocationPickerModal';
import './Laundries.css';

const COUNTRY_PRESETS = [
  { name: 'اختر الدولة لتحديد الموقع الافتراضي للمغسلة تلقائياً...', lat: '', lng: '', currency: '', lang: 'ar', code: '966', vat: '15' },
  { name: 'المملكة العربية السعودية', lat: '24.7136', lng: '46.6753', currency: 'ر.س', lang: 'ar', code: '966', vat: '15' },
  { name: 'جمهورية مصر العربية', lat: '30.0444', lng: '31.2357', currency: 'ج.م', lang: 'ar', code: '20', vat: '14' },
  { name: 'الإمارات العربية المتحدة', lat: '25.2048', lng: '55.2708', currency: 'د.إ', lang: 'ar', code: '971', vat: '5' },
  { name: 'الكويت', lat: '29.3759', lng: '47.9774', currency: 'د.ك', lang: 'ar', code: '965', vat: '0' },
  { name: 'قطر', lat: '25.2854', lng: '51.5310', currency: 'ر.ق', lang: 'ar', code: '974', vat: '0' },
  { name: 'البحرين', lat: '26.2285', lng: '50.5860', currency: 'د.ب', lang: 'ar', code: '973', vat: '10' },
  { name: 'سلطنة عمان', lat: '23.5859', lng: '58.4059', currency: 'ر.ع.', lang: 'ar', code: '968', vat: '5' },
  { name: 'الأردن', lat: '31.9522', lng: '35.9106', currency: 'د.ا', lang: 'ar', code: '962', vat: '16' },
  { name: 'لبنان', lat: '33.8938', lng: '35.5018', currency: 'ل.ل', lang: 'ar', code: '961', vat: '11' },
  { name: 'سوريا', lat: '33.5138', lng: '36.2765', currency: 'ل.س', lang: 'ar', code: '963', vat: '10' },
  { name: 'العراق', lat: '33.3152', lng: '44.3661', currency: 'د.ع', lang: 'ar', code: '964', vat: '0' },
  { name: 'فلسطين', lat: '31.7683', lng: '35.2137', currency: 'ش.ج', lang: 'ar', code: '970', vat: '16' },
  { name: 'اليمن', lat: '15.3694', lng: '44.1910', currency: 'ر.ي', lang: 'ar', code: '967', vat: '5' },
  { name: 'ليبيا', lat: '32.8872', lng: '13.1913', currency: 'د.ل', lang: 'ar', code: '218', vat: '0' },
  { name: 'تونس', lat: '36.8065', lng: '10.1815', currency: 'د.ت', lang: 'ar', code: '216', vat: '19' },
  { name: 'الجزائر', lat: '36.7538', lng: '3.0588', currency: 'د.ج', lang: 'ar', code: '213', vat: '19' },
  { name: 'المغرب', lat: '34.0209', lng: '6.8416', currency: 'د.م.', lang: 'ar', code: '212', vat: '20' },
  { name: 'السودان', lat: '15.5007', lng: '32.5599', currency: 'ج.س', lang: 'ar', code: '249', vat: '17' },
  { name: 'الصومال', lat: '2.0469', lng: '45.3182', currency: 'ش.ص', lang: 'ar', code: '252', vat: '0' },
  { name: 'موريتانيا', lat: '18.0735', lng: '15.9582', currency: 'أ.م', lang: 'ar', code: '222', vat: '14' },
  { name: 'تركيا', lat: '39.9334', lng: '32.8597', currency: 'ل.ت', lang: 'en', code: '90', vat: '20' },
  { name: 'المملكة المتحدة', lat: '51.5074', lng: '-0.1278', currency: '£', lang: 'en', code: '44', vat: '20' },
  { name: 'الولايات المتحدة الأمريكية', lat: '38.9072', lng: '-77.0369', currency: '$', lang: 'en', code: '1', vat: '0' },
  { name: 'كندا', lat: '45.4215', lng: '-75.6972', currency: 'C$', lang: 'en', code: '1', vat: '5' },
  { name: 'فرنسا', lat: '48.8566', lng: '2.3522', currency: '€', lang: 'en', code: '33', vat: '20' },
  { name: 'ألمانيا', lat: '52.5200', lng: '13.4050', currency: '€', lang: 'en', code: '49', vat: '19' }
];

const addMonths = (date, months) => {
  const d = new Date(date);
  const originalDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(originalDay, daysInMonth));
  return d;
};

const addYears = (date, years) => {
  const d = new Date(date);
  const originalDay = d.getDate();
  d.setDate(1);
  d.setFullYear(d.getFullYear() + years);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(originalDay, daysInMonth));
  return d;
};

export default function Laundries() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [laundries, setLaundries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive

  // Modal إنشاء/تعديل
  const [showModal, setShowModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedLaundry, setSelectedLaundry] = useState(null);
  const [formData, setFormData] = useState({
    name: '', address: '', phone: '', currency: 'ر.س', language: 'ar',
    admin_name: '', admin_email: '', admin_password: '',
    plan_type: 'lifetime', subscription_start_date: '', subscription_end_date: '', payment_status: 'paid',
    latitude: '', longitude: '', tax_number: '', vat_percent: '15', country_code: '966'
  });
  const [saving, setSaving] = useState(false);

  // Modal لعرض الموظفين
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffModalLaundry, setStaffModalLaundry] = useState(null);

  // Modal لعرض موقع الخريطة للمغسلة
  const [showViewMapModal, setShowViewMapModal] = useState(false);
  const [viewLocationLaundry, setViewLocationLaundry] = useState(null);

  // Custom Dropdown لفلتر الحالة
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef(null);

  const loadLaundries = async () => {
    setLoading(true);
    try {
      const res = await laundriesAPI.getAll();
      if (res.success) setLaundries(res.data);
    } catch (err) {
      showToast(t('laundriesList.fetchError') || 'خطأ في جلب المغاسل', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLaundries(); }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedLaundry(null);
    setFormData({ 
      name: '', address: '', phone: '', currency: 'ر.س', language: 'ar', 
      admin_name: '', admin_email: '', admin_password: '',
      plan_type: 'lifetime', subscription_start_date: new Date().toISOString().split('T')[0], subscription_end_date: '', payment_status: 'paid',
      latitude: '', longitude: '', tax_number: '', vat_percent: '15', country_code: '966'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (laundry) => {
    setModalMode('edit');
    setSelectedLaundry(laundry);
    setFormData({
      name: laundry.name,
      address: laundry.address || '',
      phone: laundry.phone || '',
      currency: laundry.currency || 'ر.س',
      language: laundry.language || 'ar',
      admin_name: laundry.admin_name || '',
      admin_email: laundry.admin_email || '',
      admin_password: '',
      plan_type: laundry.plan_type || 'lifetime',
      subscription_start_date: laundry.subscription_start_date ? new Date(laundry.subscription_start_date).toISOString().split('T')[0] : '',
      subscription_end_date: laundry.subscription_end_date ? new Date(laundry.subscription_end_date).toISOString().split('T')[0] : '',
      payment_status: laundry.payment_status || 'paid',
      latitude: laundry.latitude !== null && laundry.latitude !== undefined ? laundry.latitude : '',
      longitude: laundry.longitude !== null && laundry.longitude !== undefined ? laundry.longitude : '',
      tax_number: laundry.tax_number !== null && laundry.tax_number !== undefined ? laundry.tax_number : '',
      vat_percent: laundry.vat_percent !== null && laundry.vat_percent !== undefined ? laundry.vat_percent : '15',
      country_code: laundry.country_code !== null && laundry.country_code !== undefined ? laundry.country_code : '966'
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let res;
      if (modalMode === 'add') {
        if (!formData.admin_name || !formData.admin_email || !formData.admin_password) {
          showToast(t('laundriesList.adminDataRequired') || 'بيانات المدير مطلوبة', 'error');
          setSaving(false);
          return;
        }
        res = await laundriesAPI.create(formData);
      } else {
        res = await laundriesAPI.update(selectedLaundry.id, {
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          currency: formData.currency,
          language: formData.language,
          plan_type: formData.plan_type,
          subscription_start_date: formData.subscription_start_date || null,
          subscription_end_date: formData.subscription_end_date || null,
          payment_status: formData.payment_status,
          latitude: formData.latitude !== '' ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude !== '' ? parseFloat(formData.longitude) : null,
          tax_number: formData.tax_number,
          vat_percent: formData.vat_percent !== '' ? parseFloat(formData.vat_percent) : 0,
          country_code: formData.country_code,
          ...(formData.admin_email ? { admin_email: formData.admin_email } : {}),
          ...(formData.admin_password ? { admin_password: formData.admin_password } : {})
        });
      }

      if (res.success) {
        showToast(modalMode === 'add' ? (t('laundriesList.addSuccess', { name: formData.name }) || `تم إنشاء مغسلة "${formData.name}" بنجاح! 🎉`) : (t('laundriesList.updateSuccess') || 'تم تحديث المغسلة بنجاح'), 'success');
        setShowModal(false);
        loadLaundries();
      } else {
        showToast(res.message || t('laundriesList.saveError') || 'حدث خطأ', 'error');
      }
    } catch (err) {
      showToast(err.message || t('laundriesList.networkError') || 'خطأ في الاتصال', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (laundry) => {
    const action = laundry.is_active ? (t('laundriesList.deactivate') || 'تعطيل') : (t('laundriesList.activate') || 'تفعيل');
    if (!window.confirm(t('laundriesList.confirmToggleStatus', { action, name: laundry.name, warning: laundry.is_active ? (t('laundriesList.disableWarning') || 'سيتم تعطيل جميع موظفيها.') : '' }) || `هل أنت متأكد من ${action} مغسلة "${laundry.name}"؟ ${laundry.is_active ? 'سيتم تعطيل جميع موظفيها.' : ''}`)) return;

    try {
      const res = await laundriesAPI.update(laundry.id, { is_active: !laundry.is_active });
      if (res.success) {
        showToast(t('laundriesList.statusSuccess', { action }) || `تم ${action} المغسلة بنجاح`, 'success');
        loadLaundries();
      }
    } catch (err) {
      showToast(err.message || t('laundriesList.statusError') || 'خطأ', 'error');
    }
  };

  const handleOpenStaffModal = (laundry) => {
    setStaffModalLaundry(laundry);
    setShowStaffModal(true);
  };

  const formatCurrency = (amount, currency = 'ر.س') => {
    return `${parseFloat(amount || 0).toFixed(2)} ${currency}`;
  };

  const getLaundryGradient = (index) => {
    const gradients = [
      'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', // Indigo to Blue
      'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', // Dark Slate to Slate
      'linear-gradient(135deg, #059669 0%, #10b981 100%)', // Emerald to Green
      'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', // Violet to Purple
      'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', // Blue to Dark Blue
      'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)'  // Teal to Cyan
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="page laundries-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Crown size={28} className="page-title-icon" />
            {t('laundriesList.title') || 'إدارة المغاسل'}
          </h1>
          <p className="page-subtitle">
            {t('laundriesList.subtitle', { count: laundries.length }) || `أنت تدير ${laundries.length} مغسلة • كل مغسلة منفصلة تماماً عن الأخرى`}
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd} id="add-laundry-btn">
          <Plus size={18} style={{ marginLeft: '8px' }} />
          {t('laundriesList.addNewBtn') || 'إضافة مغسلة جديدة'}
        </Button>
      </div>

      {/* إحصائيات سريعة */}
      {!loading && laundries.length > 0 && (
        <div className="laundries-summary-cards">
          <div className="summary-card summary-card-primary">
            <Store size={28} />
            <div>
              <div className="summary-card-value">{laundries.length}</div>
              <div className="summary-card-label">{t('laundriesList.totalLaundries') || 'إجمالي المغاسل'}</div>
            </div>
          </div>
          <div className="summary-card summary-card-success">
            <Power size={28} />
            <div>
              <div className="summary-card-value">{laundries.filter(l => l.is_active).length}</div>
              <div className="summary-card-label">{t('laundriesList.activeLaundries') || 'مغاسل نشطة'}</div>
            </div>
          </div>
          <div className="summary-card summary-card-info">
            <Users size={28} />
            <div>
              <div className="summary-card-value">{laundries.reduce((s, l) => s + parseInt(l.staff_count || 0), 0)}</div>
              <div className="summary-card-label">{t('laundriesList.totalEmployees') || 'إجمالي الموظفين'}</div>
            </div>
          </div>
          <div className="summary-card summary-card-warning">
            <TrendingUp size={28} />
            <div>
              <div className="summary-card-value">{formatCurrency(laundries.reduce((s, l) => s + parseFloat(l.total_revenue || 0), 0))}</div>
              <div className="summary-card-label">{t('laundriesList.totalRevenue') || 'إجمالي الإيرادات'}</div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center" style={{ height: '300px' }}>
          <LoadingSpinner />
        </div>
      ) : laundries.length === 0 ? (
        <div className="laundries-empty">
          <div className="laundries-empty-icon">🏪</div>
          <h3>{t('laundriesList.emptyTitle') || 'لا توجد مغاسل بعد'}</h3>
          <p>{t('laundriesList.emptyMsg') || 'ابدأ بإنشاء أول مغسلة وتعيين مدير لها'}</p>
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus size={18} style={{ marginLeft: '8px' }} />
            {t('laundriesList.createFirstBtn') || 'إنشاء المغسلة الأولى'}
          </Button>
        </div>
      ) : (
        <>
          {/* Search & Filter Bar */}
          <div className="laundries-search-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="laundries-search-wrapper" style={{ flex: 1, minWidth: '280px' }}>
              <svg className="laundries-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                className="laundries-search-input"
                type="text"
                placeholder={t('laundriesList.searchPlaceholder') || "ابحث باسم المغسلة..."}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="laundries-search-clear" onClick={() => setSearchTerm('')}>✕</button>
              )}
            </div>
            
            <div className="table-select-container" ref={filterDropdownRef} style={{ width: '220px' }}>
              <button
                type="button"
                className="table-select-trigger"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                style={{
                  height: '44px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '0 16px',
                  cursor: 'pointer'
                }}
              >
                <span>
                  {statusFilter === 'all' ? (t('laundriesList.filterAll') || 'كل المغاسل') : 
                   statusFilter === 'active' ? (t('laundriesList.filterActive') || 'نشطة فقط') : 
                   statusFilter === 'inactive' ? (t('laundriesList.filterInactive') || 'معطلة فقط') :
                   statusFilter === 'unpaid' ? 'غير مدفوعة (عليها مستحقات)' :
                   statusFilter === 'expiring_soon' ? 'قربت تنتهي (<= 7 أيام)' :
                   statusFilter === 'expired' ? 'منتهية الاشتراك' : statusFilter}
                </span>
              </button>
              {showFilterDropdown && (
                <div className="table-select-dropdown" style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  background: 'var(--bg-white, #fff)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1))',
                  zIndex: 100,
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {[
                    { value: 'all', label: t('laundriesList.filterAll') || 'كل المغاسل' },
                    { value: 'active', label: t('laundriesList.filterActive') || 'نشطة فقط' },
                    { value: 'inactive', label: t('laundriesList.filterInactive') || 'معطلة فقط' },
                    { value: 'unpaid', label: 'غير مدفوعة (عليها مستحقات)' },
                    { value: 'expiring_soon', label: 'قربت تنتهي (<= 7 أيام)' },
                    { value: 'expired', label: 'منتهية الاشتراك' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`table-select-item ${statusFilter === opt.value ? 'selected' : ''}`}
                      onClick={() => {
                        setStatusFilter(opt.value);
                        setShowFilterDropdown(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        border: 'none',
                        background: statusFilter === opt.value ? 'var(--primary)' : 'transparent',
                        color: statusFilter === opt.value ? '#fff' : 'var(--text)',
                        borderRadius: '8px',
                        fontWeight: statusFilter === opt.value ? '700' : '500',
                        fontSize: '0.88rem',
                        textAlign: 'right',
                        cursor: 'pointer',
                        transition: 'background 0.2s, color 0.2s'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {(() => {
            const filtered = laundries.filter(l => {
              const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase());
              
              let matchesStatus = true;
              if (statusFilter === 'active') {
                matchesStatus = l.is_active;
              } else if (statusFilter === 'inactive') {
                matchesStatus = !l.is_active;
              } else if (statusFilter === 'unpaid') {
                matchesStatus = l.payment_status === 'unpaid';
              } else if (statusFilter === 'expiring_soon') {
                if (l.plan_type === 'lifetime' || !l.subscription_end_date) {
                  matchesStatus = false;
                } else {
                  const diff = new Date(l.subscription_end_date) - new Date();
                  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                  matchesStatus = days > 0 && days <= 7;
                }
              } else if (statusFilter === 'expired') {
                if (l.plan_type === 'lifetime' || !l.subscription_end_date) {
                  matchesStatus = false;
                } else {
                  const diff = new Date(l.subscription_end_date) - new Date();
                  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                  matchesStatus = days <= 0;
                }
              }
              
              return matchesSearch && matchesStatus;
            });
            return filtered.length === 0 ? (
              <div className="laundries-search-empty">
                <p>{t('laundriesList.noResults') || 'لم يتم العثور على مغاسل تطابق البحث والتصفية الحالية.'}</p>
              </div>
            ) : (
              <div className="laundries-grid">
                {filtered.map((laundry, index) => (
            <div
              key={laundry.id}
              className={`laundry-card ${!laundry.is_active ? 'laundry-card-inactive' : ''}`}
            >
              {/* رأس البطاقة */}
              <div className="laundry-card-header" style={{ background: laundry.is_active ? getLaundryGradient(index) : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}>
                <div className="laundry-card-header-content">
                  <div className="laundry-card-icon">
                    <Store size={32} />
                  </div>
                  <div>
                    <h3 className="laundry-card-name">{laundry.name}</h3>
                    <div className="laundry-card-status">
                      <span className={`status-dot ${laundry.is_active ? 'active' : 'inactive'}`} />
                      {laundry.is_active ? (t('usersList.statusActive') || 'نشطة') : (t('usersList.statusInactive') || 'معطلة')}
                    </div>
                  </div>
                </div>
                <div className="laundry-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button className="laundry-icon-btn" onClick={() => handleOpenEdit(laundry)} title={t('usersList.editBtn') || "تعديل"}>
                    <Edit2 size={16} />
                  </button>
                  <label className="laundry-switch" title={laundry.is_active ? (t('usersList.deactivateTitle') || 'تعطيل') : (t('usersList.activateTitle') || 'تفعيل')}>
                    <input 
                      type="checkbox" 
                      checked={laundry.is_active} 
                      onChange={() => handleToggleStatus(laundry)}
                    />
                    <span className="laundry-switch-slider"></span>
                  </label>
                </div>
              </div>

              {/* تفاصيل المغسلة */}
              <div className="laundry-card-body">
                {laundry.address && (
                  <div className="laundry-info-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <MapPin size={14} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{laundry.address}</span>
                    </div>
                    {laundry.latitude && laundry.longitude && (
                      <button
                        type="button"
                        onClick={() => {
                          setViewLocationLaundry(laundry);
                          setShowViewMapModal(true);
                        }}
                        style={{
                          background: 'var(--primary-light)',
                          border: 'none',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          transition: 'background var(--transition)',
                          marginInlineStart: '8px',
                          flexShrink: 0
                        }}
                        className="laundry-location-view-btn"
                        title="عرض الموقع على الخريطة"
                      >
                        <Compass size={14} />
                      </button>
                    )}
                  </div>
                )}
                {laundry.phone && (
                  <div className="laundry-info-row">
                    <Phone size={14} />
                    <span>{laundry.phone}</span>
                  </div>
                )}
                {laundry.currency && (
                  <div className="laundry-info-row">
                    <Coins size={14} />
                    <span>{t('settings.currency') || 'العملة'}: {laundry.currency}</span>
                  </div>
                )}
                {laundry.admin_email && (
                  <div className="laundry-info-row laundry-info-row--admin">
                    <Mail size={14} />
                    <span>{laundry.admin_email}</span>
                    <span className="laundry-admin-badge">مدير</span>
                  </div>
                )}

                {/* باقة الاشتراك والتبعات الزمنيّة */}
                <div className="laundry-subscription-card" style={{
                  marginTop: '12px',
                  padding: '12px',
                  borderRadius: '10px',
                  background: laundry.payment_status === 'unpaid' ? '#FEF2F2' : '#F9FAF_B',
                  border: laundry.payment_status === 'unpaid' ? '1px solid #FCA5A5' : '1px solid var(--border)',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>الباقة:</strong>
                    <span style={{
                      fontWeight: 'bold',
                      color: laundry.plan_type === 'lifetime' ? '#059669' : '#3B82F6'
                    }}>
                      {laundry.plan_type === 'lifetime' ? 'دائم (مدى الحياة)' :
                       laundry.plan_type === 'monthly' ? 'شهري' :
                       laundry.plan_type === 'semi_annual' ? '6 شهور' :
                       laundry.plan_type === 'yearly' ? 'سنوي' :
                       laundry.plan_type === '3_years' ? '3 سنوات' :
                       laundry.plan_type === '5_years' ? '5 سنوات' : laundry.plan_type}
                    </span>
                  </div>
                  {laundry.subscription_start_date && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>تاريخ البدء:</span>
                      <span style={{ fontWeight: '500' }}>{new Date(laundry.subscription_start_date).toLocaleDateString('ar-EG')}</span>
                    </div>
                  )}
                  {laundry.plan_type !== 'lifetime' && laundry.subscription_end_date && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>تاريخ الانتهاء:</span>
                        <span style={{ fontWeight: '500' }}>{new Date(laundry.subscription_end_date).toLocaleDateString('ar-EG')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>الأيام المتبقية:</span>
                        <span style={{
                          fontWeight: 'bold',
                          color: (() => {
                            const diff = new Date(laundry.subscription_end_date) - new Date();
                            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                            return days <= 5 ? '#EF4444' : days <= 15 ? '#F59E0B' : '#059669';
                          })()
                        }}>
                          {(() => {
                            const diff = new Date(laundry.subscription_end_date) - new Date();
                            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                            return days > 0 ? `${days} يوم` : 'منتهي';
                          })()}
                        </span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>حالة الدفع:</span>
                    <span style={{
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      background: laundry.payment_status === 'paid' ? '#D1FAE5' : '#FEE2E2',
                      color: laundry.payment_status === 'paid' ? '#065F46' : '#991B1B'
                    }}>
                      {laundry.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع / عليه فلوس'}
                    </span>
                  </div>
                </div>

                {/* إحصائيات سريعة */}
                <div className="laundry-stats-grid">
                  <div className="laundry-stat">
                    <div className="laundry-stat-value">{laundry.admin_count || 0}</div>
                    <div className="laundry-stat-label">{t('laundriesList.admins') || 'مدراء'}</div>
                  </div>
                  <div className="laundry-stat">
                    <div className="laundry-stat-value">{laundry.staff_count || 0}</div>
                    <div className="laundry-stat-label">{t('laundriesList.employees') || 'موظفون'}</div>
                  </div>
                  <div className="laundry-stat">
                    <div className="laundry-stat-value">{laundry.customers_count || 0}</div>
                    <div className="laundry-stat-label">{t('laundriesList.customers') || 'عملاء'}</div>
                  </div>
                  <div className="laundry-stat">
                    <div className="laundry-stat-value">{laundry.active_orders_count || 0}</div>
                    <div className="laundry-stat-label">{t('laundriesList.activeOrders') || 'طلبات نشطة'}</div>
                  </div>
                </div>

                <div className="laundry-revenue">
                  <TrendingUp size={16} />
                  <span>{t('laundriesList.totalRevenue') || 'إجمالي الإيرادات:'} <strong>{formatCurrency(laundry.total_revenue, laundry.currency)}</strong></span>
                </div>

                {/* زر التوسيع لعرض الموظفين */}
                <button
                  className="laundry-expand-btn"
                  onClick={() => handleOpenStaffModal(laundry)}
                >
                  <Users size={16} /> {t('laundriesList.showTeam') || 'عرض الفريق'}
                </button>
              </div>
            </div>
              ))}
            </div>
            );
          })()}
        </>
      )}

      {/* Modal لعرض الموظفين كـ Pop-up */}
      <Modal
        isOpen={showStaffModal}
        onClose={() => {
          setShowStaffModal(false);
          setStaffModalLaundry(null);
        }}
        title={`👥 ${t('laundriesList.teamTitlePopup') || 'فريق عمل مغسلة'} ${staffModalLaundry?.name || ''}`}
      >
        {staffModalLaundry && (
          <LaundryStaffPanel laundryId={staffModalLaundry.id} />
        )}
        <div className="flex justify-end mt-md">
          <Button variant="secondary" onClick={() => {
            setShowStaffModal(false);
            setStaffModalLaundry(null);
          }}>
            {t('usersList.closeBtn') || 'إغلاق'}
          </Button>
        </div>
      </Modal>
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'add' ? (t('laundriesList.addModalTitle') || '🏪 إضافة مغسلة جديدة') : (t('laundriesList.editModalTitle', { name: selectedLaundry?.name }) || `✏️ تعديل: ${selectedLaundry?.name}`)}
      >
        <form onSubmit={handleSave} noValidate>
          {/* بيانات المغسلة */}
          <div className="modal-section-title">
            <Store size={16} />
            {t('laundriesList.laundryData') || 'بيانات المغسلة'}
          </div>

          <Input
            id="laundry-name"
            label={t('laundriesList.nameLabel') || 'اسم المغسلة *'}
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('laundriesList.namePlaceholder') || 'مثال: مغسلة النظافة الذهبية'}
          />
          <div style={{ position: 'relative' }}>
            <Input
              id="laundry-address"
              label={t('customers.colAddress') || 'العنوان'}
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={t('laundriesList.addressPlaceholder') || 'المدينة، الحي'}
              style={{ paddingInlineEnd: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowMapModal(true)}
              style={{
                position: 'absolute',
                insetInlineEnd: '10px',
                bottom: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px'
              }}
              title="تحديد موقع المغسلة على الخريطة"
            >
              <MapPin size={20} />
            </button>
          </div>
           <Input
            id="laundry-phone"
            label={t('customers.colPhone') || 'رقم الهاتف'}
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="05xxxxxxxx"
          />
          <Input
            id="laundry-currency"
            label={t('settings.currency') || 'العملة'}
            type="text"
            required
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            placeholder={t('settings.currencyPlaceholder') || 'مثال: ر.س، د.إ، $'}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Input
              id="laundry-tax-number"
              label="الرقم الضريبي للمنشأة"
              type="text"
              value={formData.tax_number}
              onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
              placeholder="مثال: 300012345600003"
            />
            <Input
              id="laundry-vat-percent"
              label="نسبة الضريبة %"
              type="number"
              step="any"
              value={formData.vat_percent}
              onChange={(e) => setFormData({ ...formData, vat_percent: e.target.value })}
              placeholder="15"
            />
          </div>
          <Input
            id="laundry-country-code"
            label="كود الدولة للواتساب (مقدمة الرقم)"
            type="text"
            value={formData.country_code}
            onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
            placeholder="مثال: 966 أو 20"
          />

          {/* نطاق العمل الجغرافي والإحداثيات */}
          <div className="laundry-geo-section" style={{ border: '1px solid var(--border)', padding: '15px', borderRadius: '10px', background: 'var(--bg-hover)', margin: '15px 0' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
              📍 النطاق الجغرافي للمغسلة
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              اختر الدولة لتحديد الموقع الافتراضي للمغسلة على الخريطة عند تسجيل الطلبات أو أدخل الإحداثيات يدوياً.
            </p>
            
            {/* قائمة تحديد الدول الممتدة */}
            <div style={{ marginBottom: '12px' }}>
              <select
                id="laundry-country-preset"
                className="form-input"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                onChange={(e) => {
                  const selectedPreset = COUNTRY_PRESETS.find(p => p.name === e.target.value);
                  if (selectedPreset && selectedPreset.lat !== '') {
                    const isDefaultAddress = !formData.address || COUNTRY_PRESETS.some(p => p.name === formData.address);
                    setFormData({ 
                      ...formData, 
                      latitude: selectedPreset.lat, 
                      longitude: selectedPreset.lng,
                      currency: selectedPreset.currency || formData.currency,
                      language: selectedPreset.lang || formData.language,
                      address: isDefaultAddress ? selectedPreset.name : formData.address,
                      country_code: selectedPreset.code || formData.country_code,
                      vat_percent: selectedPreset.vat || formData.vat_percent
                    });
                  }
                }}
                value={COUNTRY_PRESETS.find(p => String(p.lat) === String(formData.latitude) && String(p.lng) === String(formData.longitude))?.name || 'اختر الدولة لتحديد الموقع الافتراضي للمغسلة تلقائياً...'}
              >
                {COUNTRY_PRESETS.map((preset) => (
                  <option key={preset.name} value={preset.name}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Input
                id="laundry-latitude"
                label="خط العرض (Latitude)"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="مثال: 24.7136"
              />
              <Input
                id="laundry-longitude"
                label="خط الطول (Longitude)"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="مثال: 46.6753"
              />
            </div>
          </div>

          {/* لغة المغسلة */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🌐</span>
              لغة واجهة المغسلة
            </label>
            <div className="laundry-lang-select-wrapper">
              <div
                className={`laundry-lang-option ${formData.language === 'ar' ? 'selected' : ''}`}
                onClick={() => setFormData({ ...formData, language: 'ar' })}
              >
                <span className="laundry-lang-flag">🇸🇦</span>
                <div>
                  <div className="laundry-lang-name">العربية</div>
                  <div className="laundry-lang-sub">Arabic · RTL</div>
                </div>
                {formData.language === 'ar' && <span className="laundry-lang-check">✓</span>}
              </div>
              <div
                className={`laundry-lang-option ${formData.language === 'en' ? 'selected' : ''}`}
                onClick={() => setFormData({ ...formData, language: 'en' })}
              >
                <span className="laundry-lang-flag">🇺🇸</span>
                <div>
                  <div className="laundry-lang-name">English</div>
                  <div className="laundry-lang-sub">English · LTR</div>
                </div>
                {formData.language === 'en' && <span className="laundry-lang-check">✓</span>}
              </div>
            </div>
          </div>

          {/* باقة الاشتراك */}
          <div className="modal-section-title" style={{ marginTop: '20px' }}>
            <span>💳</span>
            اشتراك وباقة المغسلة
          </div>

          <div className="form-group">
            <label className="form-label">نوع الباقة *</label>
            <select
              className="form-select"
              value={formData.plan_type}
              onChange={(e) => {
                const plan = e.target.value;
                const startDateStr = formData.subscription_start_date || new Date().toISOString().split('T')[0];
                let endDateStr = '';
                
                if (plan !== 'lifetime') {
                  if (plan === 'monthly') {
                    endDateStr = addMonths(startDateStr, 1).toISOString().split('T')[0];
                  } else if (plan === 'semi_annual') {
                    endDateStr = addMonths(startDateStr, 6).toISOString().split('T')[0];
                  } else if (plan === 'yearly') {
                    endDateStr = addYears(startDateStr, 1).toISOString().split('T')[0];
                  } else if (plan === '3_years') {
                    endDateStr = addYears(startDateStr, 3).toISOString().split('T')[0];
                  } else if (plan === '5_years') {
                    endDateStr = addYears(startDateStr, 5).toISOString().split('T')[0];
                  }
                }
                
                setFormData({ 
                  ...formData, 
                  plan_type: plan, 
                  subscription_start_date: startDateStr,
                  subscription_end_date: endDateStr 
                });
              }}
            >
              <option value="lifetime">دائم (مدى الحياة)</option>
              <option value="monthly">شهري</option>
              <option value="semi_annual">6 شهور</option>
              <option value="yearly">سنوي</option>
              <option value="3_years">3 سنوات</option>
              <option value="5_years">5 سنوات</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">تاريخ بدء الاشتراك</label>
            <Input
              id="sub-start"
              type="date"
              value={formData.subscription_start_date}
              onChange={(e) => {
                const startDateStr = e.target.value;
                const plan = formData.plan_type;
                let endDateStr = '';
                
                if (plan !== 'lifetime' && startDateStr) {
                  if (plan === 'monthly') {
                    endDateStr = addMonths(startDateStr, 1).toISOString().split('T')[0];
                  } else if (plan === 'semi_annual') {
                    endDateStr = addMonths(startDateStr, 6).toISOString().split('T')[0];
                  } else if (plan === 'yearly') {
                    endDateStr = addYears(startDateStr, 1).toISOString().split('T')[0];
                  } else if (plan === '3_years') {
                    endDateStr = addYears(startDateStr, 3).toISOString().split('T')[0];
                  } else if (plan === '5_years') {
                    endDateStr = addYears(startDateStr, 5).toISOString().split('T')[0];
                  }
                }
                
                setFormData({ 
                  ...formData, 
                  subscription_start_date: startDateStr, 
                  subscription_end_date: endDateStr 
                });
              }}
            />
          </div>

          {formData.plan_type !== 'lifetime' && (
            <div className="form-group">
              <label className="form-label">تاريخ انتهاء الاشتراك</label>
              <Input
                id="sub-end"
                type="date"
                value={formData.subscription_end_date}
                onChange={(e) => setFormData({ ...formData, subscription_end_date: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">حالة الدفع</label>
            <select
              className="form-select"
              value={formData.payment_status}
              onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
            >
              <option value="paid">مدفوع</option>
              <option value="unpaid">غير مدفوع (عليه فلوس)</option>
            </select>
          </div>

          {/* بيانات المدير - عند الإنشاء أو التعديل */}
          {modalMode === 'add' ? (
            <>
              <div className="modal-section-title" style={{ marginTop: '20px' }}>
                <Crown size={16} />
                {t('laundriesList.adminAccount') || 'حساب مدير المغسلة'}
              </div>
              <div className="modal-section-note">
                {t('laundriesList.adminNote') || 'سيتم إنشاء حساب مدير (Admin) لهذه المغسلة تلقائياً'}
              </div>

              <Input
                id="admin-name"
                label={t('laundriesList.adminNameLabel') || 'اسم المدير *'}
                type="text"
                required
                value={formData.admin_name}
                onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                placeholder={t('usersList.namePlaceholder') || 'مثال: أحمد عبد الله'}
              />
              <Input
                id="admin-email"
                label={t('laundriesList.adminEmailLabel') || 'البريد الإلكتروني للمدير *'}
                type="email"
                required
                value={formData.admin_email}
                onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                placeholder="admin@example.com"
              />
              <Input
                id="admin-password"
                label={t('laundriesList.adminPasswordLabel') || 'كلمة مرور المدير *'}
                type="password"
                required
                value={formData.admin_password}
                onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                placeholder="••••••••"
              />
            </>
          ) : (
            <>
              <div className="modal-section-title" style={{ marginTop: '20px' }}>
                <Crown size={16} />
                {t('laundriesList.adminAccountEdit') || 'تعديل حساب مدير المغسلة'}
              </div>
              
              {formData.plan_type !== 'lifetime' ? (
                <>
                  <div className="modal-section-note">
                    {t('laundriesList.adminEditNote') || 'تعديل البريد الإلكتروني أو تعيين كلمة مرور جديدة للمدير'}
                  </div>

                  <Input
                    id="admin-email-edit"
                    label={t('laundriesList.adminEmailLabel') || 'البريد الإلكتروني للمدير'}
                    type="email"
                    value={formData.admin_email}
                    onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                    placeholder="admin@example.com"
                  />
                  <Input
                    id="admin-password-edit"
                    label={t('laundriesList.adminPasswordEditLabel') || 'كلمة مرور جديدة (اتركها فارغة لعدم التغيير)'}
                    type="password"
                    value={formData.admin_password}
                    onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                    placeholder="••••••••"
                  />
                </>
              ) : (
                <div className="modal-section-note" style={{ marginTop: '10px', padding: '12px', background: 'var(--bg-body)', borderRadius: '8px', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  ℹ️ لا يمكن تعديل بيانات المدير من هنا لأن الباقة مفعلة <strong>مدى الحياة</strong>. يستطيع صاحب المغسلة تعديل إيميله وباسورده بنفسه من صفحة ملفه الشخصي.
                </div>
              )}
            </>
          )}

          <div className="flex justify-between mt-md">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              {t('usersList.cancelBtn') || 'إلغاء'}
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? (t('laundriesList.saving') || 'جاري الحفظ...') : modalMode === 'add' ? (t('laundriesList.createBtn') || 'إنشاء المغسلة') : (t('laundriesList.saveEditBtn') || 'حفظ التعديلات')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* مودال تحديد موقع المغسلة الفعلي على الخريطة */}
      <LocationPickerModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        mode="laundry"
        initialLocation={
          formData.latitude && formData.longitude
            ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) }
            : null
        }
        initialAddress={formData.address || ''}
        onSelectLocation={(locationData) => {
          setFormData(prev => ({
            ...prev,
            address: locationData.address,
            latitude: locationData.latitude,
            longitude: locationData.longitude
          }));
        }}
      />

      {/* مودال استعراض موقع المغسلة الفعلي على الخريطة */}
      <LocationPickerModal
        isOpen={showViewMapModal}
        onClose={() => {
          setShowViewMapModal(false);
          setViewLocationLaundry(null);
        }}
        mode="laundry"
        readOnly={true}
        initialLocation={
          viewLocationLaundry?.latitude && viewLocationLaundry?.longitude
            ? { lat: parseFloat(viewLocationLaundry.latitude), lng: parseFloat(viewLocationLaundry.longitude) }
            : null
        }
        initialAddress={viewLocationLaundry?.address || ''}
        onSelectLocation={() => {}}
      />
    </div>
  );
}

/**
 * مكون عرض موظفي المغسلة
 */
function LaundryStaffPanel({ laundryId }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    laundriesAPI.getById(laundryId)
      .then(res => { if (res.success) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [laundryId]);

  const roleColors = {
    admin: { bg: '#EEF2FF', color: '#4F46E5', label: t('laundriesList.roleAdmin') || 'مدير' },
    cashier: { bg: '#ECFDF5', color: '#059669', label: t('laundriesList.roleCashier') || 'استقبال' },
    worker: { bg: '#FFFBEB', color: '#D97706', label: t('laundriesList.roleWorker') || 'عامل' },
  };

  if (loading) return <div className="laundry-staff-loading"><div className="mini-spinner" /></div>;

  const users = data?.users || [];

  return (
    <div className="laundry-staff-panel">
      <div className="laundry-staff-title">
        <Users size={14} />
        {t('laundriesList.teamTitle', { count: users.length }) || `الفريق (${users.length} شخص)`}
      </div>
      {users.length === 0 ? (
        <div className="laundry-staff-empty">{t('laundriesList.noStaff') || 'لا يوجد موظفون بعد'}</div>
      ) : (
        <div className="laundry-staff-list">
          {users.map(u => {
            const roleInfo = roleColors[u.role] || { bg: '#F3F4F6', color: '#6B7280', label: u.role };
            return (
              <div key={u.id} className={`laundry-staff-item ${!u.is_active ? 'inactive' : ''}`}>
                <div className="staff-avatar" style={{ background: roleInfo.bg, color: roleInfo.color }}>
                  {u.name?.charAt(0)}
                </div>
                <div className="staff-info">
                  <div className="staff-name">{u.name}</div>
                  <div className="staff-email">{u.email}</div>
                </div>
                <span className="staff-role-tag" style={{ background: roleInfo.bg, color: roleInfo.color }}>
                  {roleInfo.label}
                </span>
                {!u.is_active && <span className="staff-inactive-badge">{t('usersList.statusInactive') || 'معطل'}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
