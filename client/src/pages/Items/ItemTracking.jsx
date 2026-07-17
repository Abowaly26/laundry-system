import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Scan, Keyboard, Search, CheckCircle2, ArrowRight } from 'lucide-react';
import { itemsAPI, ordersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import QRScanner from '../../components/QR/QRScanner';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import StatusBadge from '../../components/UI/StatusBadge';
import './ItemTracking.css';

const STATUS_STEPS = [
  { key: 'pending', label: 'قيد الانتظار' },
  { key: 'processing', label: 'قيد التنفيذ' },
  { key: 'ready', label: 'جاهز للاستلام' },
  { key: 'delivered', label: 'تم التسليم' }
];

export default function ItemTracking() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [scanMode, setScanMode] = useState('camera'); // 'camera' or 'manual'
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [scannedOrder, setScannedOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close dropdowns if clicked outside
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenStatusDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // معالجة البحث عن الكود (سواء من الكاميرا أو كتابة يدوية)
  const handleItemScan = async (code) => {
    if (!code) return;
    const trimmedCode = code.trim().toUpperCase();

    // التحقق مما إذا كان الكود هو كود طلب (يبدأ بـ ORD- أو #)
    if (trimmedCode.startsWith('ORD-') || (trimmedCode.startsWith('#') && !isNaN(trimmedCode.replace('#', '')))) {
      const orderId = trimmedCode.replace(/[^0-9]/g, '');
      if (orderId) {
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
          const res = await ordersAPI.getById(orderId);
          if (res.success) {
            setScannedOrder(res.data);
            setCurrentItem(null); // مسح تفاصيل القطعة المفردة
            setSuccessMsg(t('tracking.orderLoadedSuccess', { id: orderId }) || `تم تحميل طلب العميل #${orderId} بنجاح!`);
          } else {
            setErrorMsg(t('tracking.orderNotFound') || 'الطلب غير موجود أو كود غير صالح');
            setScannedOrder(null);
          }
        } catch (err) {
          setErrorMsg(err.message || t('tracking.loadOrderError') || 'خطأ أثناء تحميل تفاصيل الطلب');
          setScannedOrder(null);
        } finally {
          setLoading(false);
        }
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await itemsAPI.scanQR(trimmedCode);
      if (res.success) {
        setCurrentItem(res.data);
        setScannedOrder(null); // مسح تفاصيل الطلب المفرد
      } else {
        setErrorMsg(t('tracking.itemNotFound') || 'القطعة غير موجودة أو كود غير صالح');
        setCurrentItem(null);
      }
    } catch (err) {
      setErrorMsg(err.message || t('tracking.searchError') || 'خطأ أثناء البحث عن القطعة');
      setCurrentItem(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleItemScan(manualCode.trim());
  };

  // تحديث حالة قطعة فردية إلى حالة معينة
  const handleUpdateItemStatus = async (itemId, newStatus) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await itemsAPI.updateStatus(itemId, newStatus);
      if (res.success) {
        showToast(t('tracking.statusUpdateSuccess') || 'تم تحديث حالة القطعة بنجاح', 'success');
        
        // تحديث القطعة المعروضة محلياً إذا كانت هي المفتوحة
        if (currentItem && currentItem.id === itemId) {
          const itemRes = await itemsAPI.scanQR(currentItem.qr_code);
          if (itemRes.success) {
            setCurrentItem(itemRes.data);
          } else {
            setCurrentItem(res.data);
          }
        }
        
        // تحديث الطلب المعروض لإظهار الحالة الجديدة في القائمة
        if (scannedOrder) {
          const orderRes = await ordersAPI.getById(scannedOrder.id);
          if (orderRes.success) {
            setScannedOrder(orderRes.data);
          }
        }
      } else {
        showToast(res.message || t('tracking.statusUpdateFail') || 'فشل في تحديث حالة القطعة', 'error');
      }
    } catch (err) {
      showToast(err.message || t('tracking.updateError') || 'خطأ أثناء تحديث حالة القطعة', 'error');
    } finally {
      setLoading(false);
      setOpenStatusDropdownId(null);
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
    const nextKey = STATUS_STEPS[currentIdx + 1].key;
    return t(`status.${nextKey}`) || STATUS_STEPS[currentIdx + 1].label;
  };

  return (
    <div className="page item-tracking-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('tracking.title') || 'تتبع القطع'}</h1>
          <p className="page-subtitle">{t('tracking.subtitle') || 'امسح رمز الـ QR أو أدخل كود القطعة يدوياً لتحديث حالتها التشغيلية فوراً'}</p>
        </div>
      </div>

      <div className={`tracking-grid ${(!currentItem && !scannedOrder) ? 'single-column' : ''}`}>
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
                {t('tracking.scanCamera') || 'مسح بالكاميرا'}
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
                {t('tracking.manualEntry') || 'إدخال يدوي'}
              </button>
            </div>

            {scanMode === 'camera' ? (
              <div className="camera-scanner-wrapper">
                <QRScanner 
                  onScanSuccess={(decodedText, source) => {
                    if (!loading && (!currentItem || currentItem.qr_code !== decodedText)) {
                      if (source === 'file') {
                        showToast('تم قراءة الرمز من الصورة بنجاح! جاري تحميل البيانات...', 'success');
                      } else {
                        showToast('تم قراءة الرمز بنجاح! جاري تحميل البيانات...', 'success');
                      }
                      handleItemScan(decodedText);
                    }
                  }}
                  onScanFailure={() => {
                    showToast('لم يتم العثور على رمز QR في الصورة المحددة. يرجى المحاولة بصورة أوضح.', 'error');
                  }}
                />
                <p className="scanner-instruction text-secondary mt-sm">
                  {t('tracking.cameraInstruction') || 'وجه الكاميرا نحو رمز الـ QR الخاص بالقطعة'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleManualSearch} className="manual-scan-form">
                <div className="form-group">
                  <label className="form-label">{t('tracking.itemCodeLabel') || 'كود القطعة'}</label>
                  <div className="manual-input-row">
                    <input
                      type="text"
                      className="form-input"
                      placeholder={t('tracking.itemCodePlaceholder') || 'أدخل الكود هنا... (مثال: SHIRT-0001)'}
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

        {/* العمود الأيسر: تفاصيل القطعة/الطلب التي تم مسحها وتحديث الحالة */}
        {(currentItem || scannedOrder) && (
          <div className="item-details-container">
            {currentItem ? (
              <Card title={t('tracking.itemDetails', { code: currentItem.qr_code }) || `تفاصيل القطعة: ${currentItem.qr_code}`}>
                {scannedOrder && (
                  <button
                    type="button"
                    onClick={() => setCurrentItem(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      marginBottom: '14px',
                      padding: '0'
                    }}
                  >
                    <ArrowRight size={16} style={{ marginLeft: '4px' }} />
                    {t('tracking.backToOrder', { id: String(scannedOrder.id).padStart(4, '0') }) || `الرجوع لتفاصيل الطلب (ORD-${String(scannedOrder.id).padStart(4, '0')})`}
                  </button>
                )}
                <div className="item-meta-info">
                  <div className="info-row">
                    <span>{t('tracking.itemType') || 'نوع القطعة:'}</span>
                    <strong>{getItemTypeAr(currentItem.item_type)}{currentItem.size_name ? ` (${currentItem.size_name})` : ''}</strong>
                  </div>
                  <div className="info-row">
                    <span>{t('tracking.service') || 'الخدمة المطلوبة:'}</span>
                    <strong>{currentItem.service_name_ar || currentItem.service?.name_ar}</strong>
                  </div>
                  <div className="info-row">
                    <span>{t('tracking.orderNum') || 'رقم الطلب التابع له:'}</span>
                    <strong>#{currentItem.order_id}</strong>
                  </div>
                  {currentItem.notes && (
                    <div className="info-row note-row">
                      <span>{t('tracking.notes') || 'ملاحظات القطعة:'}</span>
                      <span className="note-text">{currentItem.notes}</span>
                    </div>
                  )}
                </div>

                {/* سجل تتبع الحالات */}
                {currentItem.status_log && currentItem.status_log.length > 0 && (
                  <div className="status-log-timeline mt-md mb-md">
                    <h4 className="timeline-title mb-sm">{t('tracking.statusLog') || 'سجل حركة العمليات:'}</h4>
                    <div className="timeline-items">
                      {currentItem.status_log.map((log, index) => (
                        <div className="timeline-item" key={log.id || index}>
                          <div className="timeline-dot"></div>
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <span className="timeline-status font-bold">
                                {t(`status.${log.new_status}`) || STATUS_STEPS.find(s => s.key === log.new_status)?.label || log.new_status}
                              </span>
                              <span className="timeline-time text-secondary">
                                {new Date(log.created_at).toLocaleString(i18n.language === 'en' ? 'en-US' : 'ar-EG', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </span>
                            </div>
                            {log.updated_by_name && (
                              <span className="timeline-worker text-secondary">
                                {t('tracking.by') || 'بواسطة:'} {log.updated_by_name === 'صاحب المغسلة (المدير)' ? (t('roles.admin') || 'Laundry Owner (Admin)') : log.updated_by_name}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* تحديث الحالة عن طريق قائمة اختيار منسدلة */}
                <div className="status-update-section mt-lg mb-md" ref={dropdownRef}>
                  <label className="form-label" style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    تحديث حالة القطعة الحالية:
                  </label>
                  <div className="table-select-container" style={{ width: '100%', position: 'relative' }}>
                    <button
                      type="button"
                      className="table-select-trigger"
                      style={{ height: '42px', fontSize: '0.9rem', width: '100%', padding: '0 16px', background: 'var(--bg-body)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onClick={() => setOpenStatusDropdownId(openStatusDropdownId === currentItem.id ? null : currentItem.id)}
                    >
                      <span>{STATUS_STEPS.find(opt => opt.key === currentItem.status)?.label || 'تحديث الحالة...'}</span>
                    </button>
                    {openStatusDropdownId === currentItem.id && (
                      <div className="table-select-dropdown" style={{ right: 0, left: 0, minWidth: '100%', zIndex: 900 }}>
                        {STATUS_STEPS.map((opt) => {
                          const isDisabled = opt.key === 'delivered' && scannedOrder && parseFloat(scannedOrder.remaining_amount) > 0;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              className={`table-select-item ${currentItem.status === opt.key ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                              onClick={() => !isDisabled && handleUpdateItemStatus(currentItem.id, opt.key)}
                              disabled={isDisabled}
                              style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed', color: 'var(--text-muted)' } : {}}
                              title={isDisabled ? 'لا يمكن تسليم القطعة قبل سداد المبلغ المتبقي' : ''}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>


              </Card>
            ) : (
              <Card title={t('tracking.orderDetails', { id: String(scannedOrder.id).padStart(4, '0') }) || `تفاصيل الطلب: ORD-${String(scannedOrder.id).padStart(4, '0')}`}>
                <div className="item-meta-info" style={{ marginBottom: '15px' }}>
                  <div className="info-row">
                    <span>{t('tracking.customer') || 'العميل:'}</span>
                    <strong>{scannedOrder.customer_name || t('orders.generalCustomer') || 'عميل عام'} ({scannedOrder.customer_phone || '-'})</strong>
                  </div>
                  <div className="info-row">
                    <span>{t('tracking.totalAmount') || 'إجمالي المبلغ:'}</span>
                    <strong>{parseFloat(scannedOrder.total_amount || 0).toFixed(2)} ر.س</strong>
                  </div>
                  <div className="info-row">
                    <span>{t('tracking.remaining') || 'المتبقي:'}</span>
                    <strong style={{ color: parseFloat(scannedOrder.remaining_amount) > 0 ? '#ef4444' : '#10b981' }}>
                      {parseFloat(scannedOrder.remaining_amount || 0).toFixed(2)} ر.س
                    </strong>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#475569', marginBottom: '12px' }}>
                  {t('tracking.orderItems') || 'قطع الملابس داخل الطلب:'}
                </h4>

                <div className="scanned-order-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {scannedOrder.items?.map((item) => {
                    const isDeliveredBlock = parseFloat(scannedOrder.remaining_amount) > 0;
                    
                    return (
                      <div 
                        key={item.id} 
                        className="order-item-row" 
                        onClick={() => handleItemScan(item.qr_code)}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '12px 14px', 
                          background: '#f8fafc',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                        title={t('tracking.statusLog') || "انقر لعرض سجل حركة القطعة ومراحل العمل"}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{item.qr_code}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {getItemTypeAr(item.item_type)} - {item.service_name_ar || item.service?.name_ar}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
                          <StatusBadge status={item.status} type="item" />
                          
                          <div className="table-select-container" style={{ position: 'relative' }}>
                            <button
                              type="button"
                              className="table-select-trigger"
                              style={{ height: '32px', fontSize: '0.8rem', padding: '4px 12px', minWidth: '110px', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenStatusDropdownId(openStatusDropdownId === item.id ? null : item.id);
                              }}
                            >
                              <span>{STATUS_STEPS.find(opt => opt.key === item.status)?.label || 'تحديث...'}</span>
                            </button>
                            {openStatusDropdownId === item.id && (
                              <div className="table-select-dropdown" style={{ right: 0, left: 'auto', minWidth: '130px', zIndex: 900 }}>
                                {STATUS_STEPS.map((opt) => {
                                  const isDisabled = opt.key === 'delivered' && isDeliveredBlock;
                                  return (
                                    <button
                                      key={opt.key}
                                      type="button"
                                      className={`table-select-item ${item.status === opt.key ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isDisabled) handleUpdateItemStatus(item.id, opt.key);
                                      }}
                                      disabled={isDisabled}
                                      style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed', color: 'var(--text-muted)' } : {}}
                                      title={isDisabled ? 'لا يمكن تسليم القطعة قبل سداد المبلغ المتبقي' : ''}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
