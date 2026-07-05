import React from 'react';
import { useSettings } from '../../context/SettingsContext';

export default function PrintInvoice({ order }) {
  const { settings } = useSettings();
  if (!order) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    <div className="print-receipt print-receipt-80" style={{ direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      <div className="receipt-header">
        <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: '900' }}>{settings.laundryName}</h2>
        {settings.laundryAddress && <p style={{ margin: '0 0 3px 0', fontSize: '12px' }}>{settings.laundryAddress}</p>}
        <p style={{ margin: '0 0 3px 0', fontSize: '12px' }}>هاتف: {settings.laundryPhone}</p>
        {settings.taxNumber && <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold' }}>الرقم الضريبي: {settings.taxNumber}</p>}
      </div>

      <div style={{ paddingBottom: '8px', marginBottom: '8px', fontSize: '13px' }}>
        <div className="receipt-row">
          <strong>رقم الطلب:</strong> 
          <span>#{order.id}</span>
        </div>
        <div className="receipt-row">
          <strong>التاريخ:</strong> 
          <span>{formatDate(order.created_at || new Date())}</span>
        </div>
        {order.expected_delivery_at && (
          <div className="receipt-row">
            <strong>التسليم المتوقع:</strong> 
            <span>{formatDate(order.expected_delivery_at)}</span>
          </div>
        )}
        <div className="receipt-row">
          <strong>العميل:</strong> 
          <span>{order.customer_name || (order.customer && order.customer.name) || 'عميل عام'}</span>
        </div>
        {(order.customer_phone || (order.customer && order.customer.phone)) && (
          <div className="receipt-row">
            <strong>الجوال:</strong> 
            <span>{order.customer_phone || (order.customer && order.customer.phone)}</span>
          </div>
        )}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '8px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ textAlign: 'right', padding: '4px 0', width: '40%' }}>الصنف</th>
            <th style={{ textAlign: 'center', padding: '4px 0', width: '30%' }}>الخدمة</th>
            <th style={{ textAlign: 'left', padding: '4px 0', width: '30%' }}>السعر</th>
          </tr>
        </thead>
        <tbody>
          {order.items && order.items.map((item, index) => (
            <tr key={index}>
              <td style={{ padding: '6px 0', fontWeight: 'bold' }}>
                {getItemTypeAr(item.item_type)}
                {item.notes && <span style={{ fontSize: '10px', display: 'block', fontWeight: 'normal' }}>({item.notes})</span>}
              </td>
              <td style={{ padding: '6px 0', textAlign: 'center' }}>{getServiceName(item)}</td>
              <td style={{ padding: '6px 0', textAlign: 'left', fontWeight: 'bold' }}>{formatAmount(item.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', fontSize: '13px' }}>
        {settings.vatPercent > 0 && (
          <>
            <div className="receipt-row" style={{ fontSize: '11px' }}>
              <span>الإجمالي الخاضع للضريبة:</span>
              <span>{formatAmount(order.total_amount / (1 + settings.vatPercent / 100))} {settings.currency}</span>
            </div>
            <div className="receipt-row" style={{ fontSize: '11px' }}>
              <span>قيمة الضريبة المضافة ({settings.vatPercent}%):</span>
              <span>{formatAmount(order.total_amount - (order.total_amount / (1 + settings.vatPercent / 100)))} {settings.currency}</span>
            </div>
          </>
        )}
        
        <div className="receipt-total receipt-row" style={{ fontSize: '16px' }}>
          <span>الإجمالي شامل الضريبة:</span>
          <span>{formatAmount(order.total_amount)} {settings.currency}</span>
        </div>
        
        <div className="receipt-row" style={{ marginTop: '4px' }}>
          <span>المدفوع:</span>
          <span>{formatAmount(order.paid_amount)} {settings.currency}</span>
        </div>
        <div className="receipt-row" style={{ fontWeight: 'bold' }}>
          <span>المتبقي:</span>
          <span>{formatAmount(order.remaining_amount)} {settings.currency}</span>
        </div>
        
        {order.payment_method && (
          <div className="receipt-row" style={{ marginTop: '6px', paddingTop: '6px' }}>
            <span>طريقة الدفع:</span>
            <span>{getPaymentMethodAr(order.payment_method)}</span>
          </div>
        )}
        {order.notes && <div style={{ padding: '6px 0', fontSize: '12px', marginTop: '6px' }}><strong>ملاحظات:</strong> {order.notes}</div>}
      </div>

      <div style={{ textAlign: 'center', marginTop: '25px', fontSize: '12px', paddingTop: '15px' }}>
        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: '14px' }}>شكراً لزيارتكم!</p>
        <p style={{ margin: '0' }}>يرجى الاحتفاظ بالإيصال لاستلام الملابس</p>
      </div>
    </div>
  );
}
