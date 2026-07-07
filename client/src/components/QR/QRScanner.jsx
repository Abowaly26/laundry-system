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

  useEffect(() => {
    // ترجمة نصوص مكتبة html5-qrcode إلى العربية بشكل ديناميكي وقوي
    const translateScanner = () => {
      const allElems = document.querySelectorAll('#qr-reader *');
      allElems.forEach(el => {
        if (el.children.length === 0 && el.innerText) {
          const text = el.innerText.trim();
          if (text === 'Scan an Image File' || text.includes('Scan an Image')) {
            el.innerText = 'مسح من ملف صورة';
            el.style.fontFamily = "'Cairo', sans-serif";
          } else if (text === 'Request Camera Permissions' || text.includes('Request Camera')) {
            el.innerText = 'السماح بالوصول للكاميرا';
            el.style.fontFamily = "'Cairo', sans-serif";
          } else if (text === 'Start Scanning' || text.includes('Start')) {
            el.innerText = 'بدء المسح';
            el.style.fontFamily = "'Cairo', sans-serif";
          } else if (text === 'Stop Scanning' || text.includes('Stop')) {
            el.innerText = 'إيقاف المسح';
            el.style.fontFamily = "'Cairo', sans-serif";
          } else if (text.includes('Choose Camera') || text.includes('Select Camera')) {
            el.innerText = 'اختر الكاميرا';
            el.style.fontFamily = "'Cairo', sans-serif";
          }
        }
      });
    };

    const interval = setInterval(translateScanner, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
      <div id="qr-reader" style={{ border: 'none', borderRadius: '10px', overflow: 'hidden' }}></div>
    </div>
  );
}
