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
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.currentPassword) {
      showToast(t('profile.currentPasswordRequired') || 'كلمة المرور الحالية مطلوبة', 'error');
      return false;
    }
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      showToast(t('profile.passwordMismatch') || 'كلمة المرور الجديدة غير متطابقة', 'error');
      return false;
    }
    if (formData.newPassword && formData.newPassword.length < 6) {
      showToast(t('profile.passwordTooShort') || 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'error');
      return false;
    }
    return true;
  };

  const handleRequestUpdate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/request-profile-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newName: formData.name !== user.name ? formData.name : undefined,
          newEmail: formData.email !== user.email ? formData.email : undefined,
          newPassword: formData.newPassword || undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        showToast(data.message, 'success');
        if (data.devOtp) {
          setDevOtp(data.devOtp); // فقط للتطوير إذا لم يتم إعداد البريد
        }
        setShowOtpModal(true);
      } else {
        showToast(data.message || 'حدث خطأ', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmUpdate = async (e) => {
    e.preventDefault();
    if (!otpCode) {
      showToast('الرجاء إدخال رمز التحقق', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ otpCode })
      });

      const data = await response.json();
      if (data.success) {
        showToast(data.message, 'success');
        setShowOtpModal(false);
        setOtpCode('');
        
        if (data.requireRelogin) {
          showToast('يرجى تسجيل الدخول مجدداً باستخدام كلمة المرور الجديدة', 'info');
          setTimeout(() => logout(), 2000);
        } else {
          // تحديث بيانات المستخدم في الـ Context
          updateLocalUser(data.data);
          setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        }
      } else {
        showToast(data.message || 'حدث خطأ', 'error');
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
        <form onSubmit={handleRequestUpdate} className="profile-form">
          <Card title={t('profile.personalInfo') || 'البيانات الأساسية'}>
            <div className="form-group">
              <label className="form-label">{t('profile.name') || 'الاسم الكامل'}</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('profile.email') || 'البريد الإلكتروني'}</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
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
                  className="form-input"
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
                    className="form-input"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="كلمة مرور قوية (6 أحرف على الأقل)"
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
              </div>
              <div className="form-group flex-1">
                <label className="form-label">{t('profile.confirmPassword') || 'تأكيد كلمة المرور الجديدة'}</label>
                <div className="input-with-icon">
                  <ShieldCheck size={18} className="input-icon" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    className="form-input"
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

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="modal-overlay">
          <div className="modal-content otp-modal">
            <h2 className="modal-title">{t('profile.otpTitle') || 'التحقق بخطوتين'}</h2>
            <p className="modal-description">
              {t('profile.otpDesc') || 'تم إرسال رمز تحقق (OTP) إلى بريدك الإلكتروني.'}
              <br />
              يرجى إدخال الرمز المكون من 6 أرقام لتأكيد التغييرات.
            </p>

            {devOtp && (
              <div className="dev-otp-alert">
                <small>ملاحظة تطويرية (سيتم إخفاؤها في الإنتاج):</small><br/>
                <strong>رمز التحقق الخاص بك هو: {devOtp}</strong>
              </div>
            )}

            <form onSubmit={handleConfirmUpdate}>
              <div className="form-group">
                <input
                  type="text"
                  className="form-input otp-input"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="------"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setShowOtpModal(false)}>
                  إلغاء
                </Button>
                <Button type="submit" variant="primary" isLoading={isLoading}>
                  تأكيد
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
