import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, SwitchCamera, ImageIcon, AlertCircle } from 'lucide-react';
import Button from '../UI/Button';

export default function QRScanner({ onScanSuccess, onScanFailure }) {
  const { t } = useTranslation();
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSecure, setIsSecure] = useState(true);
  
  const scannerRef = useRef(null);
  const readerId = "qr-reader-custom";
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (window.isSecureContext === false) {
      setIsSecure(false);
      setErrorMsg(t('qr.insecureContext') || 'المتصفح يمنع الكاميرا لأن الاتصال غير آمن. يجب استخدام HTTPS.');
    }

    scannerRef.current = new Html5Qrcode(readerId);
    
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanning = async (cameraId = null) => {
    if (!isSecure) return;
    setErrorMsg('');
    
    try {
      let selectedCameraId = cameraId;
      
      if (!cameras.length) {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          
          if (!selectedCameraId) {
            const backCamera = devices.find(
              d => d.label.toLowerCase().includes('back') || 
                   d.label.toLowerCase().includes('environment') ||
                   d.label.toLowerCase().includes('خلفية')
            );
            selectedCameraId = backCamera ? backCamera.id : devices[0].id;
          }
        } else {
          throw new Error(t('qr.noCameraFound') || 'لم يتم العثور على أي كاميرا في جهازك.');
        }
      } else if (!selectedCameraId) {
        selectedCameraId = cameras[0].id;
      }

      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      
      await scannerRef.current.start(
        selectedCameraId,
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          if (onScanSuccess) onScanSuccess(decodedText, 'camera');
        },
        (errorMessage) => {}
      );
      
      setIsScanning(true);
      setActiveCameraId(selectedCameraId);
      
    } catch (err) {
      console.error("Camera start error:", err);
      setIsScanning(false);
      
      const errMsg = err?.message || err?.name || '';
      if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
        setErrorMsg(t('qr.permissionDenied') || 'رفض المتصفح الوصول للكاميرا. يرجى منح الصلاحية من إعدادات المتصفح وإعادة المحاولة.');
      } else if (errMsg.includes('NotFoundError') || errMsg.includes('Requested device not found')) {
        setErrorMsg(t('qr.cameraNotFound') || 'لم يتم العثور على الكاميرا المحددة في جهازك.');
      } else if (errMsg.includes('NotSupportedError') || errMsg.includes('HTTPS')) {
        setErrorMsg(t('qr.notSupportedHTTPS') || 'المتصفح لا يدعم تشغيل الكاميرا هنا أو يتطلب HTTPS.');
      } else {
        setErrorMsg((t('qr.cameraStartFail') || 'فشل تشغيل الكاميرا: ') + errMsg);
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  const switchCamera = async () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    await startScanning(cameras[nextIndex].id);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await stopScanning();
      }
      
      const decodedText = await scannerRef.current.scanFile(file, true);
      if (onScanSuccess) onScanSuccess(decodedText, 'file');
    } catch (err) {
      console.error("File scan error", err);
      setErrorMsg(t('qr.fileScanError') || 'لم يتم التعرف على رمز QR في هذه الصورة. يرجى التأكد من وضوح الصورة والرمز.');
      if (onScanFailure) onScanFailure(err);
    }
    
    e.target.value = '';
  };

  return (
    <div className="qr-custom-shell">
      <div className={`qr-viewport-container ${isScanning ? 'scanning' : ''}`}>
        <div id={readerId} className="qr-reader-viewport"></div>
        
        {isScanning && (
          <div className="qr-scan-hint-overlay" style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '30px',
            fontSize: '0.9rem',
            zIndex: 10,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}>
            <span style={{ 
              display: 'inline-block', 
              width: '8px', 
              height: '8px', 
              background: '#22c55e', 
              borderRadius: '50%',
              boxShadow: '0 0 8px #22c55e',
              animation: 'pulse 2s infinite'
            }}></span>
            {t('qr.pointBarcode') || 'قم بتوجيه الباركود داخل الإطار'}
          </div>
        )}

        {!isScanning && (
          <div className="qr-placeholder" onClick={() => startScanning()} style={{ cursor: 'pointer', padding: '24px', textAlign: 'center' }}>
            <div style={{ 
              background: 'rgba(79, 70, 229, 0.1)', 
              color: 'var(--primary)',
              width: '72px', 
              height: '72px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <Camera size={36} strokeWidth={1.5} />
            </div>
            <h4 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '1.15rem', fontWeight: '600' }}>{t('qr.smartScanner') || 'الماسح الضوئي الذكي'}</h4>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: '1.6', maxWidth: '240px' }}>
              {t('qr.scannerHint') || 'انقر هنا لفتح الكاميرا والتركيز على الباركود الخاص بالقطعة لتسجيلها فوراً'}
            </p>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="alert-message error" style={{ marginTop: '12px', fontSize: '0.85rem' }}>
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      <div className="qr-controls" style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {!isScanning ? (
          <Button variant="primary" onClick={() => startScanning()} style={{ flex: 1 }}>
            <Camera size={18} /> {t('qr.cameraBtn') || 'الكاميرا'}
          </Button>
        ) : (
          <Button variant="danger" onClick={stopScanning} style={{ flex: 1 }}>
            {t('qr.stopBtn') || 'إيقاف'}
          </Button>
        )}

        {cameras.length > 1 && isScanning && (
          <Button variant="secondary" onClick={switchCamera} style={{ flex: 1 }}>
            <SwitchCamera size={18} /> {t('qr.switchBtn') || 'تبديل'}
          </Button>
        )}

        <Button 
          variant="secondary" 
          onClick={() => fileInputRef.current?.click()}
          style={{ flex: 1 }}
        >
          <ImageIcon size={18} /> {t('qr.galleryBtn') || 'المعرض'}
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
}
