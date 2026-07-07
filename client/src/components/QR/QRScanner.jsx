import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { ImageIcon } from 'lucide-react';

export default function QRScanner({ onScanSuccess, onScanFailure }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: false,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        if (onScanSuccess) onScanSuccess(decodedText);
      },
      (error) => {
        if (onScanFailure) onScanFailure(error);
      }
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [onScanSuccess, onScanFailure]);

  // ترجمة نصوص المكتبة ديناميكياً وإخفاء رابط الصورة الافتراضي
  useEffect(() => {
    const patch = () => {
      document.querySelectorAll('#qr-reader *').forEach(el => {
        if (el.children.length === 0 && el.innerText) {
          const t = el.innerText.trim();
          if (t.includes('Request Camera') || t === 'Request Camera Permissions') {
            el.innerText = 'السماح بالوصول للكاميرا';
            el.style.fontFamily = "'Cairo', sans-serif";
          } else if (t === 'Start Scanning') {
            el.innerText = 'بدء المسح';
            el.style.fontFamily = "'Cairo', sans-serif";
          } else if (t === 'Stop Scanning') {
            el.innerText = 'إيقاف المسح';
            el.style.fontFamily = "'Cairo', sans-serif";
          }
        }
      });

      // إخفاء رابط "Scan an Image File" الافتراضي بالكامل
      document.querySelectorAll('#qr-reader a').forEach(a => {
        a.style.display = 'none';
      });
    };

    const interval = setInterval(patch, 200);
    return () => clearInterval(interval);
  }, []);

  // فتح ملف صورة وقراءة QR منه
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const html5Qrcode = new Html5Qrcode('qr-image-reader-hidden');
    html5Qrcode
      .scanFile(file, true)
      .then(decodedText => {
        if (onScanSuccess) onScanSuccess(decodedText);
        html5Qrcode.clear();
      })
      .catch(() => {
        if (onScanFailure) onScanFailure('لم يتم التعرف على رمز QR في الصورة');
        html5Qrcode.clear();
      });

    // إعادة ضبط الـ input لتمكين اختيار نفس الملف مرة أخرى
    e.target.value = '';
  };

  return (
    <div style={{ width: '100%', maxWidth: '520px', margin: '0 auto' }}>
      {/* الماسح الافتراضي للكاميرا */}
      <div id="qr-reader" style={{ border: 'none', borderRadius: '10px', overflow: 'hidden' }}></div>

      {/* عنصر مخفي لقراءة QR من الصورة */}
      <div id="qr-image-reader-hidden" style={{ display: 'none' }}></div>

      {/* زر رفع الصورة المخصص */}
      <label
        htmlFor="qr-image-upload"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '12px',
          padding: '10px 22px',
          background: '#f1f5f9',
          border: '1.5px solid #e2e8f0',
          borderRadius: '10px',
          color: '#475569',
          fontSize: '0.88rem',
          fontWeight: '700',
          fontFamily: "'Cairo', sans-serif",
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          width: '100%',
          boxSizing: 'border-box',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#e8edf3';
          e.currentTarget.style.borderColor = '#cbd5e1';
          e.currentTarget.style.color = '#1e293b';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#f1f5f9';
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.color = '#475569';
        }}
      >
        <ImageIcon size={16} />
        رفع صورة تحتوي على QR
      </label>
      <input
        id="qr-image-upload"
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
    </div>
  );
}
