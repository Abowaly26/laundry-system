import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { WashingMachine } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import './Login.css';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const validate = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    if (!email) {
      setEmailError(t('login.emailRequired') || 'يرجى إدخال البريد الإلكتروني');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t('login.emailInvalid') || 'صيغة البريد الإلكتروني غير صحيحة');
      isValid = false;
    }

    if (!password) {
      setPasswordError(t('login.passwordRequired') || 'يرجى إدخال كلمة المرور');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError(t('login.passwordShort') || 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      const loggedUser = await login({ email, password });
      
      // If the origin path was root, route specifically based on user role
      let targetPath = from;
      if (from === '/') {
        if (loggedUser?.role === 'super_owner') {
          targetPath = '/laundries';
        } else if (loggedUser?.role === 'worker') {
          targetPath = '/tracking';
        }
      }
      navigate(targetPath, { replace: true });
    } catch (err) {
      setGeneralError(err.message || t('login.loginFailed') || 'فشل تسجيل الدخول. تحقق من البيانات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-container">
            <img src="/logo.png" alt={t('login.logoAlt') || "شعار نظام إدارة المغسلة"} className="login-logo-image" />
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {generalError && <div className="login-error">{generalError}</div>}

          <Input
            id="email"
            label={t('login.emailLabel') || 'البريد الإلكتروني'}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('login.emailPlaceholder') || 'أدخل بريدك الإلكتروني'}
            autoComplete="email"
            error={emailError}
          />

          <Input
            id="password"
            label={t('login.passwordLabel') || 'كلمة المرور'}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            error={passwordError}
          />

          <div className="login-submit">
            <Button type="submit" loading={loading}>
              {t('login.submitBtn') || 'تسجيل الدخول'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
