import { useState, useEffect } from 'react';
import { Plus, User, Edit2 } from 'lucide-react';
import { usersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import './Users.css';

export default function Users() {
  const { showToast } = useToast();

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
    is_active: 1
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

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'worker',
      is_active: 1
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
    setModalMode('edit');
    setSelectedId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // نترك حقل الباسورد فارغ لتغييره فقط عند الحاجة
      role: user.role,
      is_active: user.is_active
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
          showToast('يرجى إدخال كلمة مرور للمستخدم الجديد', 'error');
          return;
        }
        res = await usersAPI.create(dataToSave);
      } else {
        res = await usersAPI.update(selectedId, dataToSave);
      }

      if (res.success) {
        showToast(modalMode === 'add' ? 'تم إضافة المستخدم بنجاح' : 'تم تحديث بيانات المستخدم بنجاح', 'success');
        setShowModal(false);
        loadUsers();
      } else {
        showToast(res.message || 'حدث خطأ أثناء حفظ المستخدم', 'error');
      }
    } catch (err) {
      showToast(err.message || 'حدث خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleToggleActive = async (user) => {
    const newStatus = user.is_active ? 0 : 1;
    if (!window.confirm(`هل أنت متأكد من رغبتك في ${newStatus === 1 ? 'تفعيل' : 'تعطيل'} حساب المستخدم: ${user.name}؟`)) {
      return;
    }

    try {
      const res = await usersAPI.update(user.id, { is_active: newStatus });
      if (res.success) {
        showToast(`تم ${newStatus === 1 ? 'تفعيل' : 'تعطيل'} حساب المستخدم بنجاح`, 'success');
        loadUsers();
      } else {
        showToast(res.message || 'فشل في تغيير حالة المستخدم', 'error');
      }
    } catch (err) {
      showToast(err.message || 'خطأ أثناء تغيير حالة المستخدم', 'error');
    }
  };

  const getRoleAr = (role) => {
    const rolesMapping = {
      admin: 'مدير النظام (Admin)',
      cashier: 'موظف استقبال (Cashier)',
      worker: 'عامل تشغيل (Worker)'
    };
    return rolesMapping[role] || role;
  };

  return (
    <div className="page users-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة مستخدمي النظام</h1>
          <p className="page-subtitle">إضافة وتعديل موظفي الاستقبال والعمال والمدراء وتعيين الصلاحيات</p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd}>
          <Plus size={18} style={{ marginLeft: '8px' }} />
          إضافة موظف جديد
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center" style={{ height: '200px' }}>
          <LoadingSpinner />
        </div>
      ) : users.length === 0 ? (
        <EmptyState 
          title="لا يوجد مستخدمون" 
          message="لم نجد أي مستخدمين مسجلين."
        />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>اسم الموظف</th>
                <th>البريد الإلكتروني</th>
                <th>الصلاحية (الدور)</th>
                <th>الحالة</th>
                <th style={{ width: '180px', textAlign: 'center' }}>العمليات</th>
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
                  <td>
                    <span className={`role-tag ${user.role}`}>
                      {getRoleAr(user.role)}
                    </span>
                  </td>
                  <td>
                    {user.is_active ? (
                      <span className="user-active-badge text-success">نشط</span>
                    ) : (
                      <span className="user-inactive-badge text-error">معطل</span>
                    )}
                  </td>
                  <td className="text-center">
                    <div className="flex justify-center gap-sm">
                      <Button variant="secondary" size="small" onClick={() => handleOpenEdit(user)}>
                        <Edit2 size={14} style={{ marginLeft: '4px' }} />
                        تعديل
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="small" 
                        className={user.is_active ? 'text-error' : 'text-success'}
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                      </Button>
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
        title={modalMode === 'add' ? 'إضافة موظف جديد' : 'تعديل موظف'}
      >
        <form onSubmit={handleSave} noValidate>
          <Input
            id="user-name"
            label="الاسم بالكامل *"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="مثال: أحمد عبد الله"
          />
          
          <Input
            id="user-email"
            label="البريد الإلكتروني *"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="أدخل بريدك الإلكتروني"
          />

          <Input
            id="user-password"
            label={`كلمة المرور ${modalMode === 'edit' ? '(اتركها فارغة إذا لم ترغب بتغييرها)' : ''}`}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••"
            required={modalMode === 'add'}
          />

          <div className="form-group">
            <label className="form-label">الصلاحية (الدور)</label>
            <select
              className="form-select"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="worker">عامل تشغيل (Worker) - لتحديث القطع فقط</option>
              <option value="cashier">موظف استقبال (Cashier) - تسجيل طلبات وفواتير</option>
              <option value="admin">مدير النظام (Admin) - صلاحيات كاملة</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">الحالة</label>
            <select
              className="form-select"
              value={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value) })}
            >
              <option value="1">نشط</option>
              <option value="0">معطل</option>
            </select>
          </div>

          <div className="flex justify-between mt-md">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit">
              حفظ البيانات
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
