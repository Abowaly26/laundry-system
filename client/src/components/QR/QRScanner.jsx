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
      // ترجمة الأزرار
      const buttons = document.querySelectorAll('#qr-reader button');
      buttons.forEach(btn => {
        const text = btn.innerText;
        if (text.includes('Request Camera') || text.includes('permission') || text.includes('Permission')) {
          btn.innerText = 'السماح بالوصول للكاميرا';
          btn.style.fontFamily = "'Cairo', sans-serif";
        } else if (text.includes('Start Scanning') || text.includes('Start')) {
          btn.innerText = 'بدء المسح';
          btn.style.fontFamily = "'Cairo', sans-serif";
        } else if (text.includes('Stop Scanning') || text.includes('Stop')) {
          btn.innerText = 'إيقاف المسح';
          btn.style.fontFamily = "'Cairo', sans-serif";
        }
      });

      // ترجمة الروابط
      const links = document.querySelectorAll('#qr-reader a');
      links.forEach(link => {
        const text = link.innerText;
        if (text.includes('Scan an Image') || text.includes('Image File') || text.includes('file')) {
          link.innerText = 'مسح من ملف صورة';
          link.style.fontFamily = "'Cairo', sans-serif";
        } else if (text.includes('Use camera') || text.includes('camera directly')) {
          link.innerText = 'استخدام الكاميرا مباشرة';
          link.style.fontFamily = "'Cairo', sans-serif";
        }
      });

      // ترجمة خيارات قائمة اختيار الكاميرا
      const options = document.querySelectorAll('#qr-reader select option');
      options.forEach(opt => {
        if (opt.value === '' && (opt.innerText.includes('Choose') || opt.innerText.includes('Select'))) {
          opt.innerText = 'اختر الكاميرا';
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
