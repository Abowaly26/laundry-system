import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Edit2, Trash2, ChevronDown, ChevronUp,
  Building2, Users as UsersIcon, Shield, UserCheck, Wrench,
  ToggleLeft, ToggleRight
} from 'lucide-react';
import { usersAPI, laundriesAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import Switch from '../../components/UI/Switch';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import './Users.css';

const ROLE_CONFIG = (t) => ({
  admin:   { label: t('roles.admin') || 'مدير المغسلة',    color: '#ef4444', bg: '#fef2f2', icon: Shield },
  cashier: { label: t('roles.cashier') || 'موظف استقبال',   color: '#3b82f6', bg: '#eff6ff', icon: UserCheck },
  worker:  { label: t('roles.worker') || 'عامل تشغيل',     color: '#10b981', bg: '#ecfdf5', icon: Wrench },
  super_owner: { label: t('roles.super_owner') || 'صاحب النظام', color: '#7c3aed', bg: '#f5f3ff', icon: Shield },
});

const LAUNDRY_GRADIENTS = [
  'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
];

export default function Users() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { isSuperOwner } = useAuth();

  const [laundries, setLaundries] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLaundries, setExpandedLaundries] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'worker', is_active: 1, laundry_id: ''
  });

  const getInitials = (name) => {
    if (!name) return '؟';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2);
  };

  const getAvatarGradient = (name) => {
    const gradients = [
      '#4F46E5','#10B981','#F59E0B','#EC4899','#8B5CF6','#06B6D4','#ef4444','#14b8a6'
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = (name.charCodeAt(i) + ((hash << 5) - hash));
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, laundriesRes] = await Promise.all([
        usersAPI.getAll(),
        isSuperOwner ? laundriesAPI.getAll() : Promise.resolve({ success: false, data: [] })
      ]);
      if (usersRes.success) setUsers(usersRes.data);
      if (laundriesRes.success) {
        setLaundries(laundriesRes.data);
        // All laundries collapsed by default
        const expanded = {};
        laundriesRes.data.forEach(l => { expanded[l.id] = false; });
        setExpandedLaundries(expanded);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [isSuperOwner]);

  const toggleLaundry = (id) => {
    setExpandedLaundries(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = (laundryId = '') => {
    setModalMode('add');
    setSelectedId(null);
    setFormData({
      name: '', email: '', password: '', role: 'worker', is_active: 1,
      laundry_id: laundryId || (laundries.length > 0 ? laundries[0].id : '')
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
    setModalMode('edit');
    setSelectedId(user.id);
    setFormData({
      name: user.name, email: user.email, password: '',
      role: user.role, is_active: user.is_active, laundry_id: user.laundry_id || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = { ...formData };
      if (modalMode === 'edit' && !dataToSave.password) delete dataToSave.password;
      if (modalMode === 'add' && !dataToSave.password) {
        showToast('يرجى إدخال كلمة مرور للمستخدم الجديد', 'error');
        return;
      }
      const res = modalMode === 'add'
        ? await usersAPI.create(dataToSave)
        : await usersAPI.update(selectedId, dataToSave);
      if (res.success) {
        showToast(modalMode === 'add' ? 'تم إضافة المستخدم بنجاح' : 'تم تحديث بيانات المستخدم', 'success');
        setShowModal(false);
        loadData();
      } else {
        showToast(res.message || 'حدث خطأ أثناء الحفظ', 'error');
      }
    } catch (err) {
      showToast(err.message || 'خطأ في الاتصال', 'error');
    }
  };

  const handleToggleActive = async (user) => {
    const newStatus = user.is_active ? 0 : 1;
    if (!window.confirm(`هل أنت متأكد من ${newStatus === 1 ? 'تفعيل' : 'تعطيل'} حساب: ${user.name}؟`)) return;
    try {
      const res = await usersAPI.update(user.id, { is_active: newStatus });
      if (res.success) {
        showToast(`تم ${newStatus === 1 ? 'تفعيل' : 'تعطيل'} الحساب بنجاح`, 'success');
        loadData();
      }
    } catch (err) {
      showToast('خطأ أثناء تغيير حالة المستخدم', 'error');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`هل أنت متأكد من حذف ${user.name} نهائياً؟`)) return;
    try {
      const res = await usersAPI.delete(user.id);
      if (res.success) {
        showToast('تم حذف المستخدم نهائياً', 'success');
        loadData();
      }
    } catch (err) {
      showToast('خطأ أثناء حذف المستخدم', 'error');
    }
  };

  // Group users by laundry
  const usersByLaundry = {};
  users.forEach(u => {
    if (u.role === 'super_owner') return; // skip super owner
    const key = u.laundry_id || 'none';
    if (!usersByLaundry[key]) usersByLaundry[key] = [];
    usersByLaundry[key].push(u);
  });

  const RoleTag = ({ role }) => {
    const rolesMap = ROLE_CONFIG(t);
    const cfg = rolesMap[role] || { label: role, color: '#64748b', bg: '#f1f5f9', icon: UsersIcon };
    const Icon = cfg.icon;
    return (
      <span className="ul-role-tag" style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}30` }}>
        <Icon size={11} />
        {cfg.label}
      </span>
    );
  };

  const UserCard = ({ user }) => {
    const avatarColor = getAvatarGradient(user.name);
    return (
      <div className={`ul-user-card ${!user.is_active ? 'ul-user-card--inactive' : ''}`}>
        <div className="ul-user-card__avatar" style={{ background: avatarColor }}>
          {getInitials(user.name)}
        </div>
        <div className="ul-user-card__info">
          <span className="ul-user-card__name">{user.name}</span>
          <span className="ul-user-card__email">{user.email}</span>
          <div className="ul-user-card__badges">
            <RoleTag role={user.role} />
            <span className={`ul-status-dot ${user.is_active ? 'active' : 'inactive'}`}>
              {user.is_active ? (t('usersList.statusActive') || 'نشط') : (t('usersList.statusInactive') || 'معطل')}
            </span>
          </div>
        </div>
        <div className="ul-user-card__actions">
          <Switch checked={!!user.is_active} onChange={() => handleToggleActive(user)} />
          <button className="ul-icon-btn ul-icon-btn--edit" onClick={() => handleOpenEdit(user)} title="تعديل">
            <Edit2 size={14} />
          </button>
          <button className="ul-icon-btn ul-icon-btn--delete" onClick={() => handleDelete(user)} title="حذف">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  const LaundrySection = ({ laundry, index }) => {
    const laundryUsers = usersByLaundry[laundry.id] || [];
    const adminUsers = laundryUsers.filter(u => u.role === 'admin');
    const staffUsers = laundryUsers.filter(u => u.role !== 'admin');
    const isExpanded = expandedLaundries[laundry.id];
    const gradient = LAUNDRY_GRADIENTS[index % LAUNDRY_GRADIENTS.length];
    const activeInactive = laundry.is_active
      ? { label: t('usersList.statusActive') || 'نشطة', cls: 'ul-laundry-badge--active' }
      : { label: t('usersList.statusInactive') || 'معطلة', cls: 'ul-laundry-badge--inactive' };

    return (
      <div className="ul-laundry-section">
        {/* Laundry Header */}
        <div
          className="ul-laundry-header"
          style={{ background: laundry.is_active ? gradient : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}
          onClick={() => toggleLaundry(laundry.id)}
        >
          <div className="ul-laundry-header__left">
            <div className="ul-laundry-header__icon">
              <Building2 size={22} />
            </div>
            <div className="ul-laundry-header__meta">
              <h3 className="ul-laundry-header__name">{laundry.name}</h3>
              <div className="ul-laundry-header__stats">
                <span><UsersIcon size={12} /> {laundryUsers.length} {t('usersList.worker') || 'موظف'}</span>
                <span><Shield size={12} /> {adminUsers.length} {t('usersList.admin') || 'مدير'}</span>
              </div>
            </div>
          </div>
          <div className="ul-laundry-header__right">
            <span className={`ul-laundry-badge ${activeInactive.cls}`}>{activeInactive.label}</span>
            <button
              className="ul-add-staff-btn"
              onClick={(e) => { e.stopPropagation(); handleOpenAdd(laundry.id); }}
              title={t('usersList.addBtnTooltip') || "إضافة موظف لهذه المغسلة"}
            >
              <Plus size={14} /> {t('services.addBtn') || 'إضافة'}
            </button>
            <span className="ul-expand-icon">
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="ul-laundry-body">
            {laundryUsers.length === 0 ? (
              <div className="ul-laundry-empty">
                <UsersIcon size={28} />
                <p>{t('usersList.emptyStaff') || 'لا يوجد موظفون في هذه المغسلة'}</p>
                <button className="ul-add-first-btn" onClick={() => handleOpenAdd(laundry.id)}>
                  <Plus size={14} /> {t('usersList.addFirstBtn') || 'إضافة أول موظف'}
                </button>
              </div>
            ) : (
              <>
                {adminUsers.length > 0 && (
                  <div className="ul-staff-group">
                    <div className="ul-staff-group__title">
                      <Shield size={13} /> {t('usersList.managers') || 'المدراء'}
                    </div>
                    <div className="ul-staff-grid">
                      {adminUsers.map(u => <UserCard key={u.id} user={u} />)}
                    </div>
                  </div>
                )}
                {staffUsers.length > 0 && (
                  <div className="ul-staff-group">
                    <div className="ul-staff-group__title">
                      <UsersIcon size={13} /> {t('usersList.employees') || 'الموظفون'}
                    </div>
                    <div className="ul-staff-grid">
                      {staffUsers.map(u => <UserCard key={u.id} user={u} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page ul-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('usersList.title') || 'إدارة المستخدمين'}</h1>
          <p className="page-subtitle">{t('usersList.subtitle') || 'عرض وإدارة موظفي كل مغسلة بشكل منظم'}</p>
        </div>
        <Button variant="primary" onClick={() => handleOpenAdd()}>
          <Plus size={18} style={{ marginLeft: '8px' }} />
          {t('usersList.addNewBtn') || 'إضافة موظف جديد'}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center" style={{ height: '200px' }}>
          <LoadingSpinner />
        </div>
      ) : isSuperOwner ? (
        /* Super Owner: grouped by laundry */
        <>
          {/* Search Bar */}
          <div className="ul-search-bar">
            <div className="ul-search-input-wrapper">
              <svg className="ul-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                className="ul-search-input"
                type="text"
                placeholder={t('usersList.searchPlaceholder') || "ابحث باسم المغسلة..."}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="ul-search-clear" onClick={() => setSearchTerm('')}>✕</button>
              )}
            </div>
          </div>

          <div className="ul-laundries-list">
            {laundries.length === 0 ? (
              <EmptyState title={t('usersList.noLaundries') || "لا توجد مغاسل"} message={t('usersList.noLaundriesMsg') || "لم يتم إنشاء أي مغسلة بعد"} />
            ) : (() => {
              const filtered = laundries.filter(l =>
                l.name.toLowerCase().includes(searchTerm.toLowerCase())
              );
              return filtered.length === 0 ? (
                <div className="ul-search-empty">
                  <p>{t('usersList.noSearchMatch') || 'لم يتم العثور على مغسلة باسم'} "<strong>{searchTerm}</strong>"</p>
                </div>
              ) : (
                filtered.map((laundry, idx) => (
                  <LaundrySection key={laundry.id} laundry={laundry} index={idx} />
                ))
              );
            })()}
          </div>
        </>
      ) : (
        /* Admin: flat table */
        users.length === 0 ? (
          <EmptyState title={t('usersList.noUsers') || "لا يوجد مستخدمون"} message={t('usersList.noUsersMsg') || "لم نجد أي مستخدمين مسجلين."} />
        ) : (
          <div className="ul-staff-grid ul-staff-grid--flat">
            {users.map(u => <UserCard key={u.id} user={u} />)}
          </div>
        )
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'add' ? (t('usersList.addModalTitle') || 'إضافة موظف جديد') : (t('usersList.editModalTitle') || 'تعديل بيانات الموظف')}
      >
        <form onSubmit={handleSave} noValidate>
          <Input id="u-name" label={t('usersList.nameLabel') || "الاسم بالكامل *"} type="text" required
            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('usersList.namePlaceholder') || "مثال: أحمد عبد الله"} />

          <Input id="u-email" label={t('usersList.emailLabel') || "البريد الإلكتروني *"} type="email" required
            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
            placeholder="example@domain.com" />

          <Input
            id="u-password"
            label={`${t('usersList.passwordLabel') || 'كلمة المرور'} ${modalMode === 'edit' ? t('usersList.passwordEditDesc') : '*'}`}
            type="password" value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••" required={modalMode === 'add'} />

          <div className="form-group">
            <label className="form-label">{t('usersList.roleLabel') || 'الصلاحية (الدور)'}</label>
            <select className="form-select" value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}>
              <option value="worker">{t('rolesDescriptions.workerDesc') || 'عامل تشغيل - تحديث حالة القطع فقط'}</option>
              <option value="cashier">{t('rolesDescriptions.cashierDesc') || 'موظف استقبال - تسجيل طلبات وفواتير'}</option>
              <option value="admin">{t('rolesDescriptions.adminDesc') || 'مدير المغسلة - صلاحيات كاملة'}</option>
            </select>
          </div>

          {isSuperOwner && laundries.length > 0 && (
            <div className="form-group">
              <label className="form-label">{t('usersList.laundryLabel') || 'المغسلة'}</label>
              <select className="form-select" value={formData.laundry_id}
                onChange={e => setFormData({ ...formData, laundry_id: parseInt(e.target.value) })}>
                {laundries.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{t('usersList.statusLabel') || 'الحالة'}</label>
            <select className="form-select" value={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: parseInt(e.target.value) })}>
              <option value="1">{t('usersList.statusActive') || 'نشط'}</option>
              <option value="0">{t('usersList.statusInactive') || 'معطل'}</option>
            </select>
          </div>

          <div className="flex justify-between mt-md">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>{t('services.cancelBtn') || 'إلغاء'}</Button>
            <Button variant="primary" type="submit">{t('usersList.saveBtn') || 'حفظ البيانات'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
