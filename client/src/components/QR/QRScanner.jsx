import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, SwitchCamera, ImageIcon, AlertCircle } from 'lucide-react';
import Button from '../UI/Button';

export default function QRScanner({ onScanSuccess, onScanFailure }) {
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
      setErrorMsg('المتصفح يمنع الكاميرا لأن الاتصال غير آمن. يجب استخدام HTTPS.');
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
          throw new Error('لم يتم العثور على أي كاميرا في جهازك.');
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
          if (onScanSuccess) onScanSuccess(decodedText);
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
        setErrorMsg('رفض المتصفح الوصول للكاميرا. يرجى منح الصلاحية من إعدادات المتصفح وإعادة المحاولة.');
      } else if (errMsg.includes('NotFoundError') || errMsg.includes('Requested device not found')) {
        setErrorMsg('لم يتم العثور على الكاميرا المحددة في جهازك.');
      } else if (errMsg.includes('NotSupportedError') || errMsg.includes('HTTPS')) {
        setErrorMsg('المتصفح لا يدعم تشغيل الكاميرا هنا أو يتطلب HTTPS.');
      } else {
        setErrorMsg(`فشل تشغيل الكاميرا: ${errMsg}`);
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
      if (onScanSuccess) onScanSuccess(decodedText);
    } catch (err) {
      console.error("File scan error", err);
      setErrorMsg('لم يتم التعرف على رمز QR في هذه الصورة. يرجى التأكد من وضوح الصورة والرمز.');
      if (onScanFailure) onScanFailure(err);
    }
    
    e.target.value = '';
  };

  return (
    <div className="qr-custom-shell">
      <div className={`qr-viewport-container ${isScanning ? 'scanning' : ''}`}>
        <div id={readerId} className="qr-reader-viewport"></div>
        
        {!isScanning && (
          <div className="qr-placeholder" onClick={() => startScanning()} style={{ cursor: 'pointer' }}>
            <Camera size={48} className="placeholder-icon" />
            <p>اضغط لتشغيل الكاميرا</p>
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
            <Camera size={18} /> الكاميرا
          </Button>
        ) : (
          <Button variant="danger" onClick={stopScanning} style={{ flex: 1 }}>
            إيقاف
          </Button>
        )}

        {cameras.length > 1 && isScanning && (
          <Button variant="secondary" onClick={switchCamera} style={{ flex: 1 }}>
            <SwitchCamera size={18} /> تبديل
          </Button>
        )}

        <Button 
          variant="secondary" 
          onClick={() => fileInputRef.current?.click()}
          style={{ flex: 1 }}
        >
          <ImageIcon size={18} /> المعرض
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
