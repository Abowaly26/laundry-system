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
    // ترجمة نصوص مكتبة html5-qrcode إلى العربية بشكل ديناميكي
    const translateScanner = () => {
      const permissionBtn = document.getElementById('qr-reader__camera_permission_button');
      if (permissionBtn && permissionBtn.innerText !== 'السماح بالوصول للكاميرا') {
        permissionBtn.innerText = 'السماح بالوصول للكاميرا';
        permissionBtn.style.fontFamily = "'Cairo', sans-serif";
      }

      const swapLink = document.getElementById('qr-reader__dashboard_section_swaplink');
      if (swapLink && swapLink.innerText !== 'مسح من ملف صورة') {
        swapLink.innerText = 'مسح من ملف صورة';
        swapLink.style.fontFamily = "'Cairo', sans-serif";
      }

      const chooseCameraLabel = document.querySelector('#qr-reader__camera_selection option[value=""]');
      if (chooseCameraLabel && chooseCameraLabel.innerText !== 'اختر الكاميرا') {
        chooseCameraLabel.innerText = 'اختر الكاميرا';
      }
      
      const scanRegion = document.getElementById('qr-reader__dashboard_section');
      if (scanRegion) {
        const buttons = scanRegion.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.innerText.includes('Start Scanning')) {
            btn.innerText = 'بدء المسح';
          } else if (btn.innerText.includes('Stop Scanning')) {
            btn.innerText = 'إيقاف المسح';
          }
        });
      }
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
