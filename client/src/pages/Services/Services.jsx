import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Sparkles, Tags, ShieldAlert, X, Download, Search, Wand2 } from 'lucide-react';
import { servicesAPI, itemTypesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import './Services.css';

export default function Services() {
  const { t, i18n } = useTranslation();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const { settings } = useSettings();
  
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

  // Cleaning Services State
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [unitDropdownPos, setUnitDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const unitDropdownRef = useRef(null);
  const [showCleaningServiceModal, setShowCleaningServiceModal] = useState(false);
  const [cleaningServiceModalMode, setCleaningServiceModalMode] = useState('add'); // 'add' | 'edit'
  const [editingCleaningService, setEditingCleaningService] = useState(null);
  const [cleaningServiceFormData, setCleaningServiceFormData] = useState({
    name_ar: '',
    name: '',
    price: 0,
    unit: 'piece',
    estimated_hours: 24,
    is_active: true
  });

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

  // --- Cleaning Services Handlers ---
  const handleOpenCleaningService = (mode, service = null) => {
    setCleaningServiceModalMode(mode);
    setEditingCleaningService(service);
    if (mode === 'edit' && service) {
      setCleaningServiceFormData({
        name_ar: service.name_ar,
        name: service.name || '',
        price: service.price,
        unit: service.unit,
        estimated_hours: service.estimated_hours,
        is_active: service.is_active
      });
    } else {
      setCleaningServiceFormData({
        name_ar: '',
        name: '',
        price: 0,
        unit: 'piece',
        estimated_hours: 24,
        is_active: true
      });
    }
    setShowCleaningServiceModal(true);
  };

  const handleCloseCleaningService = () => {
    setShowCleaningServiceModal(false);
    setEditingCleaningService(null);
  };

  const handleCleaningServiceSubmit = async (e) => {
    e.preventDefault();
    if (!cleaningServiceFormData.name_ar) {
      showToast(t('services.nameArRequired') || 'الرجاء إدخال اسم الخدمة بالعربية', 'warning');
      return;
    }
    try {
      if (cleaningServiceModalMode === 'add') {
        const res = await servicesAPI.create(cleaningServiceFormData);
        if (res.success) {
          showToast(t('services.addSuccess') || 'تم إضافة الخدمة بنجاح', 'success');
        }
      } else {
        const res = await servicesAPI.update(editingCleaningService.id, cleaningServiceFormData);
        if (res.success) {
          showToast(t('services.updateSuccess') || 'تم تحديث الخدمة بنجاح', 'success');
        }
      }
      handleCloseCleaningService();
      loadServices();
    } catch (err) {
      console.error(err);
      showToast(t('services.saveError') || 'خطأ أثناء حفظ الخدمة', 'error');
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
      prices: initialPrices,
      excludedServiceIds: []
    });
    setNewSizeInput('');
    setShowItemTypeModal(true);
  };

  const handleOpenEditItemType = (itemType) => {
    setItemTypeModalMode('edit');
    setSelectedItemTypeId(itemType.id);
    
    // Detect which active services have no price entry at all in this itemType
    const excludedServiceIds = [];
    services.forEach(s => {
      const hasPrice = (itemType.sizes || []).some(sz => 
        (sz.prices || []).some(pr => pr.service_id === s.id)
      );
      if (!hasPrice) {
        excludedServiceIds.push(s.id);
      }
    });

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
      prices: mappedPrices,
      excludedServiceIds: excludedServiceIds
    });
    setNewSizeInput('');
    setShowItemTypeModal(true);
  };

  const handleAddSizeChip = (e) => {
    e.preventDefault();
    const cleanSizeName = newSizeInput.trim();
    if (!cleanSizeName) return;
    
    if (itemTypeFormData.sizes.includes(cleanSizeName)) {
      showToast(t('services.sizeExists') || 'هذا الحجم مضاف بالفعل للقطعة', 'warning');
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
      showToast(t('services.minOneSize') || 'يجب الاحتفاظ بحجم واحد على الأقل للقطعة', 'warning');
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
      showToast(t('services.adminRequired') || 'عذراً، هذا الإجراء يتطلب صلاحيات مدير النظام', 'error');
      return;
    }

    if (!itemTypeFormData.name_ar.trim()) {
      showToast(t('services.nameArRequired') || 'الرجاء إدخال اسم القطعة بالعربية', 'warning');
      return;
    }

    try {
      let res;
      const cleanedPrices = {};
      itemTypeFormData.sizes.forEach(sz => {
        cleanedPrices[sz] = {};
        const sizePrices = itemTypeFormData.prices[sz] || {};
        Object.keys(sizePrices).forEach(svcId => {
          const numericSvcId = parseInt(svcId);
          if (itemTypeFormData.excludedServiceIds && !itemTypeFormData.excludedServiceIds.includes(numericSvcId)) {
            const val = parseFloat(sizePrices[svcId]);
            cleanedPrices[sz][svcId] = !isNaN(val) && val >= 0 ? val : 0;
          }
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
        showToast(itemTypeModalMode === 'add' ? t('services.addSuccess') || 'تم إضافة نوع القطعة وشبكة الأسعار بنجاح' : t('services.updateSuccess') || 'تم تحديث نوع القطعة بنجاح', 'success');
        setShowItemTypeModal(false);
        loadItemTypes();
      } else {
        showToast(res.message || t('customers.saveFail') || 'حدث خطأ أثناء الحفظ', 'error');
      }
    } catch (err) {
      showToast(err.message || t('customers.networkError') || 'حدث خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleDeleteItemType = async (id) => {
    if (!isAdmin) {
      showToast(t('services.adminRequired') || 'عذراً، هذا الإجراء يتطلب صلاحيات مدير النظام', 'error');
      return;
    }
    if (!window.confirm(t('services.confirmDelete') || 'هل أنت متأكد من رغبتك في حذف نوع القطعة هذا بالكامل؟ سيتم مسح الأحجام والأسعار المرتبطة بها!')) {
      return;
    }
    try {
      const res = await itemTypesAPI.delete(id);
      if (res.success) {
        showToast(t('services.deleteSuccess') || 'تم حذف نوع القطعة بنجاح', 'success');
        loadItemTypes();
      } else {
        showToast(res.message || t('services.deleteFail') || 'فشل في حذف نوع القطعة', 'error');
      }
    } catch (err) {
      showToast(err.message || t('services.deleteError') || 'خطأ أثناء حذف نوع القطعة', 'error');
    }
  };

  const exportToCSV = () => {
    const typesToExport = Array.isArray(itemTypes) ? itemTypes : [];
    if (typesToExport.length === 0) {
      showToast(t('services.exportEmpty') || 'لا توجد قطع ملابس لتصديرها', 'warning');
      return;
    }

    const activeServices = (Array.isArray(services) ? services : []).filter(s => s.is_active);
    const headers = [
      t('services.colId') || 'رقم القطعة',
      t('services.colNameAr') || 'اسم القطعة بالعربية',
      t('services.colNameEn') || 'اسم القطعة بالإنجليزية',
      t('services.colSize') || 'الحجم',
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
          formatCSVField(t('services.generalSize') || 'عام'),
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
    showToast(t('services.exportSuccess') || 'تم تصدير شبكة أسعار القطع والأحجام بنجاح إلى ملف إكسل (CSV) 📊', 'success');
  };

  return (
    <div className="page services-page">
      <div className="page-header-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">{t('services.title') || 'إدارة أنواع الملابس والأحجام'}</h1>
            <p className="page-subtitle">{t('services.subtitle') || 'تحديد أنواع الملابس والأحجام وشبكة الأسعار للخدمات المختلفة'}</p>
          </div>
          <div className="flex gap-sm items-center">
            <Button
              variant="secondary"
              onClick={exportToCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={18} />
              {t('services.exportCSVBtn') || 'تصدير ملف إكسل'}
            </Button>
            {isAdmin && (
              <Button 
                variant="primary" 
                onClick={handleOpenAddItemType}
              >
                <Plus size={18} style={{ marginLeft: '8px' }} />
                {t('services.addNewBtn') || 'إضافة نوع قطعة جديد'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Top KPI Summary Ribbon */}
      {(() => {
        const totalSizesCount = itemTypes.reduce((acc, curr) => acc + (curr.sizes || []).length, 0);
        const activeServicesCount = services.filter(s => s.is_active).length;
        return (
          <div className="services-kpi-ribbon mb-md">
            <div className="kpi-box">
              <div className="kpi-icon-wrapper indigo-glow">
                <Tags size={22} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">{t('services.definedTypes') || 'أنواع الملابس المُعرفة'}</span>
                <h4 className="kpi-value">{itemTypes.length} <small>{t('services.piece') || 'قطعة'}</small></h4>
              </div>
            </div>

            <div className="kpi-box">
              <div className="kpi-icon-wrapper emerald-glow">
                <Sparkles size={22} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">{t('services.totalSizes') || 'إجمالي الأحجام والخيارات'}</span>
                <h4 className="kpi-value">{totalSizesCount} <small>{t('services.sizeInMatrix') || 'حجم في الشبكة'}</small></h4>
              </div>
            </div>

            <div className="kpi-box">
              <div className="kpi-icon-wrapper amber-glow">
                <ShieldAlert size={22} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">{t('services.availableServices') || 'الخدمات المتاحة للغسيل'}</span>
                <h4 className="kpi-value">{activeServicesCount} <small>{t('services.activeService') || 'خدمة نشطة'}</small></h4>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Search Bar & Control Panel */}
      {/* Services Section */}
      <div className="cleaning-services-section mb-lg">
        <div className="section-header flex justify-between items-center mb-md">
          <h2 className="section-title text-lg font-bold flex items-center gap-sm">
            <Sparkles size={20} className="text-primary" />
            طرق التنظيف (الأعمدة)
          </h2>
          {isAdmin && (
            <Button variant="secondary" onClick={() => handleOpenCleaningService('add')}>
              <Plus size={16} /> إضافة خدمة
            </Button>
          )}
        </div>
        <div className="cleaning-services-grid" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {services.map(s => (
            <div 
              key={s.id} 
              className={`service-chip ${!s.is_active ? 'inactive' : ''}`}
              onClick={() => isAdmin && handleOpenCleaningService('edit', s)}
              style={{
                background: 'var(--bg-card)', padding: '10px 16px', borderRadius: '8px', 
                border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px',
                cursor: isAdmin ? 'pointer' : 'default', transition: 'all 0.2s'
              }}
            >
              <span style={{ fontWeight: 500, color: s.is_active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {s.name_ar}
              </span>
              {!s.is_active && <span style={{ fontSize: '10px', background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>معطل</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="services-search-control-card mb-md">
        <div className="search-input-wrapper">
          <Search size={19} className="search-icon-left" />
          <input
            type="text"
            className="search-input-clean"
            placeholder={t('services.searchPlaceholder') || 'ابحث سريعاً باسم القطعة أو الحجم (مثال: بدلة، بطانية، سجاد، عادي)...'}
            value={itemTypeSearch}
            onChange={(e) => setItemTypeSearch(e.target.value)}
          />
          {itemTypeSearch && (
            <button 
              type="button" 
              className="clear-search-btn" 
              onClick={() => setItemTypeSearch('')}
              title={t('services.clearSearch') || "مسح البحث"}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {loadingItemTypes ? (
        <div className="flex justify-center items-center" style={{ height: '200px' }}>
          <LoadingSpinner />
        </div>
      ) : !Array.isArray(itemTypes) || itemTypes.length === 0 ? (
        <EmptyState 
          title={t('services.emptyStateTitle') || 'لا توجد قطع ملابس'} 
          message={t('services.emptyStateMsg') || 'لم نجد أي أنواع قطع ملابس معرفة بالنظام حالياً. اضغط لإضافة نوع قطعة جديد.'}
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
            title={t('services.noResultsTitle') || 'لا توجد نتائج'} 
            message={t('services.noResultsMsg') || 'لم نجد أي قطع ملابس أو أحجام تطابق بحثك الحالي.'}
          />
        ) : (
          <div className="services-grid mt-md">
            {filteredItemTypes.map((itemType) => {
              const sortedCardSizes = sortSizes(itemType.sizes || []);
              const cardServices = services.filter(s => 
                s.is_active && 
                (itemType.sizes || []).some(sz => 
                  (sz.prices || []).some(pr => pr.service_id === s.id)
                )
              );
              const displayServices = cardServices.length > 0 ? cardServices : services.filter(s => s.is_active);

              return (
                <Card 
                  key={itemType.id} 
                  className="service-card item-type-card-premium"
                  onClick={() => isAdmin && handleOpenEditItemType(itemType)}
                  style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                >
                  {/* Top Header of Card */}
                  <div className="card-top-header">
                    <div className="header-title-section">
                      <div className="card-icon-badge">
                        <Tags size={22} />
                      </div>
                      <div>
                        <h3 className="card-item-title">{i18n.language === 'en' && itemType.name_en ? itemType.name_en : itemType.name_ar}</h3>
                        <span className="card-item-subtitle">{i18n.language === 'ar' ? itemType.name_en : itemType.name_ar}</span>
                      </div>
                    </div>

                    <div className="header-actions-right">
                      <span className="size-count-pill">
                        {sortedCardSizes.length} {sortedCardSizes.length === 1 ? (t('services.sizeSingular') || 'حجم') : (t('services.sizePlural') || 'أحجام')}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          className="quick-delete-icon-btn"
                          onClick={(e) => { e.stopPropagation(); handleDeleteItemType(itemType.id); }}
                          title={t('services.deleteItemTypeTitle') || "حذف هذا النوع بالكامل"}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sizes Section */}
                  <div className="card-sizes-section mt-sm">
                    <span className="section-mini-label">{t('services.availableSizes') || 'الأحجام المتوفرة للقطعة:'}</span>
                    <div className="size-badges-container">
                      {sortedCardSizes.map(sz => {
                        const sName = typeof sz === 'object' && sz !== null ? (sz.size_name || '-') : String(sz);
                        return <span key={typeof sz === 'object' && sz !== null ? (sz.id || sName) : sName} className="size-pill-badge">{sName}</span>;
                      })}
                    </div>
                  </div>

                  {/* Price Preview Table */}
                  <div className="item-price-preview-table-wrapper mt-md">
                    <table className="price-preview-table">
                      <thead>
                        <tr>
                          <th style={{ minWidth: '75px' }}>{t('services.colSize') || 'الحجم'}</th>
                          {displayServices.map(svc => (
                            <th key={svc.id} style={{ minWidth: '95px', textAlign: 'center' }}>{i18n.language === 'en' && svc.name_en ? svc.name_en : svc.name_ar}</th>
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
                              {displayServices.map(svc => {
                                const priceObj = sPrices.find(p => p.service_id === svc.id);
                                const priceVal = parseFloat(priceObj ? priceObj.price : 0) || 0;
                                return (
                                  <td key={svc.id} style={{ textAlign: 'center' }}>
                                    {priceVal > 0 ? (
                                      <span className="price-badge-active">
                                        {priceVal.toFixed(2)} <small>{settings?.currency || 'ر.س'}</small>
                                      </span>
                                    ) : (
                                      <span className="price-badge-zero">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Prominent Action Button inside Card Footer */}
                  {isAdmin && (
                    <div className="card-premium-footer mt-md">
                      <Button
                        variant="primary"
                        className="edit-full-pricing-btn"
                        onClick={(e) => { e.stopPropagation(); handleOpenEditItemType(itemType); }}
                      >
                        <Edit2 size={16} />
                        <span>{t('services.editPricesBtn') || 'تعديل الأسعار والأحجام'}</span>
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
        title={itemTypeModalMode === 'add' ? (t('services.addModalTitle') || 'إضافة قطعة وشبكة أسعار جديدة') : (t('services.editModalTitle') || 'تعديل أسعار القطعة وأحجامها')}
        width="940px"
        size="xl"
      >
        <form onSubmit={handleSaveItemType}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('services.nameArLabel') || 'اسم القطعة بالعربية *'}</label>
              <input
                type="text"
                className="form-input"
                required
                value={itemTypeFormData.name_ar}
                onChange={(e) => setItemTypeFormData({ ...itemTypeFormData, name_ar: e.target.value })}
                placeholder={t('services.nameArPlaceholder') || 'مثال: سجادة، بطانية، فستان'}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('services.nameEnLabel') || 'الاسم بالإنجليزية'}</label>
              <input
                type="text"
                className="form-input"
                value={itemTypeFormData.name_en}
                onChange={(e) => setItemTypeFormData({ ...itemTypeFormData, name_en: e.target.value })}
                placeholder={t('services.nameEnPlaceholder') || 'مثال: Carpet, Blanket, Dress'}
              />
            </div>
          </div>

          {/* Dynamic Sizes management input tags chips */}
          <div className="form-group">
            <label className="form-label">{t('services.sizesLabel') || 'الأحجام المتوفرة للقطعة (اضغط Enter لإضافة الحجم) *'}</label>
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
                  placeholder={t('services.sizePlaceholder') || 'اكتب اسم الحجم (مثال: كبير، صغير، 3x4 متر)'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSizeChip(e);
                    }
                  }}
                />
                <Button variant="secondary" type="button" onClick={handleAddSizeChip}>
                  {t('services.addBtn') || 'إضافة'}
                </Button>
              </div>
            </div>
          </div>

          {/* Pricing Grid Matrix */}
          <div className="form-group mt-md">
            <label className="form-label font-bold text-primary flex items-center">
              <ShieldAlert size={16} style={{ marginLeft: '6px' }} />
              {t('services.matrixLabel') || 'شبكة أسعار الخدمات لكل حجم مضاف (ر.س)'}
            </label>
            
            <div className="pricing-grid-matrix-container mt-sm">
              {itemTypeFormData.sizes.length === 0 ? (
                <p className="text-secondary text-sm">{t('services.matrixEmpty') || 'الرجاء إدخال حجم واحد على الأقل لتحديد الأسعار له.'}</p>
              ) : (
                <div className="matrix-scroll-wrapper">
                  <table className="pricing-matrix-table">
                    <thead>
                      <tr>
                        <th>{t('services.colSize') || 'الحجم'}</th>
                        {services.filter(s => s.is_active && !(itemTypeFormData.excludedServiceIds || []).includes(s.id)).map(svc => (
                          <th key={svc.id}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span>{i18n.language === 'en' && svc.name_en ? svc.name_en : svc.name_ar}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setItemTypeFormData(prev => ({
                                    ...prev,
                                    excludedServiceIds: [...(prev.excludedServiceIds || []), svc.id]
                                  }));
                                }}
                                title="استبعاد الخدمة"
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1.2rem', padding: '0 4px', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}
                              >
                                &times;
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortSizes(itemTypeFormData.sizes).map(sizeName => (
                        <tr key={sizeName}>
                          <td className="size-name-col font-bold">{sizeName}</td>
                          {services.filter(s => s.is_active && !(itemTypeFormData.excludedServiceIds || []).includes(s.id)).map(svc => {
                            let currentVal = itemTypeFormData.prices[sizeName] && itemTypeFormData.prices[sizeName][svc.id] !== undefined
                              ? itemTypeFormData.prices[sizeName][svc.id]
                              : '';
                            if (currentVal === 0 || currentVal === '0.00' || currentVal === '0') currentVal = '';
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
              {t('services.cancelBtn') || 'إلغاء'}
            </Button>
            <Button variant="primary" type="submit">
              {t('services.saveBtn') || 'حفظ القطعة والأسعار'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2) Cleaning Service Modal */}
      <Modal 
        isOpen={showCleaningServiceModal} 
        onClose={handleCloseCleaningService}
        title={cleaningServiceModalMode === 'add' ? 'إضافة خدمة جديدة' : 'تعديل الخدمة'}
        width="620px"
      >
        <form onSubmit={handleCleaningServiceSubmit}>

          <div className="form-row" style={{ marginBottom: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">الاسم بالعربية *</label>
              <input
                type="text"
                className="form-input"
                value={cleaningServiceFormData.name_ar}
                onChange={(e) => setCleaningServiceFormData(p => ({...p, name_ar: e.target.value}))}
                required
                placeholder="مثال: غسيل عادي"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">الاسم بالإنجليزية</label>
              <input
                type="text"
                className="form-input"
                dir="ltr"
                style={{ textAlign: 'left' }}
                value={cleaningServiceFormData.name}
                onChange={(e) => setCleaningServiceFormData(p => ({...p, name: e.target.value}))}
                placeholder="e.g. Regular Wash"
              />
            </div>
          </div>

          {/* Unit + Active in one compact row */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '20px' }}>
            <div style={{ flex: '0 0 auto', width: '180px' }}>
              <label className="form-label">وحدة القياس</label>
            <div className="table-select-container" ref={unitDropdownRef} style={{ position: 'relative' }}>
              <select
                className="form-select"
                value={cleaningServiceFormData.unit}
                onChange={(e) => setCleaningServiceFormData(p => ({...p, unit: e.target.value}))}
                style={{ width: '100%' }}
              >
                <option value="piece">قطعة (Piece)</option>
                <option value="kg">كيلوجرام (Kg)</option>
              </select>
            </div>
            </div>

            <div style={{ flex: 1, paddingBottom: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', paddingTop: '22px', marginBottom: 0 }}>
                <span className="form-label" style={{ marginBottom: 0 }}>الخدمة نشطة</span>
                {/* Toggle Switch */}
                <div
                  onClick={() => setCleaningServiceFormData(p => ({...p, is_active: !p.is_active}))}
                  style={{
                    position: 'relative', width: '44px', height: '24px', borderRadius: '999px',
                    background: cleaningServiceFormData.is_active ? 'var(--primary)' : '#d1d5db',
                    transition: 'background 0.25s', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '3px',
                    left: cleaningServiceFormData.is_active ? '23px' : '3px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'white', transition: 'left 0.25s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }} />
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-between mt-sm">
            <Button variant="secondary" type="button" onClick={handleCloseCleaningService}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit">
              {cleaningServiceModalMode === 'add' ? 'إضافة الخدمة' : 'حفظ التعديلات'}
            </Button>
          </div>

        </form>
      </Modal>
    </div>
  );
}
