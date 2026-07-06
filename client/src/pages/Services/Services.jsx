import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Sparkles, Tags, ShieldAlert, X } from 'lucide-react';
import { servicesAPI, itemTypesAPI } from '../../services/api';
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
  
  // Tabs State: 'services' | 'itemTypes'
  const [activeTab, setActiveTab] = useState('services');
  
  // General Services State
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // General Services Modal State
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

  // Item Types State
  const [itemTypes, setItemTypes] = useState([]);
  const [loadingItemTypes, setLoadingItemTypes] = useState(false);
  const [showItemTypeModal, setShowItemTypeModal] = useState(false);
  const [itemTypeModalMode, setItemTypeModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedItemTypeId, setSelectedItemTypeId] = useState(null);
  const [itemTypeFormData, setItemTypeFormData] = useState({
    name_ar: '',
    name_en: '',
    sizes: ['عادي'], // Default size
    prices: {} // nested structure: { sizeName: { serviceId: price } }
  });
  const [newSizeInput, setNewSizeInput] = useState('');

  // Load General Services
  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await servicesAPI.getAll({ all: 'true' });
      if (res.success) {
        setServices(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load Item Types
  const loadItemTypes = async () => {
    setLoadingItemTypes(true);
    try {
      const res = await itemTypesAPI.getAll();
      if (res.success) {
        setItemTypes(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setItemTypes(false);
    }
  };

  useEffect(() => {
    loadServices();
    loadItemTypes();
  }, []);

  // General Services Actions
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
    if (!window.confirm('هل أنت متأكد من رغبتك في تعطيل هذه الخدمة؟')) {
      return;
    }
    try {
      const res = await servicesAPI.delete(id);
      if (res.success) {
        showToast('تم تعطيل الخدمة بنجاح', 'success');
        loadServices();
      } else {
        showToast(res.message || 'فشل في تعطيل الخدمة', 'error');
      }
    } catch (err) {
      showToast(err.message || 'خطأ أثناء تعطيل الخدمة', 'error');
    }
  };

  // Item Types & Pricing Matrix Actions
  const handleOpenAddItemType = () => {
    setItemTypeModalMode('add');
    // Pre-populate empty prices for all active services
    const initialPrices = {};
    initialPrices['عادي'] = {};
    services.forEach(s => {
      initialPrices['عادي'][s.id] = 0;
    });

    setItemTypeFormData({
      name_ar: '',
      name_en: '',
      sizes: ['عادي'],
      prices: initialPrices
    });
    setNewSizeInput('');
    setShowItemTypeModal(true);
  };

  const handleOpenEditItemType = (itemType) => {
    setItemTypeModalMode('edit');
    setSelectedItemTypeId(itemType.id);
    
    // Map existing nested prices into formData prices state structure
    const mappedPrices = {};
    itemType.sizes.forEach(sz => {
      mappedPrices[sz.size_name] = {};
      sz.prices.forEach(pr => {
        mappedPrices[sz.size_name][pr.service_id] = pr.price;
      });
      
      // Ensure any newly added/missing services have 0 price entry
      services.forEach(s => {
        if (mappedPrices[sz.size_name][s.id] === undefined) {
          mappedPrices[sz.size_name][s.id] = 0;
        }
      });
    });

    setItemTypeFormData({
      name_ar: itemType.name_ar,
      name_en: itemType.name_en || '',
      sizes: itemType.sizes.map(sz => sz.size_name),
      prices: mappedPrices
    });
    setNewSizeInput('');
    setShowItemTypeModal(true);
  };

  const handleAddSizeChip = (e) => {
    e.preventDefault();
    const cleanSizeName = newSizeInput.trim();
    if (!cleanSizeName) return;
    
    if (itemTypeFormData.sizes.includes(cleanSizeName)) {
      showToast('هذا الحجم مضاف بالفعل للقطعة', 'warning');
      return;
    }

    const updatedSizes = [...itemTypeFormData.sizes, cleanSizeName];
    const updatedPrices = { ...itemTypeFormData.prices };
    
    // Initialize pricing structure for the new size with zero rates
    updatedPrices[cleanSizeName] = {};
    services.forEach(s => {
      updatedPrices[cleanSizeName][s.id] = 0;
    });

    setItemTypeFormData({
      ...itemTypeFormData,
      sizes: updatedSizes,
      prices: updatedPrices
    });
    setNewSizeInput('');
  };

  const handleRemoveSizeChip = (sizeName) => {
    if (itemTypeFormData.sizes.length === 1) {
      showToast('يجب الاحتفاظ بحجم واحد على الأقل للقطعة', 'warning');
      return;
    }
    const updatedSizes = itemTypeFormData.sizes.filter(s => s !== sizeName);
    const updatedPrices = { ...itemTypeFormData.prices };
    delete updatedPrices[sizeName];

    setItemTypeFormData({
      ...itemTypeFormData,
      sizes: updatedSizes,
      prices: updatedPrices
    });
  };

  const handlePriceMatrixChange = (sizeName, serviceId, val) => {
    const updatedPrices = { ...itemTypeFormData.prices };
    if (!updatedPrices[sizeName]) {
      updatedPrices[sizeName] = {};
    }
    updatedPrices[sizeName][serviceId] = val;
    setItemTypeFormData({
      ...itemTypeFormData,
      prices: updatedPrices
    });
  };

  const handleSaveItemType = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('عذراً، هذا الإجراء يتطلب صلاحيات مدير النظام', 'error');
      return;
    }

    if (!itemTypeFormData.name_ar.trim()) {
      showToast('الرجاء إدخال اسم القطعة بالعربية', 'warning');
      return;
    }

    try {
      let res;
      if (itemTypeModalMode === 'add') {
        res = await itemTypesAPI.create(itemTypeFormData);
      } else {
        res = await itemTypesAPI.update(selectedItemTypeId, itemTypeFormData);
      }

      if (res.success) {
        showToast(itemTypeModalMode === 'add' ? 'تم إضافة نوع القطعة وشبكة الأسعار بنجاح' : 'تم تحديث نوع القطعة بنجاح', 'success');
        setShowItemTypeModal(false);
        loadItemTypes();
      } else {
        showToast(res.message || 'حدث خطأ أثناء الحفظ', 'error');
      }
    } catch (err) {
      showToast(err.message || 'حدث خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleDeleteItemType = async (id) => {
    if (!isAdmin) {
      showToast('عذراً، هذا الإجراء يتطلب صلاحيات مدير النظام', 'error');
      return;
    }
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف نوع القطعة هذا بالكامل؟ سيتم مسح الأحجام والأسعار المرتبطة بها!')) {
      return;
    }
    try {
      const res = await itemTypesAPI.delete(id);
      if (res.success) {
        showToast('تم حذف نوع القطعة بنجاح', 'success');
        loadItemTypes();
      } else {
        showToast(res.message || 'فشل في حذف نوع القطعة', 'error');
      }
    } catch (err) {
      showToast(err.message || 'خطأ أثناء حذف نوع القطعة', 'error');
    }
  };

  return (
    <div className="page services-page">
      <div className="page-header-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">إدارة الأسعار والخدمات</h1>
            <p className="page-subtitle">استعراض وتعديل الخدمات العامة وتحديد شبكة أسعار الأحجام للقطع المضافة</p>
          </div>
          {isAdmin && (
            <Button 
              variant="primary" 
              onClick={activeTab === 'services' ? handleOpenAdd : handleOpenAddItemType}
            >
              <Plus size={18} style={{ marginLeft: '8px' }} />
              {activeTab === 'services' ? 'إضافة خدمة جديدة' : 'إضافة نوع قطعة جديد'}
            </Button>
          )}
        </div>

        {/* Tab Selector Links */}
        <div className="services-tab-links">
          <button 
            type="button" 
            className={`tab-link-btn ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <Sparkles size={16} />
            <span>الخدمات العامة</span>
          </button>
          <button 
            type="button" 
            className={`tab-link-btn ${activeTab === 'itemTypes' ? 'active' : ''}`}
            onClick={() => setActiveTab('itemTypes')}
          >
            <Tags size={16} />
            <span>أنواع الملابس والأحجام</span>
          </button>
        </div>
      </div>

      {activeTab === 'services' ? (
        loading ? (
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
                      <span>السعر المرجعي:</span>
                      <strong className="text-primary font-bold">{parseFloat(service.price).toFixed(2)} ر.س / {service.unit === 'piece' ? 'قطعة' : 'كيلو'}</strong>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="service-card-actions">
                    <Button variant="secondary" size="small" onClick={() => handleOpenEdit(service)}>
                      <Edit2 size={14} style={{ marginLeft: '4px' }} />
                      تعديل
                    </Button>
                    <Button variant="danger" size="small" onClick={() => handleDelete(service.id)}>
                      <Trash2 size={14} style={{ marginLeft: '4px' }} />
                      تعطيل
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )
      ) : (
        /* Tab 2: Item Types & Sizes Pricing Matrix management */
        loadingItemTypes ? (
          <div className="flex justify-center items-center" style={{ height: '200px' }}>
            <LoadingSpinner />
          </div>
        ) : itemTypes.length === 0 ? (
          <EmptyState 
            title="لا توجد قطع ملابس" 
            message="لم نجد أي أنواع قطع ملابس معرفة بالنظام حالياً. اضغط لإضافة نوع قطعة جديد."
          />
        ) : (
          <div className="services-grid mt-md">
            {itemTypes.map((itemType) => (
              <Card key={itemType.id} className="service-card item-type-card">
                <div className="service-card-header">
                  <div className="service-icon-wrapper item-tag-icon">
                    <Tags size={20} />
                  </div>
                </div>
                
                <div className="service-card-body">
                  <h3>{itemType.name_ar}</h3>
                  <p className="service-en-name text-secondary">{itemType.name_en || 'No english name'}</p>
                  
                  <div className="item-sizes-list-badge mt-sm">
                    <span className="meta-label">الأحجام المتوفرة:</span>
                    <div className="size-badges-container">
                      {itemType.sizes.map(sz => (
                        <span key={sz.id} className="size-pill-badge">{sz.size_name}</span>
                      ))}
                    </div>
                  </div>

                  {/* Show summary price matrix inside the card */}
                  <div className="item-price-preview-table-wrapper mt-md">
                    <table className="price-preview-table">
                      <thead>
                        <tr>
                          <th>الحجم</th>
                          <th>الخدمة</th>
                          <th>السعر</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemType.sizes.map(sz => 
                          sz.prices.map((pr, index) => {
                            const svc = services.find(s => s.id === pr.service_id);
                            if (!svc) return null;
                            return (
                              <tr key={`${sz.id}-${pr.service_id}`}>
                                {index === 0 ? (
                                  <td rowSpan={sz.prices.length} className="size-group-cell">
                                    {sz.size_name}
                                  </td>
                                ) : null}
                                <td>{svc.name_ar}</td>
                                <td className="text-primary font-bold">{pr.price.toFixed(2)} ر.س</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {isAdmin && (
                  <div className="service-card-actions">
                    <Button variant="secondary" size="small" onClick={() => handleOpenEditItemType(itemType)}>
                      <Edit2 size={14} style={{ marginLeft: '4px' }} />
                      تعديل الأسعار
                    </Button>
                    <Button variant="danger" size="small" onClick={() => handleDeleteItemType(itemType.id)}>
                      <Trash2 size={14} style={{ marginLeft: '4px' }} />
                      حذف بالكامل
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )
      )}

      {/* مودال الخدمات العامة */}
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
              <label className="form-label">السعر المرجعي (ر.س) *</label>
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

      {/* مودال أنواع القطع وشبكة الأسعار */}
      <Modal
        isOpen={showItemTypeModal}
        onClose={() => setShowItemTypeModal(false)}
        title={itemTypeModalMode === 'add' ? 'إضافة قطعة وشبكة أسعار جديدة' : 'تعديل أسعار القطعة وأحجامها'}
        width="680px"
      >
        <form onSubmit={handleSaveItemType}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">اسم القطعة بالعربية *</label>
              <input
                type="text"
                className="form-input"
                required
                value={itemTypeFormData.name_ar}
                onChange={(e) => setItemTypeFormData({ ...itemTypeFormData, name_ar: e.target.value })}
                placeholder="مثال: سجادة، بطانية، فستان"
              />
            </div>
            <div className="form-group">
              <label className="form-label">الاسم بالإنجليزية</label>
              <input
                type="text"
                className="form-input"
                value={itemTypeFormData.name_en}
                onChange={(e) => setItemTypeFormData({ ...itemTypeFormData, name_en: e.target.value })}
                placeholder="مثال: Carpet, Blanket, Dress"
              />
            </div>
          </div>

          {/* Dynamic Sizes management input tags chips */}
          <div className="form-group">
            <label className="form-label">الأحجام المتوفرة للقطعة (اضغط Enter لإضافة الحجم) *</label>
            <div className="size-chips-input-container">
              <div className="chips-wrapper">
                {itemTypeFormData.sizes.map(sz => (
                  <span key={sz} className="size-chip-bubble">
                    {sz}
                    <button 
                      type="button" 
                      className="remove-chip-btn" 
                      onClick={() => handleRemoveSizeChip(sz)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="chip-add-flex mt-xs">
                <input
                  type="text"
                  className="form-input size-add-input"
                  value={newSizeInput}
                  onChange={(e) => setNewSizeInput(e.target.value)}
                  placeholder="اكتب اسم الحجم (مثال: كبير، صغير، 3x4 متر)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSizeChip(e);
                    }
                  }}
                />
                <Button variant="secondary" type="button" onClick={handleAddSizeChip}>
                  إضافة
                </Button>
              </div>
            </div>
          </div>

          {/* Pricing Grid Matrix */}
          <div className="form-group mt-md">
            <label className="form-label font-bold text-primary flex items-center">
              <ShieldAlert size={16} style={{ marginLeft: '6px' }} />
              شبكة أسعار الخدمات لكل حجم مضاف (ر.س)
            </label>
            
            <div className="pricing-grid-matrix-container mt-sm">
              {itemTypeFormData.sizes.length === 0 ? (
                <p className="text-secondary text-sm">الرجاء إدخال حجم واحد على الأقل لتحديد الأسعار له.</p>
              ) : (
                <div className="matrix-scroll-wrapper">
                  <table className="pricing-matrix-table">
                    <thead>
                      <tr>
                        <th>الحجم</th>
                        {services.filter(s => s.is_active).map(svc => (
                          <th key={svc.id}>{svc.name_ar}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {itemTypeFormData.sizes.map(sizeName => (
                        <tr key={sizeName}>
                          <td className="size-name-col font-bold">{sizeName}</td>
                          {services.filter(s => s.is_active).map(svc => {
                            const currentVal = itemTypeFormData.prices[sizeName] && itemTypeFormData.prices[sizeName][svc.id] !== undefined
                              ? itemTypeFormData.prices[sizeName][svc.id]
                              : 0;
                            return (
                              <td key={svc.id}>
                                <input
                                  type="number"
                                  className="form-input matrix-price-input"
                                  min="0"
                                  step="0.5"
                                  value={currentVal}
                                  onChange={(e) => handlePriceMatrixChange(sizeName, svc.id, e.target.value)}
                                  placeholder="0.00"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-lg">
            <Button variant="secondary" type="button" onClick={() => setShowItemTypeModal(false)}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit">
              حفظ القطعة والأسعار
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
