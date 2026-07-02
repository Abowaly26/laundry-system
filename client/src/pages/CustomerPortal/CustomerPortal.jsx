import { useState } from 'react';
import { Search, MapPin, Calendar, Clock, RefreshCw, Shirt, ArrowRight } from 'lucide-react';
import { ordersAPI } from '../../services/api';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './CustomerPortal.css';

const ITEM_STATUS_STEPS = [
  { key: 'received', label: 'تم الاستلام' },
  { key: 'washing', label: 'تحت الغسيل' },
  { key: 'drying', label: 'التجفيف' },
  { key: 'ironing', label: 'الكي' },
  { key: 'ready', label: 'جاهز للاستلام' },
  { key: 'delivered', label: 'تم التسليم' }
];

export default function CustomerPortal() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [searched, setSearched] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setOrders([]);
    setSearched(true);

    try {
      // استدعاء الـ API العام المخصص لتتبع العملاء
      const res = await ordersAPI.track(query.trim());
      if (res.success && res.data && res.data.length > 0) {
        setOrders(res.data);
      } else {
        setErrorMsg('لم نجد أي طلب تطابق القيمة المدخلة. يرجى التأكد من رقم الطلب أو رقم الجوال.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getItemTypeAr = (type) => {
    const mapping = {
      shirt: 'قميص / تيشرت',
      pants: 'بنطلون / جينز',
      thobe: 'ثوب',
      dress: 'فستان',
      suit: 'بدلة كاملة',
      jacket: 'جاكيت / معطف',
      blanket: 'بطانية',
      carpet: 'سجادة',
      other: 'أخرى'
    };
    return mapping[type] || type;
  };

  return (
    <div className="customer-portal-container">
      {/* رأس الصفحة */}
      <div className="portal-header text-center">
        <div className="portal-logo-wrapper">
          <Shirt size={32} />
        </div>
        <h1>بوابة العملاء للمغسلة الذكية</h1>
        <p className="text-secondary">تتبع حالة غسيل ملابسك وسجادك لحظة بلحظة</p>
      </div>

      {/* نموذج البحث */}
      <Card className="portal-search-card">
        <form onSubmit={handleTrack}>
          <div className="form-group">
            <label className="form-label text-center">أدخل رقم الطلب أو رقم الجوال الخاص بك</label>
            <div className="portal-search-row">
              <input
                type="text"
                className="form-input text-center"
                placeholder="مثال: رقم الطلب: 12 أو الجوال: 05XXXXXXXX"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                required
              />
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? <RefreshCw size={18} className="spin" /> : <Search size={18} />}
                <span>استعلم الآن</span>
              </Button>
            </div>
          </div>
        </form>

        {errorMsg && <div className="alert-message error text-center mt-md">{errorMsg}</div>}
      </Card>

      {/* نتائج الاستعلام */}
      {loading ? (
        <div className="flex justify-center items-center mt-lg" style={{ height: '150px' }}>
          <LoadingSpinner />
        </div>
      ) : orders.length > 0 ? (
        <div className="portal-results-wrapper mt-lg">
          {orders.map((order) => (
            <Card key={order.id} className="portal-order-result-card mb-md">
              {/* رأس كارت الطلب */}
              <div className="order-result-header flex justify-between items-center flex-wrap gap-sm">
                <div>
                  <h3>طلب رقم #{order.id}</h3>
                  <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
                    تاريخ الطلب: {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-sm">
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>حالة الطلب:</span>
                  <StatusBadge status={order.status} type="order" />
                </div>
              </div>

              {/* تفاصيل التكلفة والمواعيد */}
              <div className="order-result-meta-grid mt-md">
                <div className="meta-box">
                  <span className="lbl">التسليم المتوقع</span>
                  <span className="val">{formatDate(order.expected_delivery_at)}</span>
                </div>
                <div className="meta-box">
                  <span className="lbl">إجمالي التكلفة</span>
                  <span className="val">{parseFloat(order.total_amount).toFixed(2)} ر.س</span>
                </div>
                <div className="meta-box">
                  <span className="lbl">المبلغ المتبقي</span>
                  <span className={`val font-bold ${order.remaining_amount > 0 ? 'text-warning' : 'text-success'}`}>
                    {parseFloat(order.remaining_amount).toFixed(2)} ر.س
                  </span>
                </div>
              </div>

              {/* عناصر الطلب والقطع المشمولة */}
              <div className="order-result-items mt-lg">
                <h4>القطع المشمولة في الطلب ({order.items?.length || 0})</h4>
                <div className="portal-items-list mt-sm">
                  {order.items?.map((item) => (
                    <div key={item.id} className="portal-item-row">
                      <div className="item-info">
                        <span className="item-code">{item.qr_code}</span>
                        <strong className="item-name">{getItemTypeAr(item.item_type)}</strong>
                        <span className="item-service text-secondary">- {item.service_name || 'تنظيف'}</span>
                      </div>
                      
                      {/* عرض حالة القطعة للعميل خطوة بخطوة */}
                      <div className="item-stepper-visual">
                        {ITEM_STATUS_STEPS.map((step, idx) => {
                          const currentIdx = ITEM_STATUS_STEPS.findIndex(s => s.key === item.status);
                          const isCompleted = idx <= currentIdx;
                          const isActive = idx === currentIdx;

                          return (
                            <div 
                              key={step.key} 
                              className={`visual-step ${isCompleted ? 'done' : ''} ${isActive ? 'active' : ''}`}
                              title={step.label}
                            >
                              <div className="visual-circle">
                                {isCompleted ? '✓' : ''}
                              </div>
                              <span className="visual-label">{step.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : searched ? (
        <div className="text-center mt-lg text-secondary">
          <p>لا توجد بيانات متاحة للعرض.</p>
        </div>
      ) : null}
    </div>
  );
}
