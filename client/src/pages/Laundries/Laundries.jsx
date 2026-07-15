import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Store, Users, ShoppingBag, TrendingUp,
  Edit2, Power, Eye, X, ChevronDown, ChevronUp,
  Crown, MapPin, Phone, User, Lock, Mail, Coins
} from 'lucide-react';
import { laundriesAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './Laundries.css';

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
  const [modalMode, setModalMode] = useState('add');
  const [selectedLaundry, setSelectedLaundry] = useState(null);
  const [formData, setFormData] = useState({
    name: '', address: '', phone: '', currency: 'ر.س', language: 'ar',
    admin_name: '', admin_email: '', admin_password: ''
  });
  const [saving, setSaving] = useState(false);

  // Modal لعرض الموظفين
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffModalLaundry, setStaffModalLaundry] = useState(null);

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
    setFormData({ name: '', address: '', phone: '', currency: 'ر.س', language: 'ar', admin_name: '', admin_email: '', admin_password: '' });
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
      admin_password: ''
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
            
            <div className="table-select-container" ref={filterDropdownRef} style={{ width: '160px' }}>
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
                   (t('laundriesList.filterInactive') || 'معطلة فقط')}
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
                    { value: 'inactive', label: t('laundriesList.filterInactive') || 'معطلة فقط' }
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
              const matchesStatus = statusFilter === 'all' || 
                (statusFilter === 'active' && l.is_active) || 
                (statusFilter === 'inactive' && !l.is_active);
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
                  <div className="laundry-info-row">
                    <MapPin size={14} />
                    <span>{laundry.address}</span>
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
          <Input
            id="laundry-address"
            label={t('customers.colAddress') || 'العنوان'}
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder={t('laundriesList.addressPlaceholder') || 'المدينة، الحي'}
          />
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
