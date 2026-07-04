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
    <div className="print-receipt" style={{ direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      {/* Header */}
      <div className="receipt-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '20px', borderBottom: '2px solid #e2e8f0', marginBottom: '30px' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', color: '#1e293b', fontWeight: '800' }}>{settings.laundryName}</h1>
          {settings.laundryAddress && <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b' }}>{settings.laundryAddress}</p>}
          <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b' }}>هاتف: {settings.laundryPhone}</p>
          {settings.taxNumber && <p style={{ margin: '0', fontSize: '14px', color: '#64748b', fontWeight: '700' }}>الرقم الضريبي: {settings.taxNumber}</p>}
        </div>
        <div style={{ textAlign: 'left', flex: 1 }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '36px', color: '#e2e8f0', letterSpacing: '2px', textTransform: 'uppercase' }}>فاتورة ضريبية</h2>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'inline-block', minWidth: '200px' }}>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontSize: '14px' }}>رقم الفاتورة:</span>
              <strong style={{ fontSize: '16px', color: '#0f172a' }}>#{order.id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontSize: '14px' }}>التاريخ:</span>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>{formatDate(order.created_at || new Date())}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Customer & Order Meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <div style={{ flex: 1, paddingRight: '10px' }}>
          <h3 style={{ fontSize: '16px', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '10px' }}>بيانات العميل</h3>
          <p style={{ margin: '0 0 5px 0', fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>{order.customer_name || (order.customer && order.customer.name) || 'عميل عام'}</p>
          <p style={{ margin: '0', fontSize: '14px', color: '#64748b' }}>الجوال: <span style={{ direction: 'ltr', display: 'inline-block' }}>{order.customer_phone || (order.customer && order.customer.phone) || '-'}</span></p>
        </div>
        <div style={{ flex: 1, paddingLeft: '10px', textAlign: 'left' }}>
          <h3 style={{ fontSize: '16px', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '10px' }}>تفاصيل التسليم</h3>
          <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b' }}>حالة الطلب: <strong style={{ color: '#0f172a' }}>{order.status === 'pending' ? 'انتظار' : order.status === 'ready' ? 'جاهز للاستلام' : order.status === 'delivered' ? 'تم التسليم' : 'جاري التشغيل'}</strong></p>
          {order.expected_delivery_at && (
            <p style={{ margin: '0', fontSize: '14px', color: '#64748b' }}>التسليم المتوقع: <strong style={{ color: '#0f172a' }}>{formatDate(order.expected_delivery_at)}</strong></p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: '30px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '12px 15px', textAlign: 'right', color: '#334155', width: '50px' }}>#</th>
              <th style={{ padding: '12px 15px', textAlign: 'right', color: '#334155' }}>نوع القطعة</th>
              <th style={{ padding: '12px 15px', textAlign: 'right', color: '#334155' }}>الخدمة المقدمة</th>
              <th style={{ padding: '12px 15px', textAlign: 'left', color: '#334155' }}>السعر</th>
            </tr>
          </thead>
          <tbody>
            {order.items && order.items.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px 15px', color: '#64748b' }}>{index + 1}</td>
                <td style={{ padding: '12px 15px', color: '#0f172a', fontWeight: '600' }}>
                  {getItemTypeAr(item.item_type)}
                  {item.notes && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: 'normal' }}>ملاحظة: {item.notes}</div>}
                </td>
                <td style={{ padding: '12px 15px', color: '#475569' }}>{getServiceName(item)}</td>
                <td style={{ padding: '12px 15px', textAlign: 'left', color: '#0f172a', fontWeight: 'bold' }}>{formatAmount(item.price)} {settings.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financials & Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, paddingRight: '20px' }}>
          <h3 style={{ fontSize: '16px', color: '#334155', marginBottom: '10px' }}>ملاحظات الفاتورة:</h3>
          <p style={{ margin: '0', fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
            {order.notes ? order.notes : 'لا توجد ملاحظات إضافية على هذا الطلب.'}
          </p>
          <div style={{ marginTop: '30px', padding: '15px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>طريقة الدفع:</p>
            <p style={{ margin: '0', fontSize: '14px', color: '#475569' }}>{getPaymentMethodAr(order.payment_method)}</p>
          </div>
        </div>

        <div style={{ flex: 1, maxWidth: '350px' }}>
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            {settings.vatPercent > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#64748b', fontSize: '14px' }}>
                  <span>الإجمالي الخاضع للضريبة:</span>
                  <span>{formatAmount(order.total_amount / (1 + settings.vatPercent / 100))} {settings.currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#64748b', fontSize: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
                  <span>قيمة الضريبة المضافة ({settings.vatPercent}%):</span>
                  <span>{formatAmount(order.total_amount - (order.total_amount / (1 + settings.vatPercent / 100)))} {settings.currency}</span>
                </div>
              </>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
              <span>الإجمالي الكلي:</span>
              <span>{formatAmount(order.total_amount)} {settings.currency}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '15px', color: '#10b981' }}>
              <span>المبلغ المدفوع:</span>
              <span>{formatAmount(order.paid_amount)} {settings.currency}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '15px', borderTop: '2px solid #e2e8f0', fontSize: '16px', fontWeight: 'bold', color: parseFloat(order.remaining_amount) > 0 ? '#ef4444' : '#10b981' }}>
              <span>المبلغ المتبقي:</span>
              <span>{formatAmount(order.remaining_amount)} {settings.currency}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '14px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#334155' }}>نشكر لكم ثقتكم واختياركم {settings.laundryName}</p>
        <p style={{ margin: '0' }}>يرجى إبراز هذا الإيصال عند استلام الملابس</p>
      </div>
    </div>
  );
}
