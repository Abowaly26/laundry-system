import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, User, Edit2, Building2 } from 'lucide-react';
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

export default function Users() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { isSuperOwner } = useAuth();
  const [laundries, setLaundries] = useState([]);

  const getInitials = (name) => {
    if (!name) return '؟';
    return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2);
  };

  const getAvatarGradient = (name) => {
    const gradients = [
      'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)', // Indigo/Blue
      'linear-gradient(135deg, #10B981 0%, #059669 100%)', // Emerald/Green
      'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', // Amber/Orange
      'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)', // Pink/Rose
      'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)', // Purple/Violet
      'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)', // Cyan/Teal
    ];
    let hash = 0;
    const nameStr = name || '';
    for (let i = 0; i < nameStr.length; i++) {
      hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // شاشات الإضافة والتعديل
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'worker',
    is_active: 1,
    laundry_id: ''
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.getAll();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // جلب المغاسل للـ super_owner
  const loadLaundries = async () => {
    if (!isSuperOwner) return;
    try {
      const res = await laundriesAPI.getAll();
      if (res.success) setLaundries(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    loadUsers();
    loadLaundries();
  }, [isSuperOwner]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'worker',
      is_active: 1,
      laundry_id: laundries.length > 0 ? laundries[0].id : ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
    setModalMode('edit');
    setSelectedId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      is_active: user.is_active,
      laundry_id: user.laundry_id || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      let res;
      const dataToSave = { ...formData };
      
      // في التعديل: إذا لم يُدخل كلمة مرور، نحذفها من البيانات المرسلة
      if (modalMode === 'edit' && !dataToSave.password) {
        delete dataToSave.password;
      }

      if (modalMode === 'add') {
        if (!dataToSave.password) {
          showToast(t('usersList.passwordRequired') || 'يرجى إدخال كلمة مرور للمستخدم الجديد', 'error');
          return;
        }
        res = await usersAPI.create(dataToSave);
      } else {
        res = await usersAPI.update(selectedId, dataToSave);
      }

      if (res.success) {
        showToast(modalMode === 'add' ? t('usersList.addSuccess') || 'تم إضافة المستخدم بنجاح' : t('usersList.updateSuccess') || 'تم تحديث بيانات المستخدم بنجاح', 'success');
        setShowModal(false);
        loadUsers();
      } else {
        showToast(res.message || t('usersList.saveError') || 'حدث خطأ أثناء حفظ المستخدم', 'error');
      }
    } catch (err) {
      showToast(err.message || t('usersList.networkError') || 'حدث خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleToggleActive = async (user) => {
    const newStatus = user.is_active ? 0 : 1;
    if (!window.confirm(t('usersList.confirmToggleStatus', { action: newStatus === 1 ? (t('usersList.activate') || 'تفعيل') : (t('usersList.deactivate') || 'تعطيل'), name: user.name }) || `هل أنت متأكد من رغبتك في ${newStatus === 1 ? 'تفعيل' : 'تعطيل'} حساب المستخدم: ${user.name}؟`)) {
      return;
    }

    try {
      const res = await usersAPI.update(user.id, { is_active: newStatus });
      if (res.success) {
        showToast(t('usersList.statusSuccess', { action: newStatus === 1 ? (t('usersList.activate') || 'تفعيل') : (t('usersList.deactivate') || 'تعطيل') }) || `تم ${newStatus === 1 ? 'تفعيل' : 'تعطيل'} حساب المستخدم بنجاح`, 'success');
        loadUsers();
      } else {
        showToast(res.message || t('usersList.statusError') || 'فشل في تغيير حالة المستخدم', 'error');
      }
    } catch (err) {
      showToast(err.message || t('usersList.statusNetworkError') || 'خطأ أثناء تغيير حالة المستخدم', 'error');
    }
  };

  const getRoleAr = (role) => {
    const rolesMapping = {
      super_owner: t('roles.super_owner') || '👑 صاحب النظام',
      admin: t('roles.admin') || 'مدير النظام (Admin)',
      cashier: t('roles.cashier') || 'موظف استقبال (Cashier)',
      worker: t('roles.worker') || 'عامل تشغيل (Worker)'
    };
    return rolesMapping[role] || role;
  };

  return (
    <div className="page users-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('usersList.title') || 'إدارة مستخدمي النظام'}</h1>
          <p className="page-subtitle">{t('usersList.subtitle') || 'إضافة وتعديل موظفي الاستقبال والعمال والمدراء وتعيين الصلاحيات'}</p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd}>
          <Plus size={18} style={{ marginLeft: '8px' }} />
          {t('usersList.addNewBtn') || 'إضافة موظف جديد'}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center" style={{ height: '200px' }}>
          <LoadingSpinner />
        </div>
      ) : users.length === 0 ? (
        <EmptyState 
          title={t('usersList.emptyStateTitle') || 'لا يوجد مستخدمون'} 
          message={t('usersList.emptyStateMsg') || 'لم نجد أي مستخدمين مسجلين.'}
        />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('usersList.colName') || 'اسم الموظف'}</th>
                <th>{t('usersList.colEmail') || 'البريد الإلكتروني'}</th>
                {isSuperOwner && <th><Building2 size={14} style={{verticalAlign:'middle', marginLeft:'4px'}}/>{t('usersList.colLaundry') || 'المغسلة'}</th>}
                <th>{t('usersList.colRole') || 'الصلاحية (الدور)'}</th>
                <th>{t('usersList.colStatus') || 'الحالة'}</th>
                <th style={{ width: '180px', textAlign: 'center' }}>{t('usersList.colActions') || 'العمليات'}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-sm">
                      <div 
                        className="avatar-wrapper"
                        style={{ 
                          background: getAvatarGradient(user.name),
                          color: '#FFFFFF',
                          fontWeight: 'bold',
                          fontSize: '0.8rem'
                        }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <strong>{user.name}</strong>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  {isSuperOwner && (
                    <td>
                      <span style={{fontSize:'0.8rem', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'4px'}}>
                        <Building2 size={12}/>
                        {user.laundry_name || '—'}
                      </span>
                    </td>
                  )}
                  <td>
                    <span className={`role-tag ${user.role}`}>
                      {getRoleAr(user.role)}
                    </span>
                  </td>
                  <td>
                    {user.is_active ? (
                      <span className="user-active-badge text-success">{t('usersList.statusActive') || 'نشط'}</span>
                    ) : (
                      <span className="user-inactive-badge text-error">{t('usersList.statusInactive') || 'معطل'}</span>
                    )}
                  </td>
                  <td className="text-center">
                    <div className="flex justify-center gap-sm">
                      <Button variant="secondary" size="small" onClick={() => handleOpenEdit(user)}>
                        <Edit2 size={14} style={{ marginLeft: '4px' }} />
                        {t('usersList.editBtn') || 'تعديل'}
                      </Button>
                      <div className="flex items-center" title={user.is_active ? (t('usersList.deactivateTitle') || 'تعطيل الحساب') : (t('usersList.activateTitle') || 'تفعيل الحساب')}>
                        <Switch 
                          checked={user.is_active ? true : false} 
                          onChange={() => handleToggleActive(user)} 
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال الإضافة والتعديل */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'add' ? (t('usersList.addModalTitle') || 'إضافة موظف جديد') : (t('usersList.editModalTitle') || 'تعديل موظف')}
      >
        <form onSubmit={handleSave} noValidate>
          <Input
            id="user-name"
            label={t('usersList.nameLabel') || 'الاسم بالكامل *'}
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('usersList.namePlaceholder') || 'مثال: أحمد عبد الله'}
          />
          
          <Input
            id="user-email"
            label={t('usersList.emailLabel') || 'البريد الإلكتروني *'}
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder={t('usersList.emailPlaceholder') || 'أدخل بريدك الإلكتروني'}
          />

          <Input
            id="user-password"
            label={`${t('usersList.passwordLabel') || 'كلمة المرور'} ${modalMode === 'edit' ? (t('usersList.passwordEditDesc') || '(اتركها فارغة إذا لم ترغب بتغييرها)') : ''}`}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••"
            required={modalMode === 'add'}
          />

          <div className="form-group">
            <label className="form-label">{t('usersList.roleLabel') || 'الصلاحية (الدور)'}</label>
            <select
              className="form-select"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="worker">{t('roles.workerDesc') || 'عامل تشغيل (Worker) - لتحديث القطع فقط'}</option>
              <option value="cashier">{t('roles.cashierDesc') || 'موظف استقبال (Cashier) - تسجيل طلبات وفواتير'}</option>
              <option value="admin">{t('roles.adminDesc') || 'مدير النظام (Admin) - صلاحيات كاملة'}</option>
            </select>
          </div>

          {/* super_owner يحدد المغسلة */}
          {isSuperOwner && laundries.length > 0 && (
            <div className="form-group">
              <label className="form-label">{t('usersList.laundryLabel') || 'المغسلة'}</label>
              <select
                className="form-select"
                value={formData.laundry_id}
                onChange={(e) => setFormData({ ...formData, laundry_id: parseInt(e.target.value) })}
              >
                {laundries.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{t('usersList.statusLabel') || 'الحالة'}</label>
            <select
              className="form-select"
              value={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value) })}
            >
              <option value="1">{t('usersList.statusActive') || 'نشط'}</option>
              <option value="0">{t('usersList.statusInactive') || 'معطل'}</option>
            </select>
          </div>

          <div className="flex justify-between mt-md">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              {t('usersList.cancelBtn') || 'إلغاء'}
            </Button>
            <Button variant="primary" type="submit">
              {t('usersList.saveBtn') || 'حفظ البيانات'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
