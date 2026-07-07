import { useState } from 'react';
import { Scan, Keyboard, Search, CheckCircle2, ArrowRight } from 'lucide-react';
import { itemsAPI } from '../../services/api';
import QRScanner from '../../components/QR/QRScanner';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import './ItemTracking.css';

const STATUS_STEPS = [
  { key: 'pending', label: 'قيد الانتظار' },
  { key: 'processing', label: 'قيد التنفيذ' },
  { key: 'ready', label: 'جاهز للاستلام' },
  { key: 'delivered', label: 'تم التسليم' }
];

export default function ItemTracking() {
  const [scanMode, setScanMode] = useState('camera'); // 'camera' or 'manual'
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // معالجة البحث عن الكود (سواء من الكاميرا أو كتابة يدوية)
  const handleItemScan = async (code) => {
    if (!code) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await itemsAPI.scanQR(code);
      if (res.success) {
        setCurrentItem(res.data);
      } else {
        setErrorMsg('القطعة غير موجودة أو كود غير صالح');
        setCurrentItem(null);
      }
    } catch (err) {
      setErrorMsg(err.message || 'خطأ أثناء البحث عن القطعة');
      setCurrentItem(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleItemScan(manualCode.trim().toUpperCase());
  };

  // ترقية حالة القطعة
  const handleAdvanceStatus = async () => {
    if (!currentItem) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await itemsAPI.advanceStatus(currentItem.id);
      if (res.success) {
        // العثور على اسم الحالة الجديدة لعرضها
        const currentIdx = STATUS_STEPS.findIndex(s => s.key === currentItem.status);
        const nextStatus = STATUS_STEPS[currentIdx + 1];
        setSuccessMsg(`تم ترقية الحالة بنجاح إلى: ${nextStatus ? nextStatus.label : 'مكتمل'}`);
        
        // تحديث البيانات المحلية للمكون
        setCurrentItem(res.data);
      } else {
        setErrorMsg(res.message || 'فشل في ترقية الحالة');
      }
    } catch (err) {
      setErrorMsg(err.message || 'خطأ أثناء ترقية الحالة');
    } finally {
      setLoading(false);
    }
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

  const getNextStatusLabel = (status) => {
    const currentIdx = STATUS_STEPS.findIndex(s => s.key === status);
    if (currentIdx === -1 || currentIdx === STATUS_STEPS.length - 1) return null;
    return STATUS_STEPS[currentIdx + 1].label;
  };

  return (
    <div className="page item-tracking-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">تتبع وتحديث حالة القطع</h1>
          <p className="page-subtitle">مسح كود QR لتتبع القطعة وتحديث حالتها التشغيلية</p>
        </div>
      </div>

      <div className="tracking-grid">
        {/* العمود الأيمن: الكاميرا أو الإدخال اليدوي */}
        <div className="scanning-container">
          <Card className="scanner-card">
            <div className="scan-mode-toggle mb-md">
              <button 
                type="button" 
                className={`toggle-btn ${scanMode === 'camera' ? 'active' : ''}`}
                onClick={() => {
                  setScanMode('camera');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
              >
                <Scan size={18} style={{ marginLeft: '6px' }} />
                مسح بالكاميرا
              </button>
              <button 
                type="button" 
                className={`toggle-btn ${scanMode === 'manual' ? 'active' : ''}`}
                onClick={() => {
                  setScanMode('manual');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
              >
                <Keyboard size={18} style={{ marginLeft: '6px' }} />
                إدخال يدوي
              </button>
            </div>

            {scanMode === 'camera' ? (
              <div className="camera-scanner-wrapper">
                <QRScanner 
                  onScanSuccess={(decodedText) => {
                    // الكاميرا قد ترسل قراءات سريعة، نتأكد من عدم تكرار القراءة إذا كانت نفس القطعة
                    if (!loading && (!currentItem || currentItem.qr_code !== decodedText)) {
                      handleItemScan(decodedText);
                    }
                  }}
                />
                <p className="scanner-instruction text-secondary mt-sm">
                  وجه الكاميرا نحو ملصق QR الخاص بالقطعة لمسحها تلقائياً
                </p>
              </div>
            ) : (
              <form onSubmit={handleManualSearch} className="manual-scan-form">
                <div className="form-group">
                  <label className="form-label">أدخل كود القطعة (مثال: SHIRT-0001)</label>
                  <div className="manual-input-row">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="SHIRT-XXXX"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                    />
                    <Button variant="primary" type="submit" disabled={loading}>
                      <Search size={18} />
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {errorMsg && <div className="alert-message error mt-md">{errorMsg}</div>}
            {successMsg && <div className="alert-message success mt-md">{successMsg}</div>}
          </Card>
        </div>

        {/* العمود الأيسر: تفاصيل القطعة التي تم مسحها وتحديث الحالة */}
        <div className="item-details-container">
          {currentItem ? (
            <Card title={`تفاصيل القطعة: ${currentItem.qr_code}`}>
              <div className="item-meta-info">
                <div className="info-row">
                  <span>نوع القطعة:</span>
                  <strong>{getItemTypeAr(currentItem.item_type)}{currentItem.size_name ? ` (${currentItem.size_name})` : ''}</strong>
                </div>
                <div className="info-row">
                  <span>الخدمة المطلوبة:</span>
                  <strong>{currentItem.service_name_ar || currentItem.service?.name_ar}</strong>
                </div>
                <div className="info-row">
                  <span>رقم الطلب التابع له:</span>
                  <strong>#{currentItem.order_id}</strong>
                </div>
                {currentItem.notes && (
                  <div className="info-row note-row">
                    <span>ملاحظات القطعة:</span>
                    <span className="text-warning">{currentItem.notes}</span>
                  </div>
                )}
              </div>

              {/* سجل تتبع الحالات */}
              {currentItem.status_log && currentItem.status_log.length > 0 && (
                <div className="status-log-timeline mt-md mb-md">
                  <h4 className="timeline-title mb-sm">سجل حركة القطعة والعمليات:</h4>
                  <div className="timeline-items">
                    {currentItem.status_log.map((log, index) => (
                      <div className="timeline-item" key={log.id || index}>
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="timeline-status font-bold">
                              {STATUS_STEPS.find(s => s.key === log.new_status)?.label || log.new_status}
                            </span>
                            <span className="timeline-time text-secondary">
                              {new Date(log.created_at).toLocaleString('ar-EG', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                          </div>
                          {log.updated_by_name && (
                            <span className="timeline-worker text-secondary">بواسطة: {log.updated_by_name}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* متتبع المراحل المرئي */}
              <div className="stepper-workflow mt-lg mb-lg">
                {STATUS_STEPS.map((step, idx) => {
                  const currentIdx = STATUS_STEPS.findIndex(s => s.key === currentItem.status);
                  const isCompleted = idx <= currentIdx;
                  const isActive = idx === currentIdx;

                  return (
                    <div 
                      key={step.key} 
                      className={`step-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                    >
                      <div className="step-circle">
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      <span className="step-label">{step.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* أزرار التحديث */}
              {getNextStatusLabel(currentItem.status) ? (
                <div className="action-buttons-wrapper">
                  <Button 
                    variant="primary" 
                    size="large" 
                    className="w-full btn-advance-status"
                    onClick={handleAdvanceStatus}
                    disabled={loading}
                  >
                    <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                    تحديث الحالة إلى: {getNextStatusLabel(currentItem.status)}
                  </Button>
                </div>
              ) : (
                <div className="completion-message text-success text-center">
                  <CheckCircle2 size={32} style={{ marginBottom: '8px' }} />
                  <h3>القطعة مكتملة ومسلمة بالكامل ✓</h3>
                </div>
              )}
            </Card>
          ) : (
            <Card className="flex flex-col justify-center items-center" style={{ minHeight: '300px' }}>
              <div className="empty-scan-state text-center text-secondary">
                <Scan size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <h3>في انتظار مسح قطعة</h3>
                <p>امسح ملصق QR أو أدخل الرمز يدوياً لعرض التفاصيل وتحديث مرحلة الغسيل/الكي</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
