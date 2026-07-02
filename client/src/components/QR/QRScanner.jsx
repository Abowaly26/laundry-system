import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QRScanner({ onScanSuccess, onScanFailure }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    // إعداد الماسح الضوئي بعد تحميل المكون
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        // عند نجاح المسح
        if (onScanSuccess) {
          onScanSuccess(decodedText);
        }
      },
      (error) => {
        // عند حدوث خطأ أو أثناء البحث المستمر
        if (onScanFailure) {
          onScanFailure(error);
        }
      }
    );

    scannerRef.current = scanner;

    // تنظيف الماسح الضوئي عند تفكيك المكون
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => {
          console.error('Failed to clear html5QrcodeScanner', err);
        });
      }
    };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
      <div id="qr-reader" style={{ border: 'none', borderRadius: '10px', overflow: 'hidden' }}></div>
    </div>
  );
}
