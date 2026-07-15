import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
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
      showToast(t('customers.loadDetailFail') || 'فشل في تحميل تفاصيل العميل', 'error');
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
        showToast(modalMode === 'add' ? t('customers.addSuccess') || 'تم إضافة العميل بنجاح' : t('customers.updateSuccess') || 'تم تحديث بيانات العميل بنجاح', 'success');
        setShowModal(false);
        loadCustomers();
      } else {
        showToast(res.message || t('customers.saveFail') || 'حدث خطأ أثناء الحفظ', 'error');
      }
    } catch (err) {
      showToast(err.message || t('customers.networkError') || 'خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm(t('customers.confirmDelete') || 'هل أنت متأكد من رغبتك في حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }
    try {
      const res = await customersAPI.delete(id);
      if (res.success) {
        showToast(t('customers.deleteSuccess') || 'تم حذف العميل بنجاح', 'success');
        loadCustomers();
      } else {
        showToast(res.message || t('customers.deleteFail') || 'فشل في حذف العميل', 'error');
      }
    } catch (err) {
      showToast(err.message || t('customers.deleteError') || 'خطأ أثناء الحذف', 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const exportToCSV = () => {
    const customersToExport = Array.isArray(customers) ? customers : [];
    if (customersToExport.length === 0) {
      showToast(t('customers.exportEmpty') || 'لا يوجد عملاء لتصديرهم', 'warning');
      return;
    }

    const headers = [
      t('customers.colName') || 'الاسم',
      t('customers.colPhone') || 'رقم الهاتف',
      t('customers.colAddress') || 'العنوان',
      t('customers.colRegDate') || 'تاريخ التسجيل'
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
    showToast(t('customers.exportSuccess') || 'تم تصدير العملاء بنجاح إلى ملف إكسل (CSV) 📊', 'success');
  };

  return (
    <div className="page customers-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('customers.title') || 'إدارة العملاء'}</h1>
          <p className="page-subtitle">{t('customers.subtitle') || 'إضافة وتعديل العملاء واستعراض سجل الطلبات والمدفوعات الخاصة بهم'}</p>
        </div>
        <div className="flex gap-sm items-center">
          <Button
            variant="secondary"
            onClick={exportToCSV}
            disabled={!customers || customers.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={18} />
            {t('customers.exportCSVBtn') || 'تصدير ملف إكسل'}
          </Button>
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus size={18} style={{ marginLeft: '8px' }} />
            {t('customers.addNewBtn') || 'إضافة عميل جديد'}
          </Button>
        </div>
      </div>

      {/* شريط البحث */}
      <Card className="mb-md">
        <div className="search-box">
          <input
            type="text"
            className="form-input"
            placeholder={t('customers.searchPlaceholder') || 'ابحث عن عميل بالاسم أو رقم الهاتف...'}
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
          title={t('customers.emptyStateTitle') || 'لا يوجد عملاء'} 
          message={t('customers.emptyStateMsg') || 'لم نجد عملاء مسجلين بالنظام. اضغط على الزر بالأعلى لإضافة عميلك الأول.'}
        />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('customers.colName') || 'الاسم'}</th>
                <th>{t('customers.colPhone') || 'رقم الهاتف'}</th>
                <th>{t('customers.colAddress') || 'العنوان'}</th>
                <th>{t('customers.colRegDate') || 'تاريخ التسجيل'}</th>
                <th style={{ width: '150px', textAlign: 'center' }}>{t('customers.colActions') || 'العمليات'}</th>
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
                        title={t('customers.editTitle') || "تعديل"}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        type="button" 
                        className="btn-action-delete text-error"
                        onClick={(e) => handleDelete(c.id, e)}
                        title={t('customers.deleteTitle') || "حذف"}
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
        title={modalMode === 'add' ? t('customers.addModalTitle') || 'إضافة عميل جديد' : t('customers.editModalTitle') || 'تعديل بيانات العميل'}
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">{t('customers.nameLabel') || 'الاسم بالكامل *'}</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('customers.namePlaceholder') || 'مثال: خالد محمد علي'}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('customers.phoneLabel') || 'رقم الجوال *'}</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={t('customers.phonePlaceholder') || 'مثال: 05XXXXXXXX'}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('customers.addressLabel') || 'العنوان (المدينة / الحي)'}</label>
            <input
              type="text"
              className="form-input"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={t('customers.addressPlaceholder') || 'مثال: الرياض، حي السليمانية'}
            />
          </div>
          <div className="flex justify-between mt-md">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              {t('customers.cancelBtn') || 'إلغاء'}
            </Button>
            <Button variant="primary" type="submit">
              {t('customers.saveBtn') || 'حفظ البيانات'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* مودال عرض التفاصيل وسجل الطلبات */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={t('customers.detailModalTitle') || 'ملف العميل وسجل الطلبات'}
        size="lg"
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
                <p><Calendar size={14} style={{ marginLeft: '4px' }} /> {t('customers.customerSince') || 'عميل منذ:'} {formatDate(customerDetail.created_at)}</p>
              </div>
              <div className="cust-stats">
                <div className="stat-box">
                  <span className="stat-lbl">{t('customers.totalOrders') || 'إجمالي الطلبات'}</span>
                  <span className="stat-val">{customerDetail.orders?.length || 0}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-lbl">{t('customers.totalSpent') || 'إجمالي الإنفاق'}</span>
                  <span className="stat-val text-success">
                    {((customerDetail.orders || []).reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)).toFixed(2)} {settings?.currency || 'ر.س'}
                  </span>
                </div>
              </div>
            </div>

            <h3>{t('customers.recentOrders') || 'تاريخ الطلبات الأخيرة'}</h3>
            {customerDetail.orders && customerDetail.orders.length === 0 ? (
              <p className="text-secondary mt-sm">{t('customers.noOrdersMsg') || 'لا توجد طلبات مسجلة لهذا العميل بعد.'}</p>
            ) : (
              <div className="table-container mt-sm">
                <table>
                  <thead>
                    <tr>
                      <th>{t('finance.orderId') || 'رقم الطلب'}</th>
                      <th>{t('orders.orderDate') || 'تاريخ الطلب'}</th>
                      <th>{t('orders.totalCost') || 'إجمالي التكلفة'}</th>
                      <th>{t('orders.paid') || 'المدفوع'}</th>
                      <th>{t('orders.remaining') || 'المتبقي'}</th>
                      <th>{t('orders.status') || 'الحالة'}</th>
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
                        <td>{t(`status.${order.status}`) || (order.status === 'pending' ? 'انتظار' : order.status === 'ready' ? 'جاهز' : 'مكتمل')}</td>
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
