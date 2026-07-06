import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WashingMachine } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import './Login.css';

export default function Login() {
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
      setEmailError('يرجى إدخال البريد الإلكتروني');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('صيغة البريد الإلكتروني غير صحيحة');
      isValid = false;
    }

    if (!password) {
      setPasswordError('يرجى إدخال كلمة المرور');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setGeneralError(err.message || 'فشل تسجيل الدخول. تحقق من البيانات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <WashingMachine size={32} />
          </div>
          <h1 className="login-title">المغسلة الذكية</h1>
          <p className="login-subtitle">سجل دخولك للمتابعة</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {generalError && <div className="login-error">{generalError}</div>}

          <Input
            id="email"
            label="البريد الإلكتروني"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="أدخل بريدك الإلكتروني"
            autoComplete="email"
            error={emailError}
          />

          <Input
            id="password"
            label="كلمة المرور"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            error={passwordError}
          />

          <div className="login-submit">
            <Button type="submit" loading={loading}>
              تسجيل الدخول
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
