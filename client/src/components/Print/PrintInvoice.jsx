import React from 'react';

export default function PrintInvoice({ order }) {
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
      <div className="receipt-header" style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>مغسلة الملابس الذكية</h2>
        <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>نظام إدارة وتتبع ذكي</p>
        <p style={{ margin: '0', fontSize: '11px', color: '#666' }}>هاتف: 0501234567</p>
      </div>

      <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px', fontSize: '12px' }}>
        <div><strong>رقم الطلب:</strong> #{order.id}</div>
        <div><strong>التاريخ:</strong> {formatDate(order.created_at || new Date())}</div>
        {order.expected_delivery_at && <div><strong>التسليم المتوقع:</strong> {formatDate(order.expected_delivery_at)}</div>}
        <div><strong>العميل:</strong> {order.customer_name || (order.customer && order.customer.name) || 'عميل عام'}</div>
        <div><strong>الجوال:</strong> {order.customer_phone || (order.customer && order.customer.phone) || ''}</div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '8px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ textAlign: 'right', padding: '4px 0' }}>القطعة</th>
            <th style={{ textAlign: 'right', padding: '4px 0' }}>الخدمة</th>
            <th style={{ textAlign: 'left', padding: '4px 0' }}>السعر</th>
          </tr>
        </thead>
        <tbody>
          {order.items && order.items.map((item, index) => (
            <tr key={index} style={{ borderBottom: '1px dotted #ccc' }}>
              <td style={{ padding: '4px 0' }}>
                {getItemTypeAr(item.item_type)}
                {item.notes && <span style={{ fontSize: '9px', display: 'block', color: '#555' }}>({item.notes})</span>}
              </td>
              <td style={{ padding: '4px 0' }}>{getServiceName(item)}</td>
              <td style={{ padding: '4px 0', textAlign: 'left' }}>{formatAmount(item.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', fontSize: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span>الإجمالي:</span>
          <strong>{formatAmount(order.total_amount)} ر.س</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span>المدفوع:</span>
          <span>{formatAmount(order.paid_amount)} ر.س</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderTop: '1px solid #eee', marginTop: '4px' }}>
          <span>المتبقي:</span>
          <strong style={{ fontSize: '13px' }}>{formatAmount(order.remaining_amount)} ر.س</strong>
        </div>
        {order.payment_method && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span>طريقة الدفع:</span>
            <span>{getPaymentMethodAr(order.payment_method)}</span>
          </div>
        )}
        {order.notes && <div style={{ padding: '6px 0 0', fontSize: '11px' }}><strong>ملاحظات:</strong> {order.notes}</div>}
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', borderTop: '1px dashed #000', paddingTop: '10px' }}>
        <p style={{ margin: '0 0 5px 0' }}>شكراً لزيارتكم!</p>
        <p style={{ margin: '0' }}>يرجى الاحتفاظ بالإيصال لاستلام الملابس</p>
      </div>
    </div>
  );
}
