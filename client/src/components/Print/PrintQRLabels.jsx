import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useTranslation } from 'react-i18next';

export default function PrintQRLabels({ items, orderId }) {
  const { t, i18n } = useTranslation();
  if (!items || items.length === 0) return null;

  const getItemTypeAr = (type) => {
    const mapping = {
      shirt: t('items.typeShirt') || 'قميص / تيشرت',
      pants: t('items.typePants') || 'بنطلون / جينز',
      thobe: t('items.typeThobe') || 'ثوب',
      dress: t('items.typeDress') || 'فستان',
      suit: t('items.typeSuit') || 'بدلة كاملة',
      jacket: t('items.typeJacket') || 'جاكيت / معطف',
      blanket: t('items.typeBlanket') || 'بطانية',
      carpet: t('items.typeCarpet') || 'سجادة',
      other: t('items.typeOther') || 'أخرى'
    };
    return mapping[type] || type;
  };

  return (
    <div className="print-labels-container" style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>
      {items.map((item, index) => {
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
              fontFamily: i18n.language === 'ar' ? 'Cairo, sans-serif' : 'Inter, sans-serif'
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <QRCodeCanvas 
                value={item.qr_code || `ITEM-${item.id}`} 
                size={85} // pixels
                level="M"
              />
            </div>
            <div className="label-info" style={{ fontSize: '9px', lineHeight: '1.3', flexGrow: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '11px', borderBottom: '1px solid #000' }}>#{orderId}</div>
              <div><strong>{t('print.code') || 'كود:'}</strong> {item.qr_code}</div>
              <div><strong>{t('print.type') || 'النوع:'}</strong> {getItemTypeAr(item.item_type)}{item.size_name ? ` (${item.size_name})` : ''}</div>
              <div><strong>{t('print.service') || 'الخدمة:'}</strong> {item.service_name_ar || item.service_name || (item.service && item.service.name_ar) || ''}</div>
              {item.notes && <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#555' }}>{item.notes}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
