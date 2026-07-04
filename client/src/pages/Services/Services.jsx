import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Sparkles } from 'lucide-react';
import { servicesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import './Services.css';

export default function Services() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // شاشات الإضافة والتعديل
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    price: 0,
    unit: 'piece',
    estimated_hours: 24,
    is_active: 1
  });

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await servicesAPI.getAll();
      if (res.success) {
        setServices(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({
      name: '',
      name_ar: '',
      price: 0,
      unit: 'piece',
      estimated_hours: 24,
      is_active: 1
    });
    setShowModal(true);
  };

  const handleOpenEdit = (service) => {
    setModalMode('edit');
    setSelectedId(service.id);
    setFormData({
      name: service.name,
      name_ar: service.name_ar,
      price: service.price,
      unit: service.unit,
      estimated_hours: service.estimated_hours,
      is_active: service.is_active
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('عذراً، هذا الإجراء يتطلب صلاحيات مدير النظام', 'error');
      return;
    }

    try {
      let res;
      const dataToSave = {
        ...formData,
        price: parseFloat(formData.price),
        estimated_hours: parseInt(formData.estimated_hours),
        is_active: parseInt(formData.is_active)
      };

      if (modalMode === 'add') {
        res = await servicesAPI.create(dataToSave);
      } else {
        res = await servicesAPI.update(selectedId, dataToSave);
      }

      if (res.success) {
        showToast(modalMode === 'add' ? 'تم إضافة الخدمة بنجاح' : 'تم تحديث بيانات الخدمة بنجاح', 'success');
        setShowModal(false);
        loadServices();
      } else {
        showToast(res.message || 'حدث خطأ أثناء الحفظ', 'error');
      }
    } catch (err) {
      showToast(err.message || 'حدث خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      showToast('عذراً، هذا الإجراء يتطلب صلاحيات مدير النظام', 'error');
      return;
    }
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف/تعطيل هذه الخدمة؟')) {
      return;
    }
    try {
      const res = await servicesAPI.delete(id);
      if (res.success) {
        showToast('تم حذف/تعطيل الخدمة بنجاح', 'success');
        loadServices();
      } else {
        showToast(res.message || 'فشل في حذف الخدمة', 'error');
      }
    } catch (err) {
      showToast(err.message || 'خطأ أثناء حذف الخدمة', 'error');
    }
  };

  return (
    <div className="page services-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة الخدمات والأسعار</h1>
          <p className="page-subtitle">استعراض وتعديل قائمة الخدمات وأسعار الغسيل والكي</p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus size={18} style={{ marginLeft: '8px' }} />
            إضافة خدمة جديدة
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center" style={{ height: '200px' }}>
          <LoadingSpinner />
        </div>
      ) : services.length === 0 ? (
        <EmptyState 
          title="لا توجد خدمات" 
          message="لم نجد أي خدمات مسجلة بالنظام حالياً."
        />
      ) : (
        <div className="services-grid mt-md">
          {services.map((service) => (
            <Card 
              key={service.id} 
              className={`service-card ${!service.is_active ? 'inactive' : ''}`}
            >
              <div className="service-card-header">
                <div className="service-icon-wrapper">
                  <Sparkles size={20} />
                </div>
                {!service.is_active && (
                  <span className="inactive-badge">معطلة</span>
                )}
              </div>
              <div className="service-card-body">
                <h3>{service.name_ar}</h3>
                <p className="service-en-name text-secondary">{service.name}</p>
                
                <div className="service-meta-details">
                  <div className="meta-row">
                    <span>السعر:</span>
                    <strong className="text-primary font-bold">{parseFloat(service.price).toFixed(2)} ر.س / {service.unit === 'piece' ? 'قطعة' : 'كيلو'}</strong>
                  </div>
                  <div className="meta-row">
                    <span>مدة الإنجاز:</span>
                    <span>{service.estimated_hours} ساعة</span>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="service-card-actions">
                  <Button variant="secondary" size="small" onClick={() => handleOpenEdit(service)}>
                    <Edit2 size={14} style={{ marginLeft: '4px' }} />
                    تعديل
                  </Button>
                  <Button variant="ghost" size="small" className="text-error" onClick={() => handleDelete(service.id)}>
                    <Trash2 size={14} style={{ marginLeft: '4px' }} />
                    حذف
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* مودال الإضافة والتعديل */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'add' ? 'إضافة خدمة جديدة' : 'تعديل الخدمة'}
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">الاسم بالعربية *</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              placeholder="مثال: غسيل جاف"
            />
          </div>
          <div className="form-group">
            <label className="form-label">الاسم بالإنجليزية *</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: Dry Clean"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">السعر (ر.س) *</label>
              <input
                type="number"
                className="form-input"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                min="0"
                step="0.5"
              />
            </div>
            <div className="form-group">
              <label className="form-label">وحدة الحساب</label>
              <select
                className="form-select"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                <option value="piece">بالقطعة</option>
                <option value="kg">بالكيلو</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">مدة الإنجاز التقريبية (بالساعات)</label>
            <input
              type="number"
              className="form-input"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
              min="1"
            />
          </div>

          <div className="form-group">
            <label className="form-label">حالة الخدمة</label>
            <select
              className="form-select"
              value={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value) })}
            >
              <option value="1">نشطة (متاحة للطلبات)</option>
              <option value="0">معطلة (غير متاحة)</option>
            </select>
          </div>

          <div className="flex justify-between mt-md">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit">
              حفظ الخدمة
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
