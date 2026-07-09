import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Sparkles, Tags, ShieldAlert, X, Download, Search } from 'lucide-react';
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
  
  const [itemTypeSearch, setItemTypeSearch] = useState('');
  
  // General Services State (for columns in item pricing matrix)
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

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
        // ترتيب الأحجام بشكل منطقي
        const sortedData = (res.data || []).map(itemType => ({
          ...itemType,
          sizes: sortSizes(itemType.sizes)
        }));
        setItemTypes(sortedData);
      } else {
        setItemTypes([]);
      }
    } catch (err) {
      console.error(err);
      setItemTypes([]);
    } finally {
      setLoadingItemTypes(false);
    }
  };

  // دالة ترتيب الأحجام العالمية (تدعم سلاسل أسماء الأحجام والكائنات)
  const sortSizes = (sizes) => {
    if (!sizes || !Array.isArray(sizes)) return [];
    
    const sizeOrder = {
      'طفل': 1,
      'kids': 1,
      'صغير': 2,
      'small': 2,
      'سجاد صغير': 2,
      'مفرد': 2,
      'نفر': 2,
      'وسط': 3,
      'medium': 3,
      'سجاد وسط': 3,
      'مزدوج': 3,
      'نفرين': 3,
      'عادي': 4,
      'regular': 4,
      'كبير': 5,
      'large': 5,
      'سجاد كبير': 5,
      'كبير جداً': 6,
      'x-large': 6,
      'xlarge': 6,
      'ملكي': 7
    };

    return [...sizes].sort((a, b) => {
      const aName = (typeof a === 'object' && a !== null ? (a.size_name || '') : String(a)).trim().toLowerCase();
      const bName = (typeof b === 'object' && b !== null ? (b.size_name || '') : String(b)).trim().toLowerCase();
      const aOrder = sizeOrder[aName] || 999;
      const bOrder = sizeOrder[bName] || 999;
      
      if (aOrder === 999 && bOrder === 999) {
        return aName.localeCompare(bName, 'ar');
      }
      return aOrder - bOrder;
    });
  };

  useEffect(() => {
    loadServices();
    loadItemTypes();
  }, []);

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
    (itemType.sizes || []).forEach(sz => {
      mappedPrices[sz.size_name] = {};
      (sz.prices || []).forEach(pr => {
        mappedPrices[sz.size_name][pr.service_id] = pr.price;
      });
      
      // Ensure any newly added/missing services have 0 price entry
      services.forEach(s => {
        if (mappedPrices[sz.size_name][s.id] === undefined) {
          mappedPrices[sz.size_name][s.id] = 0;
        }
      });
    });

    const sortedSizes = sortSizes((itemType.sizes || []).map(sz => sz.size_name));
    setItemTypeFormData({
      name_ar: itemType.name_ar,
      name_en: itemType.name_en || '',
      sizes: sortedSizes,
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
      sizes: sortSizes(updatedSizes),
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
      const cleanedPrices = {};
      itemTypeFormData.sizes.forEach(sz => {
        cleanedPrices[sz] = {};
        const sizePrices = itemTypeFormData.prices[sz] || {};
        Object.keys(sizePrices).forEach(svcId => {
          const val = parseFloat(sizePrices[svcId]);
          cleanedPrices[sz][svcId] = !isNaN(val) && val >= 0 ? val : 0;
        });
      });

      const payload = {
        name_ar: itemTypeFormData.name_ar.trim(),
        name_en: itemTypeFormData.name_en ? itemTypeFormData.name_en.trim() : '',
        sizes: sortSizes(itemTypeFormData.sizes),
        prices: cleanedPrices
      };

      if (itemTypeModalMode === 'add') {
        res = await itemTypesAPI.create(payload);
      } else {
        res = await itemTypesAPI.update(selectedItemTypeId, payload);
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

  const exportToCSV = () => {
    const typesToExport = Array.isArray(itemTypes) ? itemTypes : [];
    if (typesToExport.length === 0) {
      showToast('لا توجد قطع ملابس لتصديرها', 'warning');
      return;
    }

    const activeServices = (Array.isArray(services) ? services : []).filter(s => s.is_active);
    const headers = [
      'رقم القطعة',
      'اسم القطعة بالعربية',
      'اسم القطعة بالإنجليزية',
      'الحجم',
      ...activeServices.map(svc => svc.name_ar)
    ];

    const formatCSVField = (field) => {
      if (field === null || field === undefined) return '""';
      const stringField = String(field);
      return `"${stringField.replace(/"/g, '""')}"`;
    };

    const rows = [];
    typesToExport.forEach(itemType => {
      const sortedSizes = sortSizes(itemType.sizes || []);
      if (sortedSizes.length === 0) {
        rows.push([
          formatCSVField(`#${itemType.id}`),
          formatCSVField(itemType.name_ar || '-'),
          formatCSVField(itemType.name_en || '-'),
          formatCSVField('عام'),
          ...activeServices.map(() => formatCSVField('0.00'))
        ]);
      } else {
        sortedSizes.forEach(sz => {
          const sizeRow = [
            formatCSVField(`#${itemType.id}`),
            formatCSVField(itemType.name_ar || '-'),
            formatCSVField(itemType.name_en || '-'),
            formatCSVField(typeof sz === 'object' && sz !== null ? (sz.size_name || '-') : String(sz))
          ];
          activeServices.forEach(svc => {
            const priceObj = (sz.prices || []).find(p => p.service_id === svc.id);
            const priceVal = priceObj ? parseFloat(priceObj.price || 0).toFixed(2) : '0.00';
            sizeRow.push(formatCSVField(priceVal));
          });
          rows.push(sizeRow);
        });
      }
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
    link.setAttribute('download', `clothing_sizes_matrix_export_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تصدير شبكة أسعار القطع والأحجام بنجاح إلى ملف إكسل (CSV) 📊', 'success');
  };

  return (
    <div className="page services-page">
      <div className="page-header-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">إدارة أنواع الملابس والأحجام</h1>
            <p className="page-subtitle">تحديد أنواع الملابس والأحجام وشبكة الأسعار للخدمات المختلفة</p>
          </div>
          <div className="flex gap-sm items-center">
            <Button
              variant="secondary"
              onClick={exportToCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={18} />
              تصدير ملف إكسل
            </Button>
            {isAdmin && (
              <Button 
                variant="primary" 
                onClick={handleOpenAddItemType}
              >
                <Plus size={18} style={{ marginLeft: '8px' }} />
                إضافة نوع قطعة جديد
              </Button>
            )}
          </div>
        </div>
      </div>
          <Card className="mb-md">
            <div className="search-box">
              <input
                type="text"
                className="form-input"
                placeholder="ابحث عن نوع القطعة أو الحجم (مثال: بدلة، بطانية، سجاد، عادي)..."
                value={itemTypeSearch}
                onChange={(e) => setItemTypeSearch(e.target.value)}
              />
              <Search size={18} className="search-icon" />
            </div>
          </Card>

          {loadingItemTypes ? (
            <div className="flex justify-center items-center" style={{ height: '200px' }}>
              <LoadingSpinner />
            </div>
          ) : !Array.isArray(itemTypes) || itemTypes.length === 0 ? (
            <EmptyState 
              title="لا توجد قطع ملابس" 
              message="لم نجد أي أنواع قطع ملابس معرفة بالنظام حالياً. اضغط لإضافة نوع قطعة جديد."
            />
          ) : (() => {
            const filteredItemTypes = itemTypes.filter(itemType => {
              if (!itemTypeSearch.trim()) return true;
              const query = itemTypeSearch.trim().toLowerCase();
              const matchAr = (itemType.name_ar || '').toLowerCase().includes(query);
              const matchEn = (itemType.name_en || '').toLowerCase().includes(query);
              const matchSizes = (itemType.sizes || []).some(sz => (sz.size_name || '').toLowerCase().includes(query));
              return matchAr || matchEn || matchSizes;
            });

            return filteredItemTypes.length === 0 ? (
              <EmptyState 
                title="لا توجد نتائج" 
                message="لم نجد أي قطع ملابس أو أحجام تطابق بحثك الحالي."
              />
            ) : (
              <div className="services-grid mt-md">
                {filteredItemTypes.map((itemType) => {
                  const sortedCardSizes = sortSizes(itemType.sizes || []);
                  return (
                    <Card key={itemType.id} className="service-card item-type-card">
                      <div className="service-card-header">
                        <div className="service-icon-wrapper item-tag-icon">
                          <Tags size={20} />
                        </div>
                      </div>
                      
                      <div className="service-card-body">
                        <h3>{itemType.name_ar}</h3>
                        <p className="service-en-name text-secondary">{itemType.name_en || 'بدون اسم إنجليزي'}</p>
                        
                        <div className="item-sizes-list-badge mt-sm">
                          <span className="meta-label">الأحجام المتوفرة:</span>
                          <div className="size-badges-container">
                            {sortedCardSizes.map(sz => {
                              const sName = typeof sz === 'object' && sz !== null ? (sz.size_name || '-') : String(sz);
                              return <span key={typeof sz === 'object' && sz !== null ? (sz.id || sName) : sName} className="size-pill-badge">{sName}</span>;
                            })}
                          </div>
                        </div>

                        {/* Show summary price matrix inside the card */}
                        <div className="item-price-preview-table-wrapper mt-md">
                          <table className="price-preview-table">
                            <thead>
                              <tr>
                                <th style={{ minWidth: '80px' }}>الحجم</th>
                                {services.filter(s => s.is_active).map(svc => (
                                  <th key={svc.id} style={{ minWidth: '100px', textAlign: 'center' }}>{svc.name_ar}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sortedCardSizes.map(sz => {
                                const sName = typeof sz === 'object' && sz !== null ? (sz.size_name || '-') : String(sz);
                                const sPrices = typeof sz === 'object' && sz !== null ? (sz.prices || []) : [];
                                return (
                                  <tr key={typeof sz === 'object' && sz !== null ? (sz.id || sName) : sName}>
                                    <td className="size-group-cell">{sName}</td>
                                    {services.filter(s => s.is_active).map(svc => {
                                      const priceObj = sPrices.find(p => p.service_id === svc.id);
                                      const price = priceObj ? priceObj.price : 0;
                                      return (
                                        <td key={svc.id} className="text-primary font-bold" style={{ textAlign: 'center' }}>
                                          {parseFloat(price).toFixed(2)} ر.س
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
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
                  );
                })}
              </div>
            );
          })()}

      {/* مودال أنواع القطع وشبكة الأسعار */}
      <Modal
        isOpen={showItemTypeModal}
        onClose={() => setShowItemTypeModal(false)}
        title={itemTypeModalMode === 'add' ? 'إضافة قطعة وشبكة أسعار جديدة' : 'تعديل أسعار القطعة وأحجامها'}
        width="940px"
        size="xl"
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
                      {sortSizes(itemTypeFormData.sizes).map(sizeName => (
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
                                  step="any"
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
