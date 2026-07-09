import { useState, useEffect } from 'react';
import { Search, Plus, User, Edit2, Trash2, Calendar, Phone, MapPin, Download } from 'lucide-react';
import { customersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import './Customers.css';

export default function Customers() {
  const { showToast } = useToast();
  const { settings } = useSettings();

  const getInitials = (name) => {
    if (!name) return '؟';
    return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2);
  };

  const getAvatarGradient = (name) => {
    const gradients = [
      'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)', // Indigo/Blue
      'linear-gradient(135deg, #10B981 0%, #059669 100%)', // Emerald/Green
      'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', // Amber/Orange
      'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)', // Pink/Rose
      'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)', // Purple/Violet
      'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)', // Cyan/Teal
    ];
    let hash = 0;
    const nameStr = name || '';
    for (let i = 0; i < nameStr.length; i++) {
      hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // شاشات الإضافة والتعديل والعرض
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [selectedId, setSelectedId] = useState(null);
  
  // شاشة تفاصيل العميل والطلبات
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await customersAPI.getAll({ search });
      if (res.success) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({ name: '', phone: '', address: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (customer, e) => {
    e.stopPropagation(); // منع فتح نافذة التفاصيل
    setModalMode('edit');
    setSelectedId(customer.id);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address || ''
    });
    setShowModal(true);
  };

  const handleOpenDetail = async (customerId) => {
    setShowDetailModal(true);
    setLoadingDetail(true);
    try {
      const res = await customersAPI.getById(customerId);
      if (res.success) {
        setCustomerDetail(res.data);
      }
    } catch (err) {
      console.error(err);
      showToast('فشل في تحميل تفاصيل العميل', 'error');
      setShowDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (modalMode === 'add') {
        res = await customersAPI.create(formData);
      } else {
        res = await customersAPI.update(selectedId, formData);
      }

      if (res.success) {
        showToast(modalMode === 'add' ? 'تم إضافة العميل بنجاح' : 'تم تحديث بيانات العميل بنجاح', 'success');
        setShowModal(false);
        loadCustomers();
      } else {
        showToast(res.message || 'حدث خطأ أثناء الحفظ', 'error');
      }
    } catch (err) {
      showToast(err.message || 'خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }
    try {
      const res = await customersAPI.delete(id);
      if (res.success) {
        showToast('تم حذف العميل بنجاح', 'success');
        loadCustomers();
      } else {
        showToast(res.message || 'فشل في حذف العميل', 'error');
      }
    } catch (err) {
      showToast(err.message || 'خطأ أثناء الحذف', 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const exportToCSV = () => {
    const customersToExport = Array.isArray(customers) ? customers : [];
    if (customersToExport.length === 0) {
      showToast('لا يوجد عملاء لتصديرهم', 'warning');
      return;
    }

    const headers = [
      'الاسم',
      'رقم الهاتف',
      'العنوان',
      'تاريخ التسجيل'
    ];

    const formatCSVField = (field) => {
      if (field === null || field === undefined) return '""';
      const stringField = String(field);
      return `"${stringField.replace(/"/g, '""')}"`;
    };

    const rows = customersToExport.map(c => {
      const name = c?.name || '-';
      const phone = c?.phone || '-';
      const address = c?.address || '-';
      const regDate = formatDate(c?.created_at);

      return [
        formatCSVField(name),
        formatCSVField(phone),
        formatCSVField(address),
        formatCSVField(regDate)
      ];
    });

    const csvContent = '\uFEFF' + [
      headers.map(h => formatCSVField(h)).join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `customers_export_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تصدير العملاء بنجاح إلى ملف إكسل (CSV) 📊', 'success');
  };

  return (
    <div className="page customers-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة العملاء</h1>
          <p className="page-subtitle">إضافة وتعديل العملاء واستعراض سجل الطلبات والمدفوعات الخاصة بهم</p>
        </div>
        <div className="flex gap-sm items-center">
          <Button
            variant="secondary"
            onClick={exportToCSV}
            disabled={!customers || customers.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={18} />
            تصدير ملف إكسل
          </Button>
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus size={18} style={{ marginLeft: '8px' }} />
            إضافة عميل جديد
          </Button>
        </div>
      </div>

      {/* شريط البحث */}
      <Card className="mb-md">
        <div className="search-box">
          <input
            type="text"
            className="form-input"
            placeholder="ابحث عن عميل بالاسم أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={18} className="search-icon" />
        </div>
      </Card>

      {/* قائمة العملاء */}
      {loading ? (
        <div className="flex justify-center items-center" style={{ height: '200px' }}>
          <LoadingSpinner />
        </div>
      ) : customers.length === 0 ? (
        <EmptyState 
          title="لا يوجد عملاء" 
          message="لم نجد عملاء مسجلين بالنظام. اضغط على الزر بالأعلى لإضافة عميلك الأول."
        />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>رقم الهاتف</th>
                <th>العنوان</th>
                <th>تاريخ التسجيل</th>
                <th style={{ width: '150px', textAlign: 'center' }}>العمليات</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => handleOpenDetail(c.id)}>
                  <td>
                    <div className="flex items-center gap-sm">
                      <div 
                        className="avatar-wrapper"
                        style={{ 
                          background: getAvatarGradient(c.name),
                          color: '#FFFFFF',
                          fontWeight: 'bold',
                          fontSize: '0.8rem'
                        }}
                      >
                        {getInitials(c.name)}
                      </div>
                      <strong>{c.name}</strong>
                    </div>
                  </td>
                  <td>{c.phone}</td>
                  <td>{c.address || '-'}</td>
                  <td>{formatDate(c.created_at)}</td>
                  <td className="text-center">
                    <div className="flex justify-center gap-sm">
                      <button 
                        type="button" 
                        className="btn-action-edit text-primary"
                        onClick={(e) => handleOpenEdit(c, e)}
                        title="تعديل"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        type="button" 
                        className="btn-action-delete text-error"
                        onClick={(e) => handleDelete(c.id, e)}
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال الإضافة والتعديل */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'add' ? 'إضافة عميل جديد' : 'تعديل بيانات العميل'}
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">الاسم بالكامل *</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: خالد محمد علي"
            />
          </div>
          <div className="form-group">
            <label className="form-label">رقم الجوال *</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="مثال: 05XXXXXXXX"
            />
          </div>
          <div className="form-group">
            <label className="form-label">العنوان (المدينة / الحي)</label>
            <input
              type="text"
              className="form-input"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="مثال: الرياض، حي السليمانية"
            />
          </div>
          <div className="flex justify-between mt-md">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit">
              حفظ البيانات
            </Button>
          </div>
        </form>
      </Modal>

      {/* مودال عرض التفاصيل وسجل الطلبات */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="ملف العميل وسجل الطلبات"
        size="large"
      >
        {loadingDetail || !customerDetail ? (
          <div className="flex justify-center items-center" style={{ height: '200px' }}>
            <LoadingSpinner />
          </div>
        ) : (
          <div className="customer-detail-content">
            <div className="customer-detail-summary-card mb-md">
              <div className="cust-info">
                <h2>{customerDetail.name}</h2>
                <p><Phone size={14} style={{ marginLeft: '4px' }} /> {customerDetail.phone}</p>
                {customerDetail.address && (
                  <p><MapPin size={14} style={{ marginLeft: '4px' }} /> {customerDetail.address}</p>
                )}
                <p><Calendar size={14} style={{ marginLeft: '4px' }} /> عميل منذ: {formatDate(customerDetail.created_at)}</p>
              </div>
              <div className="cust-stats">
                <div className="stat-box">
                  <span className="stat-lbl">إجمالي الطلبات</span>
                  <span className="stat-val">{customerDetail.orders?.length || 0}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-lbl">إجمالي الإنفاق</span>
                  <span className="stat-val text-success">
                    {((customerDetail.orders || []).reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)).toFixed(2)} {settings?.currency || 'ر.س'}
                  </span>
                </div>
              </div>
            </div>

            <h3>تاريخ الطلبات الأخيرة</h3>
            {customerDetail.orders && customerDetail.orders.length === 0 ? (
              <p className="text-secondary mt-sm">لا توجد طلبات مسجلة لهذا العميل بعد.</p>
            ) : (
              <div className="table-container mt-sm">
                <table>
                  <thead>
                    <tr>
                      <th>رقم الطلب</th>
                      <th>تاريخ الطلب</th>
                      <th>إجمالي التكلفة</th>
                      <th>المدفوع</th>
                      <th>المتبقي</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerDetail.orders?.map((order) => (
                      <tr key={order.id}>
                        <td><strong>#{order.id}</strong></td>
                        <td>{formatDate(order.created_at)}</td>
                        <td>{parseFloat(order.total_amount).toFixed(2)} {settings?.currency || 'ر.س'}</td>
                        <td>{parseFloat(order.paid_amount).toFixed(2)} {settings?.currency || 'ر.س'}</td>
                        <td className={parseFloat(order.remaining_amount) > 0 ? 'text-warning' : 'text-success'}>
                          {parseFloat(order.remaining_amount).toFixed(2)} {settings?.currency || 'ر.س'}
                        </td>
                        <td>{order.status === 'pending' ? 'انتظار' : order.status === 'ready' ? 'جاهز' : 'مكتمل'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
