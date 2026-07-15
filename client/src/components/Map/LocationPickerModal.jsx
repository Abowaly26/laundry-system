import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Navigation, 
  Search, 
  X, 
  Check, 
  Layers, 
  Compass, 
  Home, 
  Building, 
  Hash, 
  Map as MapIcon,
  AlertCircle
} from 'lucide-react';
import './LocationPickerModal.css';

// Fix leaflet default icon broken paths in Vite/React environments
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * LocationPickerModal (Senior-Level Interactive Map Address Picker)
 * 
 * يتيح للعامل أو الكاشير تحديد عنوان العميل بدقة عالية وسرعة فائقة:
 * - يفتح تلقائياً متمركزاً حول موقع الكاشير / العامل باستخدام الـ GPS المتصفح.
 * - يوضح نقطتين على الخريطة: موقع الكاشير (نبض أزرق) وموقع العميل المحدد (دبوس أحمر قابل للسحب).
 * - بحث ذكي وفوري للأحياء والشوارع مع اقتراحات مباشرة.
 * - Reverse Geocoding: جلب اسم العنوان والحي تلقائياً عند النقر أو سحب الدبوس.
 * - حساب المسافة التقريبية بالكيلومتر ووقت التوصيل بين المغسلة وموقع العميل.
 */
const LocationPickerModal = ({ 
  isOpen, 
  onClose, 
  onSelectLocation, 
  initialLocation = null, 
  initialAddress = '',
  laundryLocation = { lat: 24.7136, lng: 46.6753 } // الافتراضي الرياض في حال تعذر الوصول للـ GPS
}) => {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const cashierMarkerRef = useRef(null);

  // إحداثيات الكاشير/العامل
  const [cashierCoords, setCashierCoords] = useState(laundryLocation);
  const [cashierAccuracy, setCashierAccuracy] = useState(null);

  // إحداثيات العميل المحددة حالياً
  const [customerCoords, setCustomerCoords] = useState(initialLocation || null);

  // حالة العنوان النصي وتفاصيل المبنى
  const [addressText, setAddressText] = useState(initialAddress || '');
  const [buildingNo, setBuildingNo] = useState('');
  const [aptNo, setAptNo] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // البحث الفوري
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // طبقة الخريطة الحالية
  const [activeTileLayer, setActiveTileLayer] = useState('voyager');
  const tileLayerRef = useRef(null);

  // طبقات الخرائط المختلفة
  const TILE_LAYERS = {
    voyager: {
      name: 'خريطة حديثة',
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '© OpenStreetMap contributors © CARTO'
    },
    positron: {
      name: 'خريطة فاتحة',
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '© OpenStreetMap contributors © CARTO'
    },
    dark: {
      name: 'خريطة داكنة',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '© OpenStreetMap contributors © CARTO'
    },
    osm: {
      name: 'شوارع قياسية',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors'
    }
  };

  // 1. جلب إحداثيات الكاشير أو العامل عند فتح المودال
  useEffect(() => {
    if (!isOpen) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCashierCoords(coords);
          setCashierAccuracy(position.coords.accuracy);

          // إذا لم يكن هناك موقع عميل محدد مسبقاً، نجعل الدبوس الأولي عند أو بالقرب من موقع العامل
          if (!customerCoords) {
            setCustomerCoords(coords);
            if (!addressText) {
              fetchAddressFromCoords(coords.lat, coords.lng);
            }
          }
        },
        (error) => {
          console.warn('Geolocation error or denied. Using default/laundry coordinates:', error.message);
          if (!customerCoords) {
            setCustomerCoords(laundryLocation);
            if (!addressText) {
              fetchAddressFromCoords(laundryLocation.lat, laundryLocation.lng);
            }
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      if (!customerCoords) {
        setCustomerCoords(laundryLocation);
      }
    }
  }, [isOpen]);

  // 2. التهيئة وإنشاء الخريطة عند الفتح
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const initialCenter = customerCoords || cashierCoords || laundryLocation;

    // تهيئة الخريطة مرة واحدة فقط
    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [initialCenter.lat, initialCenter.lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'topleft' }).addTo(map);

      // إضافة طبقة البلاطات (Tiles)
      const layerInfo = TILE_LAYERS[activeTileLayer];
      tileLayerRef.current = L.tileLayer(layerInfo.url, {
        maxZoom: 19,
        attribution: layerInfo.attribution
      }).addTo(map);

      // إضافة دبوس الكاشير (نبض رادار)
      if (cashierCoords) {
        const cashierIcon = L.divIcon({
          className: 'custom-pin-wrapper',
          html: `
            <div class="cashier-pin-container">
              <div class="cashier-radar-ring"></div>
              <div class="cashier-pin-dot">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              </div>
              <span class="cashier-pin-label">موقعك الحالي / الكاشير</span>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        });

        cashierMarkerRef.current = L.marker([cashierCoords.lat, cashierCoords.lng], {
          icon: cashierIcon,
          interactive: false
        }).addTo(map);
      }

      // إضافة دبوس العميل المختار القابل للسحب
      const activeCoords = customerCoords || initialCenter;
      const customerIcon = L.divIcon({
        className: 'custom-pin-wrapper',
        html: `
          <div class="customer-pin-container">
            <div class="customer-pin-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div class="customer-pin-shadow"></div>
            <span class="customer-pin-label">موقع العميل المحدد</span>
          </div>
        `,
        iconSize: [42, 48],
        iconAnchor: [21, 48]
      });

      customerMarkerRef.current = L.marker([activeCoords.lat, activeCoords.lng], {
        icon: customerIcon,
        draggable: true
      }).addTo(map);

      // مستمع حركة سحب دبوس العميل
      customerMarkerRef.current.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        setCustomerCoords({ lat: pos.lat, lng: pos.lng });
        fetchAddressFromCoords(pos.lat, pos.lng);
      });

      // مستمع النقر على الخريطة لتغيير مكان الدبوس فوراً
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setCustomerCoords({ lat, lng });
        if (customerMarkerRef.current) {
          customerMarkerRef.current.setLatLng([lat, lng]);
        }
        fetchAddressFromCoords(lat, lng);
      });

      mapRef.current = map;

      // ✅ الإصلاح الأساسي: نعطي الـ DOM وقت يرسم الـ Modal كاملاً
      // قبل ما Leaflet يحسب الأبعاد — بدونه الـ tiles بتظهر فاضية
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          mapRef.current.setView([initialCenter.lat, initialCenter.lng], 15);
        }
      }, 150);
    }

    // تنظيف الخريطة عند الإغلاق أو تغيير التركيب
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        customerMarkerRef.current = null;
        cashierMarkerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, [isOpen]);

  // تحديث مكان دبوس الكاشير على الخريطة إذا تم تغييره بعد التهيئة
  useEffect(() => {
    if (mapRef.current && cashierCoords && !cashierMarkerRef.current) {
      const cashierIcon = L.divIcon({
        className: 'custom-pin-wrapper',
        html: `
          <div class="cashier-pin-container">
            <div class="cashier-radar-ring"></div>
            <div class="cashier-pin-dot">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            </div>
            <span class="cashier-pin-label">موقعك الحالي / الكاشير</span>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      cashierMarkerRef.current = L.marker([cashierCoords.lat, cashierCoords.lng], {
        icon: cashierIcon,
        interactive: false
      }).addTo(mapRef.current);
    }
  }, [cashierCoords]);

  // تحديث طبقة البلاطات (Tiles) عند التبديل
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(TILE_LAYERS[activeTileLayer].url);
  }, [activeTileLayer]);

  // 3. جلب العنوان من الإحداثيات (Reverse Geocoding)
  const fetchAddressFromCoords = async (lat, lng) => {
    setIsReverseGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`
      );
      const data = await response.json();
      if (data && data.display_name) {
        // تنظيف وتلخيص العنوان العربي بدقة
        const addr = data.address || {};
        const road = addr.road || addr.pedestrian || addr.street || '';
        const suburb = addr.suburb || addr.neighbourhood || addr.residential || addr.district || '';
        const city = addr.city || addr.town || addr.state || '';

        let formatted = [suburb, road, city].filter(Boolean).join('، ');
        if (!formatted) {
          formatted = data.display_name.split(',').slice(0, 3).join('، ');
        }
        setAddressText(formatted);
      }
    } catch (err) {
      console.error('Reverse Geocoding Error:', err);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // 4. البحث التلقائي الفوري أثناء كتابة العنوان
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&accept-language=ar&limit=5&addressdetails=1`
        );
        const data = await response.json();
        setSearchResults(data || []);
      } catch (err) {
        console.error('Search Geocoding Error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // اختيار أحد نتائج البحث
  const handleSelectSuggestion = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    setCustomerCoords({ lat, lng });
    setAddressText(item.display_name.split(',').slice(0, 3).join('، '));
    setSearchResults([]);
    setSearchQuery('');

    if (mapRef.current && customerMarkerRef.current) {
      mapRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
      customerMarkerRef.current.setLatLng([lat, lng]);
    }
  };

  // النقر للقفز إلى موقع العامل/الكاشير
  const handleJumpToCashier = () => {
    if (!mapRef.current || !cashierCoords) return;
    mapRef.current.flyTo([cashierCoords.lat, cashierCoords.lng], 16, { duration: 1 });
  };

  // النقر للقفز إلى موقع العميل المحدد حالياً
  const handleJumpToCustomer = () => {
    if (!mapRef.current || !customerCoords) return;
    mapRef.current.flyTo([customerCoords.lat, customerCoords.lng], 17, { duration: 1 });
  };

  // 5. حساب المسافة بالكيلومتر ووقت التوصيل التقريبي (Haversine Formula)
  const calculateDistance = () => {
    if (!cashierCoords || !customerCoords) return null;
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (customerCoords.lat - cashierCoords.lat) * (Math.PI / 180);
    const dLon = (customerCoords.lng - cashierCoords.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(cashierCoords.lat * (Math.PI / 180)) *
        Math.cos(customerCoords.lat * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    
    // تقدير وقت الوصول (بمعدل سرعة 30 كم/ساعة داخل المدينة + 3 دقائق تجهيز)
    const estimatedMinutes = Math.max(5, Math.round((distanceKm / 30) * 60 + 3));

    return {
      distanceKm: distanceKm.toFixed(1),
      estimatedMinutes
    };
  };

  const distanceStats = calculateDistance();

  // 6. تأكيد وحفظ اختيار الموقع
  const handleConfirm = () => {
    if (!customerCoords) return;

    let fullFormattedAddress = addressText || 'عنوان محدد على الخريطة';
    const extraParts = [];
    if (buildingNo) extraParts.push(`مبنى/منزل: ${buildingNo}`);
    if (aptNo) extraParts.push(`شقة/دور: ${aptNo}`);
    if (landmark) extraParts.push(`معلم قريب: ${landmark}`);

    if (extraParts.length > 0) {
      fullFormattedAddress = `${fullFormattedAddress} (${extraParts.join(' - ')})`;
    }

    onSelectLocation({
      address: fullFormattedAddress,
      latitude: customerCoords.lat,
      longitude: customerCoords.lng,
      distanceKm: distanceStats ? parseFloat(distanceStats.distanceKm) : 0,
      buildingNo,
      aptNo,
      landmark
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="location-picker-overlay" onClick={onClose}>
      <div className="location-picker-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="location-picker-header">
          <div>
            <h3>
              <MapPin size={22} />
              تحديد العنوان على الخريطة التفاعلية
            </h3>
            <p>يتم الفتح والتمركز التلقائي حسب موقعك الحالي (الكاشير / المغسلة) لسهولة تحديد العميل</p>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Search Bar & Auto-Suggest */}
        <div className="location-picker-search-bar">
          <div className="search-input-wrapper">
            <Search size={18} className="search-input-icon" />
            <input
              type="text"
              placeholder="ابحث باسم الحي، الشارع، أو المدينة (مثال: حي الصحافة، الرياض)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isSearching && <div className="geocoding-spinner" style={{ position: 'absolute', insetInlineEnd: '2.5rem' }}></div>}
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Search Suggestions Dropdown */}
          {searchResults.length > 0 && (
            <ul className="map-search-suggestions">
              {searchResults.map((item, idx) => (
                <li key={idx} onClick={() => handleSelectSuggestion(item)}>
                  <MapPin size={16} className="sug-icon" />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>{item.display_name.split(',')[0]}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.display_name}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Map Body Area */}
        <div className="location-picker-body">
          <div ref={mapContainerRef} className="map-container-inner" />

          {/* Floating Controls Overlay */}
          <div className="map-floating-controls">
            <button
              type="button"
              className="map-control-btn cashier-locate"
              onClick={handleJumpToCashier}
              title="العودة لموقعي الحالي / الكاشير"
            >
              <Navigation size={16} />
              <span>موقعي (الكاشير)</span>
            </button>
            
            {customerCoords && (
              <button
                type="button"
                className="map-control-btn"
                onClick={handleJumpToCustomer}
                title="التركيز على دبوس العميل المختار"
              >
                <Compass size={16} />
                <span>دبوس العميل</span>
              </button>
            )}
          </div>

          {/* Layer Pills Switcher */}
          <div className="map-layers-switch">
            {Object.keys(TILE_LAYERS).map((key) => (
              <button
                key={key}
                type="button"
                className={`layer-pill ${activeTileLayer === key ? 'active' : ''}`}
                onClick={() => setActiveTileLayer(key)}
              >
                <Layers size={13} />
                {TILE_LAYERS[key].name}
              </button>
            ))}
          </div>

          {/* Distance Stats Pill */}
          {distanceStats && (
            <div className="distance-stats-card">
              <div className="stat-row">
                <span>📏 المسافة عن المغسلة:</span>
                <span className="stat-val">{distanceStats.distanceKm} كم</span>
              </div>
              <div className="stat-row">
                <span>⏱️ زمن الوصول التقريبي:</span>
                <span className="stat-val">~{distanceStats.estimatedMinutes} دقيقة</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer & Details Form */}
        <div className="location-picker-footer">
          {/* Selected Address Box */}
          <div className="selected-address-summary">
            <MapIcon size={24} className="addr-icon" />
            <div className="addr-text">
              <h4>العنوان المحدد حالياً (جلب تلقائي أو تعديل يدوي)</h4>
              {isReverseGeocoding ? (
                <p style={{ color: '#3b82f6' }}>⏳ جلب تفاصيل الموقع من الخريطة...</p>
              ) : (
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', marginTop: '0.35rem', fontWeight: 600 }}
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="انقر على الخريطة أو اسحب الدبوس لتحديد العنوان تلقائياً..."
                />
              )}
            </div>
          </div>

          {/* Extra Details Grid */}
          <div className="address-details-grid">
            <div className="address-field-group">
              <label><Building size={14} style={{ display: 'inline', marginInlineEnd: '4px' }} /> رقم المبنى / المنزل</label>
              <input
                type="text"
                placeholder="مثال: مبنى 14"
                value={buildingNo}
                onChange={(e) => setBuildingNo(e.target.value)}
              />
            </div>
            <div className="address-field-group">
              <label><Hash size={14} style={{ display: 'inline', marginInlineEnd: '4px' }} /> رقم الدور / الشقة</label>
              <input
                type="text"
                placeholder="مثال: الدور 2 - شقة 6"
                value={aptNo}
                onChange={(e) => setAptNo(e.target.value)}
              />
            </div>
            <div className="address-field-group">
              <label><AlertCircle size={14} style={{ display: 'inline', marginInlineEnd: '4px' }} /> معلم مميز قريب (اختياري)</label>
              <input
                type="text"
                placeholder="مثال: بجوار صيدلية النهدي"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="location-picker-actions">
            <button type="button" className="btn-cancel-location" onClick={onClose}>
              إلغاء التحديد
            </button>
            <button type="button" className="btn-confirm-location" onClick={handleConfirm} disabled={!customerCoords || !addressText}>
              <Check size={18} />
              <span>تأكيد واعتماد عنوان العميل</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LocationPickerModal;
