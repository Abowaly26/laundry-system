import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import { User, Mail, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import './Profile.css';

export default function Profile() {
  const { t } = useTranslation();
  const { user, logout, updateLocalUser } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field as the user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateNewPassword = (pwd) => {
    if (!pwd) return null;
    if (pwd.length < 8) {
      return 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل (A-Z)';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل (a-z)';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل (0-9)';
    }
    if (!/[@$!%*?&#]/.test(pwd)) {
      return 'يجب أن تحتوي على رمز خاص واحد على الأقل (مثل @, $, !, %, *, ?)';
    }
    return null;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'الاسم الكامل مطلوب';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    }

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'كلمة المرور الحالية مطلوبة لتأكيد التغييرات';
    }

    if (formData.newPassword) {
      const pwdError = validateNewPassword(formData.newPassword);
      if (pwdError) {
        newErrors.newPassword = pwdError;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'تأكيد كلمة المرور غير متطابق مع كلمة المرور الجديدة';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          name: formData.name,
          email: formData.email,
          newPassword: formData.newPassword || undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        showToast(data.message, 'success');
        
        if (data.requireRelogin) {
          showToast('يرجى تسجيل الدخول مجدداً باستخدام كلمة المرور الجديدة', 'info');
          setTimeout(() => logout(), 2000);
        } else {
          updateLocalUser(data.data);
          setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        }
      } else {
        // Map backend validation errors to fields
        if (data.errorField) {
          setErrors({ [data.errorField]: data.message });
        } else {
          showToast(data.message || 'حدث خطأ أثناء تحديث البيانات', 'error');
        }
      }
    } catch (error) {
      console.error(error);
      showToast('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page profile-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('profile.title') || 'الملف الشخصي'}</h1>
          <p className="page-subtitle">{t('profile.subtitle') || 'تعديل بيانات الحساب وكلمة المرور'}</p>
        </div>
      </div>

      <div className="profile-container">
        <form onSubmit={handleSubmit} className="profile-form">
          <Card title={t('profile.personalInfo') || 'البيانات الأساسية'}>
            <div className="form-group">
              <label className="form-label">{t('profile.name') || 'الاسم الكامل'}</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  name="name"
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              {errors.name && <p className="form-error">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">{t('profile.email') || 'البريد الإلكتروني'}</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  name="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>
          </Card>

          <Card title={t('profile.security') || 'الأمان وكلمة المرور'} className="mt-md">
            <div className="form-group">
              <label className="form-label required">{t('profile.currentPassword') || 'كلمة المرور الحالية (مطلوبة لتأكيد أي تعديل)'}</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon text-warning" />
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  className={`form-input ${errors.currentPassword ? 'error' : ''}`}
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                  placeholder="أدخل كلمة المرور الحالية"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={showCurrentPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.currentPassword && <p className="form-error">{errors.currentPassword}</p>}
            </div>

            <hr className="divider" />
            <p className="text-muted small mb-3">اترك الحقول التالية فارغة إذا كنت لا ترغب بتغيير كلمة المرور</p>

            <div className="form-group-row">
              <div className="form-group flex-1">
                <label className="form-label">{t('profile.newPassword') || 'كلمة المرور الجديدة'}</label>
                <div className="input-with-icon">
                  <ShieldCheck size={18} className="input-icon" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    className={`form-input ${errors.newPassword ? 'error' : ''}`}
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="كلمة مرور قوية (8 أحرف على الأقل)"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.newPassword && <p className="form-error">{errors.newPassword}</p>}
              </div>
              <div className="form-group flex-1">
                <label className="form-label">{t('profile.confirmPassword') || 'تأكيد كلمة المرور الجديدة'}</label>
                <div className="input-with-icon">
                  <ShieldCheck size={18} className="input-icon" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="أعد إدخال كلمة المرور"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
              </div>
            </div>
          </Card>

          <div className="profile-actions mt-lg">
            <Button type="submit" variant="primary" isLoading={isLoading}>
              {t('profile.saveBtn') || 'حفظ التعديلات'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
