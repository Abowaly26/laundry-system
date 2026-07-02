import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export default function PrintQRLabels({ items, orderId }) {
  if (!items || items.length === 0) return null;

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

  return (
    <div className="print-labels-container" style={{ direction: 'rtl' }}>
      {items.map((item, index) => {
        // إنشاء الكود ليكون معرفاً فريداً ومقروءاً بالـ QR
        // البيانات المخزنة بالـ QR
        const qrValue = JSON.stringify({
          id: item.id,
          order_id: orderId,
          qr_code: item.qr_code,
          service: item.service_name_ar || (item.service && item.service.name_ar) || ''
        });

        return (
          <div 
            key={index} 
            className="print-qr-label" 
            style={{ 
              width: '50mm', 
              height: '30mm', 
              display: 'flex', 
              alignItems: 'center', 
              padding: '2mm',
              gap: '6px',
              border: '1px solid #ccc',
              margin: '5px 0',
              pageBreakAfter: 'always',
              fontFamily: 'Cairo, sans-serif'
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <QRCodeCanvas 
                value={item.qr_code || `ITEM-${item.id}`} 
                size={85} // بالبكسل
                level="M"
              />
            </div>
            <div className="label-info" style={{ fontSize: '9px', lineHeight: '1.3', flexGrow: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '11px', borderBottom: '1px solid #000' }}>#{orderId}</div>
              <div><strong>كود:</strong> {item.qr_code}</div>
              <div><strong>النوع:</strong> {getItemTypeAr(item.item_type)}</div>
              <div><strong>الخدمة:</strong> {item.service_name_ar || (item.service && item.service.name_ar) || ''}</div>
              {item.notes && <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#555' }}>{item.notes}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
