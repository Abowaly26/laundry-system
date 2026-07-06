import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useSettings } from '../../context/SettingsContext';

export default function PrintInvoice({ order }) {
  const { settings } = useSettings();
  if (!order) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strTime = `${hours}:${minutes} ${ampm}`;
    return `${yyyy}/${mm}/${dd} - ${strTime}`;
  };

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

  const formatAmount = (amount) => (parseFloat(amount) || 0).toFixed(2);

  const getServiceName = (item) => (
    item.service_name_ar || item.service_name || (item.service && item.service.name_ar) || ''
  );

  const getPaymentMethodAr = (method) => {
    const mapping = {
      cash: 'نقدي (كاش)',
      electronic: 'إلكتروني (مدى/شبكة)'
    };
    return mapping[method] || method || '';
  };

  return (
    <div className="print-receipt print-receipt-80" style={{ direction: 'rtl', fontFamily: 'Cairo, sans-serif', padding: '4px' }}>
      {/* Header section */}
      <div className="receipt-header" style={{ textAlign: 'center', marginBottom: '12px' }}>
        <h1 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '900', color: '#000' }}>{settings.laundryName}</h1>
        {settings.laundryAddress && <p style={{ margin: '0 0 3px 0', fontSize: '11px', color: '#333' }}>{settings.laundryAddress}</p>}
        <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#333' }}>هاتف: {settings.laundryPhone}</p>
        {settings.taxNumber && (
          <div style={{ marginTop: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', border: '1px solid #000', padding: '3px 8px', borderRadius: '3px', display: 'inline-block' }}>
              الرقم الضريبي: {settings.taxNumber}
            </span>
          </div>
        )}
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

      {/* Metadata section */}
      <div style={{ paddingBottom: '4px', fontSize: '12px', lineHeight: '1.6' }}>
        <div className="receipt-row">
          <strong style={{ color: '#444' }}>رقم الطلب:</strong> 
          <span style={{ fontWeight: 'bold' }}>#{order.id}</span>
        </div>
        <div className="receipt-row">
          <strong style={{ color: '#444' }}>التاريخ:</strong> 
          <span>{formatDate(order.created_at || new Date())}</span>
        </div>
        {order.expected_delivery_at && (
          <div className="receipt-row">
            <strong style={{ color: '#444' }}>التسليم المتوقع:</strong> 
            <span>{formatDate(order.expected_delivery_at)}</span>
          </div>
        )}
        <div className="receipt-row">
          <strong style={{ color: '#444' }}>العميل:</strong> 
          <span style={{ fontWeight: 'bold' }}>{order.customer_name || (order.customer && order.customer.name) || 'عميل عام'}</span>
        </div>
        {(order.customer_phone || (order.customer && order.customer.phone)) && (
          <div className="receipt-row">
            <strong style={{ color: '#444' }}>الجوال:</strong> 
            <span style={{ direction: 'ltr' }}>{order.customer_phone || (order.customer && order.customer.phone)}</span>
          </div>
        )}
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

      {/* Items List (POS Style) */}
      <div style={{ padding: '4px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid #000', marginBottom: '8px' }}>
          <span>الصنف والخدمة</span>
          <span>السعر</span>
        </div>
        
        {order.items && order.items.map((item, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px', borderBottom: '1px dotted #eee' }}>
            <div style={{ paddingLeft: '8px' }}>
              <span style={{ fontWeight: 'bold' }}>{getItemTypeAr(item.item_type)}{item.size_name ? ` (${item.size_name})` : ''}</span>
              <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                {getServiceName(item)}
                {item.notes && <span style={{ color: '#ff0000', marginRight: '4px' }}>({item.notes})</span>}
              </div>
            </div>
            <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', alignSelf: 'center' }}>
              {formatAmount(item.price)} {settings.currency}
            </div>
          </div>
        ))}
      </div>

      {/* Totals Section */}
      <div style={{ paddingTop: '8px', fontSize: '12px' }}>
        {settings.vatPercent > 0 && (
          <>
            <div className="receipt-row" style={{ fontSize: '11px', color: '#444' }}>
              <span>الإجمالي الخاضع للضريبة:</span>
              <span>{formatAmount(order.total_amount / (1 + settings.vatPercent / 100))} {settings.currency}</span>
            </div>
            <div className="receipt-row" style={{ fontSize: '11px', color: '#444', marginBottom: '4px' }}>
              <span>ضريبة القيمة المضافة ({settings.vatPercent}%):</span>
              <span>{formatAmount(order.total_amount - (order.total_amount / (1 + settings.vatPercent / 100)))} {settings.currency}</span>
            </div>
          </>
        )}
        
        <div className="receipt-total receipt-row" style={{ fontSize: '15px', fontWeight: '950', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 0', margin: '6px 0' }}>
          <span>الإجمالي شامل الضريبة:</span>
          <span>{formatAmount(order.total_amount)} {settings.currency}</span>
        </div>
        
        <div className="receipt-row" style={{ color: '#444' }}>
          <span>المدفوع:</span>
          <span>{formatAmount(order.paid_amount)} {settings.currency}</span>
        </div>
        <div className="receipt-row" style={{ fontWeight: 'bold', fontSize: '13px' }}>
          <span>المتبقي:</span>
          <span>{formatAmount(order.remaining_amount)} {settings.currency}</span>
        </div>
        
        {order.payment_method && (
          <div className="receipt-row" style={{ marginTop: '4px', fontSize: '11px', color: '#555' }}>
            <span>طريقة الدفع:</span>
            <span>{getPaymentMethodAr(order.payment_method)}</span>
          </div>
        )}
        {order.notes && (
          <div style={{ padding: '6px 0', fontSize: '11px', borderTop: '1px dotted #ccc', marginTop: '6px', color: '#444' }}>
            <strong>ملاحظات:</strong> {order.notes}
          </div>
        )}
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '12px 0' }} />

      {/* Footer and QR Code */}
      <div style={{ textAlign: 'center', fontSize: '12px' }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '13px' }}>شكراً لزيارتكم!</p>
        <p style={{ margin: '0', color: '#333' }}>يرجى الاحتفاظ بالإيصال لاستلام الملابس</p>
      </div>

      <div style={{ textAlign: 'center', marginTop: '15px' }}>
        <div style={{ display: 'inline-block', padding: '6px', background: '#fff', border: '1px solid #eee', borderRadius: '4px' }}>
          <QRCodeCanvas 
            value={`ORDER-${order.id}`} 
            size={90}
            level="M"
          />
        </div>
        <p style={{ margin: '4px 0 0', fontSize: '10px', fontWeight: 'bold', color: '#444' }}>كود تتبع الطلب سريع الكاشير</p>
      </div>
    </div>
  );
}
