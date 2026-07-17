import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import { Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';
import './Settings.css';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings, defaults } = useSettings();
  const { showToast } = useToast();
  const { isAdmin, user, isSuperOwner } = useAuth();

  const [formData, setFormData] = useState({
    laundryName: settings.laundryName || '',
    laundryPhone: settings.laundryPhone || '',
    laundryAddress: settings.laundryAddress || '',
    taxNumber: settings.taxNumber || '',
    vatPercent: settings.vatPercent !== undefined ? settings.vatPercent : 15,
    currency: settings.currency || 'ر.س',
    defaultCountryCode: settings.defaultCountryCode || '966',
    whatsappTemplate: settings.whatsappTemplate || ''
  });

  // Dynamically update form fields when settings change (e.g. on language change or logout/login)
  useEffect(() => {
    setFormData({
      laundryName: settings.laundryName || '',
      laundryPhone: settings.laundryPhone || '',
      laundryAddress: settings.laundryAddress || '',
      taxNumber: settings.taxNumber || '',
      vatPercent: settings.vatPercent !== undefined ? settings.vatPercent : 15,
      currency: settings.currency || 'ر.س',
      defaultCountryCode: settings.defaultCountryCode || '966',
      whatsappTemplate: settings.whatsappTemplate || ''
    });
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'vatPercent' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast(t('settings.adminRequired') || 'عذراً، يجب تسجيل الدخول بحساب مدير النظام لتغيير الإعدادات', 'error');
      return;
    }
    updateSettings(formData);
    showToast(t('settings.saveSuccess') || 'تم حفظ إعدادات النظام بنجاح', 'success');
  };

  const handleRestoreDefaults = () => {
    if (!window.confirm(t('settings.confirmRestore') || 'هل أنت متأكد من رغبتك في استعادة الإعدادات الافتراضية؟')) return;
    setFormData({ ...defaults });
    showToast(t('settings.restoreSuccess') || 'تم استعادة القيم الافتراضية، اضغط حفظ للتأكيد', 'info');
  };

  return (
    <div className="page settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('settings.title') || 'إعدادات النظام'}</h1>
          <p className="page-subtitle">{t('settings.subtitle') || 'تخصيص هوية المغسلة، الضرائب، العملة، وقالب رسائل الواتساب'}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="settings-form">
        <div className="settings-grid">
          {/* العمود الأول: تفاصيل الهوية والمالية */}
          <div className="settings-col">
            <Card title={t('settings.identityTitle') || 'بيانات الهوية والاتصال'}>
              <div className="form-group">
                <label className="form-label">{t('settings.laundryName') || 'اسم المغسلة (العلامة التجارية)'}</label>
                <input
                  type="text"
                  name="laundryName"
                  className="form-input"
                  value={formData.laundryName}
                  onChange={handleChange}
                  required
                  placeholder={t('settings.laundryNamePlaceholder') || 'مثال: مغسلة النظافة الذكية'}
                />
              </div>

              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label className="form-label">{t('settings.phone') || 'رقم الهاتف'}</label>
                  <input
                    type="text"
                    name="laundryPhone"
                    className="form-input"
                    value={formData.laundryPhone}
                    onChange={handleChange}
                    required
                    placeholder={t('settings.phonePlaceholder') || 'مثال: 0501234567'}
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">{t('settings.currency') || 'العملة الافتراضية'}</label>
                  <input
                    type="text"
                    name="currency"
                    className="form-input"
                    value={formData.currency}
                    onChange={handleChange}
                    required
                    placeholder={t('settings.currencyPlaceholder') || 'مثال: ر.س، د.إ، ج.م'}
                  />
                </div>
              </div>
              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label className="form-label">{t('settings.countryCode') || 'كود الدولة (للواتساب)'}</label>
                  <input
                    type="text"
                    name="defaultCountryCode"
                    className="form-input"
                    value={formData.defaultCountryCode}
                    onChange={handleChange}
                    required
                    placeholder={t('settings.countryCodePlaceholder') || 'مثال: 966، 20، 971'}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('settings.address') || 'العنوان الجغرافي'}</label>
                <input
                  type="text"
                  name="laundryAddress"
                  className="form-input"
                  value={formData.laundryAddress}
                  onChange={handleChange}
                  placeholder={t('settings.addressPlaceholder') || 'مثال: الرياض، حي السليمانية / القاهرة، المعادي'}
                />
              </div>
            </Card>

            <Card title={t('settings.taxTitle') || 'الضريبة والفوترة (الإعدادات المالية)'} className="mt-md">
              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label className="form-label">{t('settings.vat') || 'نسبة ضريبة القيمة المضافة (%)'}</label>
                  <input
                    type="number"
                    name="vatPercent"
                    className="form-input"
                    value={formData.vatPercent}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="any"
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">{t('settings.taxNumber') || 'الرقم الضريبي للمنشأة'}</label>
                  <input
                    type="text"
                    name="taxNumber"
                    className="form-input"
                    value={formData.taxNumber}
                    onChange={handleChange}
                    placeholder={t('settings.taxNumberPlaceholder') || 'مثال: 300012345600003'}
                  />
                </div>
              </div>
              <p className="settings-tip">
                {t('settings.taxTip') || '* الرقم الضريبي ونسبة الضريبة يظهران تلقائياً في الفاتورة المطبوعة للعملاء تماشياً مع متطلبات الجهات الضريبية المحلية.'}
              </p>
            </Card>
          </div>

          {/* العمود الثاني: قالب الواتساب ومفاتيح المساعدة */}
          <div className="settings-col">
            <Card title={t('settings.whatsappTitle') || 'قالب رسائل الواتساب تلقائية الإرسال'}>
              <div className="form-group">
                <label className="form-label">{t('settings.whatsappLabel') || 'محتوى رسالة التأكيد والمشاركة'}</label>
                <textarea
                  name="whatsappTemplate"
                  className="form-textarea whatsapp-template-input"
                  value={formData.whatsappTemplate}
                  onChange={handleChange}
                  rows={10}
                  required
                  style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}
                  placeholder={t('settings.whatsappPlaceholder') || 'اكتب قالب الرسالة هنا...'}
                />
              </div>

              <div className="template-placeholders-box">
                <span className="placeholders-title">{t('settings.placeholdersTitle') || 'مفاتيح الاستبدال المتاحة للاستخدام:'}</span>
                <ul className="placeholders-list">
                  <li><code>{`{customer_name}`}</code> - {t('settings.phCustomerName') || 'اسم العميل'}</li>
                  <li><code>{`{order_id}`}</code> - {t('settings.phOrderId') || 'رقم الفاتورة'}</li>
                  <li><code>{`{items_count}`}</code> - {t('settings.phItemsCount') || 'عدد الملابس والقطع'}</li>
                  <li><code>{`{total_amount}`}</code> - {t('settings.phTotalAmount') || 'إجمالي المبلغ المستحق'}</li>
                  <li><code>{`{remaining_amount}`}</code> - {t('settings.phRemainingAmount') || 'المبلغ المتبقي عند التسليم'}</li>
                  <li><code>{`{currency}`}</code> - {t('settings.phCurrency') || 'العملة الافتراضية'}</li>
                  <li><code>{`{delivery_date}`}</code> - {t('settings.phDeliveryDate') || 'موعد التسليم'}</li>
                  <li><code>{`{tracking_link}`}</code> - {t('settings.phTrackingLink') || 'رابط تعقب حالة الغسيل'}</li>
                </ul>
              </div>
            </Card>

            {/* باقة الاشتراك والوقت المتبقي */}
            {!isSuperOwner && user && (
              <Card title={t('settings.subscriptionTitle') || 'تفاصيل باقة الاشتراك'} className="mt-md">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>نوع الباقة الحالية:</span>
                    <strong style={{ 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      color: 'var(--primary)', 
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '0.88rem' 
                    }}>
                      {user.laundry_plan_type === 'lifetime' ? '♾️ مدى الحياة (دائم)' : 
                       user.laundry_plan_type === 'monthly' ? 'شهرية' :
                       user.laundry_plan_type === '6months' ? '6 أشهر' :
                       user.laundry_plan_type === '1year' ? 'سنة واحدة' :
                       user.laundry_plan_type === '3years' ? '3 سنوات' :
                       user.laundry_plan_type === '5years' ? '5 سنوات' : user.laundry_plan_type}
                    </strong>
                  </div>

                  {user.laundry_plan_type !== 'lifetime' && user.laundry_subscription_end_date && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>تاريخ انتهاء الاشتراك:</span>
                        <strong>{new Date(user.laundry_subscription_end_date).toLocaleDateString('ar-EG')}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>الوقت المتبقي:</span>
                        <strong style={{ 
                          color: (() => {
                            const diffDays = Math.ceil((new Date(user.laundry_subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24));
                            return diffDays <= 7 ? '#ef4444' : diffDays <= 30 ? '#f59e0b' : '#10b981';
                          })(),
                          fontWeight: 'bold'
                        }}>
                          {(() => {
                            const diffDays = Math.ceil((new Date(user.laundry_subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24));
                            if (diffDays <= 0) return 'منتهي!';
                            const isEn = i18n.language === 'en';
                            if (isEn) {
                              return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
                            } else {
                              if (diffDays === 1) return 'يوم واحد';
                              if (diffDays === 2) return 'يومين';
                              if (diffDays >= 3 && diffDays <= 10) return `${diffDays} أيام`;
                              return `${diffDays} يوم`;
                            }
                          })()}
                        </strong>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>

        <div className="settings-actions mt-lg">
          <Button type="submit" variant="primary">
            <Save size={18} style={{ marginLeft: '8px' }} />
            {t('settings.saveBtn') || 'حفظ إعدادات النظام'}
          </Button>
        </div>
      </form>
    </div>
  );
}
