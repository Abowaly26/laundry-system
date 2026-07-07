import { useEffect, useId, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeScanType } from 'html5-qrcode';
import { ImageIcon } from 'lucide-react';

export default function QRScanner({ onScanSuccess, onScanFailure }) {
  const scannerRef = useRef(null);
  const readerId = useId().replace(/:/g, '');
  const imageReaderId = `${readerId}-image-reader`;
  const uploadId = `${readerId}-image-upload`;

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      readerId,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: false,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
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
  }, [onScanSuccess, onScanFailure, readerId]);

  // تخصيص نصوص مكتبة السكانر وإخفاء العناصر غير المستخدمة في الواجهة.
  useEffect(() => {
    const patch = () => {
      document.querySelectorAll(`#${readerId} *`).forEach(el => {
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

      document.querySelectorAll(`#${readerId} a, #${readerId}__dashboard_section_swaplink`).forEach(el => {
        el.style.display = 'none';
      });
    };

    const interval = setInterval(patch, 200);
    return () => clearInterval(interval);
  }, [readerId]);

  // فتح ملف صورة وقراءة QR منه
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const html5Qrcode = new Html5Qrcode(imageReaderId);
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
    <div className="qr-scanner-shell">
      <div id={readerId} className="qr-reader"></div>

      <div id={imageReaderId} style={{ display: 'none' }}></div>

      <label
        htmlFor={uploadId}
        className="qr-image-upload-btn"
      >
        <ImageIcon size={16} />
        رفع صورة تحتوي على QR
      </label>
      <input
        id={uploadId}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
    </div>
  );
}
