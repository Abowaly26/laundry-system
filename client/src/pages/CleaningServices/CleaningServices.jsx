import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { servicesAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import './CleaningServices.css';

export default function CleaningServices() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingService, setEditingService] = useState(null);

  const [formData, setFormData] = useState({
    name_ar: '',
    name: '',
    price: 0,
    unit: 'piece',
    estimated_hours: 24,
    is_active: true
  });

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await servicesAPI.getAll({ all: 'true' });
      if (res.success) {
        setServices(res.data);
      }
    } catch (err) {
      console.error(err);
      showToast(t('services.fetchError') || 'خطأ في جلب الخدمات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleOpenModal = (mode, service = null) => {
    setModalMode(mode);
    setEditingService(service);
    if (mode === 'edit' && service) {
      setFormData({
        name_ar: service.name_ar,
        name: service.name,
        price: service.price,
        unit: service.unit,
        estimated_hours: service.estimated_hours,
        is_active: service.is_active
      });
    } else {
      setFormData({
        name_ar: '',
        name: '',
        price: 0,
        unit: 'piece',
        estimated_hours: 24,
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name_ar) {
      showToast(t('services.nameArRequired') || 'الرجاء إدخال اسم الخدمة بالعربية', 'warning');
      return;
    }

    try {
      if (modalMode === 'add') {
        const res = await servicesAPI.create(formData);
        if (res.success) {
          showToast(t('services.addSuccess') || 'تم إضافة الخدمة بنجاح', 'success');
        } else {
          showToast(res.message || 'خطأ في إضافة الخدمة', 'error');
        }
      } else {
        const res = await servicesAPI.update(editingService.id, formData);
        if (res.success) {
          showToast(t('services.updateSuccess') || 'تم تحديث الخدمة بنجاح', 'success');
        } else {
          showToast(res.message || 'خطأ في تحديث الخدمة', 'error');
        }
      }
      handleCloseModal();
      fetchServices();
    } catch (err) {
      console.error(err);
      showToast(t('services.saveError') || 'خطأ أثناء حفظ الخدمة', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('services.confirmDelete') || 'هل أنت متأكد من رغبتك في حذف هذه الخدمة؟ (قد تفشل العملية إذا كانت الخدمة مستخدمة بالفعل)')) {
      return;
    }
    try {
      const res = await servicesAPI.delete(id);
      if (res.success) {
        showToast(t('services.deleteSuccess') || 'تم حذف الخدمة بنجاح', 'success');
        fetchServices();
      } else {
        showToast(res.message || 'خطأ في حذف الخدمة', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('services.deleteError') || 'لا يمكن حذف الخدمة لوجود ارتباطات بها في النظام', 'error');
    }
  };

  return (
    <div className="page cleaning-services-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('sidebar.cleaningServices') || 'خدمات الغسيل والتنظيف'}</h1>
          <p className="page-subtitle">إدارة طرق التنظيف المتوفرة في المغسلة (غسيل، كي، تنظيف جاف)</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => handleOpenModal('add')}>
            <Plus size={18} />
            إضافة خدمة جديدة
          </button>
        </div>
      </div>

      <div className="services-list-container">
        {loading ? (
          <div className="loading-state">جاري التحميل...</div>
        ) : (
          <table className="services-table">
            <thead>
              <tr>
                <th>الاسم (عربي)</th>
                <th>الاسم (إنجليزي)</th>
                <th>الوحدة</th>
                <th>السعر الافتراضي</th>
                <th>المدة المتوقعة (ساعات)</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {services.map(service => (
                <tr key={service.id}>
                  <td>{service.name_ar}</td>
                  <td>{service.name || '-'}</td>
                  <td>{service.unit === 'piece' ? 'قطعة' : 'كيلو'}</td>
                  <td>{service.price}</td>
                  <td>{service.estimated_hours}</td>
                  <td>
                    <span className={`status-badge ${service.is_active ? 'active' : 'inactive'}`}>
                      {service.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn-icon" onClick={() => handleOpenModal('edit', service)} title="تعديل">
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDelete(service.id)} title="حذف">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>
                    لا توجد خدمات مضافة حتى الآن.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{modalMode === 'add' ? 'إضافة خدمة تنظيف جديدة' : 'تعديل خدمة التنظيف'}</h2>
              <button className="btn-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>الاسم بالعربية *</label>
                  <input
                    type="text"
                    name="name_ar"
                    className="form-control"
                    value={formData.name_ar}
                    onChange={handleChange}
                    required
                    placeholder="مثال: غسيل وكي مستعجل"
                  />
                </div>
                <div className="form-group">
                  <label>الاسم بالإنجليزية</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Urgent Wash & Iron"
                  />
                </div>
                <div className="form-group">
                  <label>الوحدة الافتراضية</label>
                  <select
                    name="unit"
                    className="form-control"
                    value={formData.unit}
                    onChange={handleChange}
                  >
                    <option value="piece">قطعة (Piece)</option>
                    <option value="kg">كيلوجرام (Kg)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>السعر الافتراضي</label>
                    <input
                      type="number"
                      name="price"
                      min="0"
                      step="0.01"
                      className="form-control"
                      value={formData.price}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>المدة المتوقعة (ساعات)</label>
                    <input
                      type="number"
                      name="estimated_hours"
                      min="1"
                      className="form-control"
                      value={formData.estimated_hours}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                    />
                    الخدمة نشطة (تظهر للعملاء والموظفين)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  إلغاء
                </button>
                <button type="submit" className="btn-primary">
                  حفظ الخدمة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
