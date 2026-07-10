import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import { Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';
import './Settings.css';

export default function Settings() {
  const { settings, updateSettings, defaults } = useSettings();
  const { showToast } = useToast();
  const { isAdmin } = useAuth();

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
      showToast('عذراً، يجب تسجيل الدخول بحساب مدير النظام لتغيير الإعدادات', 'error');
      return;
    }
    updateSettings(formData);
    showToast('تم حفظ إعدادات النظام بنجاح', 'success');
  };

  const handleRestoreDefaults = () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في استعادة الإعدادات الافتراضية؟')) return;
    setFormData({ ...defaults });
    showToast('تم استعادة القيم الافتراضية، اضغط حفظ للتأكيد', 'info');
  };

  return (
    <div className="page settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">إعدادات النظام</h1>
          <p className="page-subtitle">تخصيص هوية المغسلة، الضرائب، العملة، وقالب رسائل الواتساب</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="settings-form">
        <div className="settings-grid">
          {/* العمود الأول: تفاصيل الهوية والمالية */}
          <div className="settings-col">
            <Card title="بيانات الهوية والاتصال">
              <div className="form-group">
                <label className="form-label">اسم المغسلة (العلامة التجارية)</label>
                <input
                  type="text"
                  name="laundryName"
                  className="form-input"
                  value={formData.laundryName}
                  onChange={handleChange}
                  required
                  placeholder="مثال: مغسلة النظافة الذكية"
                />
              </div>

              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label className="form-label">رقم الهاتف</label>
                  <input
                    type="text"
                    name="laundryPhone"
                    className="form-input"
                    value={formData.laundryPhone}
                    onChange={handleChange}
                    required
                    placeholder="مثال: 0501234567"
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">العملة الافتراضية</label>
                  <input
                    type="text"
                    name="currency"
                    className="form-input"
                    value={formData.currency}
                    onChange={handleChange}
                    required
                    placeholder="مثال: ر.س، د.إ، ج.م"
                  />
                </div>
              </div>
              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label className="form-label">كود الدولة (للواتساب)</label>
                  <input
                    type="text"
                    name="defaultCountryCode"
                    className="form-input"
                    value={formData.defaultCountryCode}
                    onChange={handleChange}
                    required
                    placeholder="مثال: 966، 20، 971"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">العنوان الجغرافي</label>
                <input
                  type="text"
                  name="laundryAddress"
                  className="form-input"
                  value={formData.laundryAddress}
                  onChange={handleChange}
                  placeholder="مثال: الرياض، حي السليمانية / القاهرة، المعادي"
                />
              </div>
            </Card>

            <Card title="الضريبة والفوترة (الإعدادات المالية)" className="mt-md">
              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label className="form-label">نسبة ضريبة القيمة المضافة (%)</label>
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
                  <label className="form-label">الرقم الضريبي للمنشأة</label>
                  <input
                    type="text"
                    name="taxNumber"
                    className="form-input"
                    value={formData.taxNumber}
                    onChange={handleChange}
                    placeholder="مثال: 300012345600003"
                  />
                </div>
              </div>
              <p className="settings-tip">
                * الرقم الضريبي ونسبة الضريبة يظهران تلقائياً في الفاتورة المطبوعة للعملاء تماشياً مع متطلبات الجهات الضريبية المحلية.
              </p>
            </Card>
          </div>

          {/* العمود الثاني: قالب الواتساب ومفاتيح المساعدة */}
          <div className="settings-col">
            <Card title="قالب رسائل الواتساب تلقائية الإرسال">
              <div className="form-group">
                <label className="form-label">محتوى رسالة التأكيد والمشاركة</label>
                <textarea
                  name="whatsappTemplate"
                  className="form-textarea whatsapp-template-input"
                  value={formData.whatsappTemplate}
                  onChange={handleChange}
                  rows={10}
                  required
                  placeholder="اكتب قالب الرسالة هنا..."
                />
              </div>

              <div className="template-placeholders-box">
                <span className="placeholders-title">مفاتيح الاستبدال المتاحة للاستخدام:</span>
                <ul className="placeholders-list">
                  <li><code>{`{customer_name}`}</code> - اسم العميل</li>
                  <li><code>{`{order_id}`}</code> - رقم الفاتورة</li>
                  <li><code>{`{items_count}`}</code> - عدد الملابس والقطع</li>
                  <li><code>{`{total_amount}`}</code> - إجمالي المبلغ المستحق</li>
                  <li><code>{`{remaining_amount}`}</code> - المبلغ المتبقي عند التسليم</li>
                  <li><code>{`{currency}`}</code> - العملة الافتراضية</li>
                  <li><code>{`{delivery_date}`}</code> - موعد الاستلام المتوقع</li>
                  <li><code>{`{tracking_link}`}</code> - رابط تعقب حالة الغسيل</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>

        <div className="settings-actions mt-lg">
          <Button type="submit" variant="primary">
            <Save size={18} style={{ marginLeft: '8px' }} />
            حفظ إعدادات النظام
          </Button>
          <Button type="button" variant="secondary" onClick={handleRestoreDefaults}>
            <RefreshCw size={16} style={{ marginLeft: '6px' }} />
            استعادة الافتراضيات
          </Button>
        </div>
      </form>
    </div>
  );
}
