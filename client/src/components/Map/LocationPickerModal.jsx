import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import {
  MapPin, Navigation, Search, X, Check,
  Layers, Compass, Building, Hash, AlertCircle, Plus, Minus, Map as MapIcon
} from 'lucide-react';
import './LocationPickerModal.css';

// ─── Fix Leaflet default icon paths broken by Vite asset hashing ─────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─── Tile Layer Definitions (outside component to avoid re-creation) ──────────
const TILE_LAYERS = {
  voyager: {
    name: 'خرائط جوجل',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ar',
  },
  osm: {
    name: 'قمر صناعي',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=ar',
  },
};

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 }; // الرياض

// ─── Helper: build cashier divIcon HTML ──────────────────────────────────────
const makeCashierIcon = () =>
  L.divIcon({
    className: 'custom-pin-wrapper',
    html: `<div class="cashier-pin-container">
      <div class="cashier-radar-ring"></div>
      <div class="cashier-pin-dot">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
      </div>
      <span class="cashier-pin-label">موقعك الحالي</span>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

// ─── Helper: build customer draggable divIcon HTML ────────────────────────────
const makeCustomerIcon = (label = 'موقع العميل') =>
  L.divIcon({
    className: 'custom-pin-wrapper',
    html: `<div class="customer-pin-container">
      <div class="customer-pin-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
      <div class="customer-pin-shadow"></div>
      <span class="customer-pin-label">${label}</span>
    </div>`,
    iconSize: [42, 48],
    iconAnchor: [21, 48],
  });

// ─── Haversine distance ───────────────────────────────────────────────────────
const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLon = (b.lng - a.lng) * (Math.PI / 180);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * (Math.PI / 180)) *
      Math.cos(b.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LocationPickerModal = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialLocation = null,
  initialAddress  = '',
  laundryLocation = DEFAULT_CENTER,
  mode = 'customer',
}) => {
  const targetLabel = mode === 'laundry' ? 'موقع المغسلة' : 'موقع العميل';

  // ── refs (survive re-renders, no re-render when changed) ──────────────────
  const mapContainerRef  = useRef(null);
  const mapRef           = useRef(null);
  const cashierMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const tileLayerRef     = useRef(null);
  const geocodingTimer   = useRef(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [cashierCoords,   setCashierCoords]   = useState(null);
  const [customerCoords,  setCustomerCoords]  = useState(null);
  const [addressText,     setAddressText]     = useState('');
  const [isGeocoding,     setIsGeocoding]     = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [searchResults,   setSearchResults]   = useState([]);
  const [isSearching,     setIsSearching]     = useState(false);
  const [activeLayer,     setActiveLayer]     = useState('voyager');
  const [gpsStatus,       setGpsStatus]       = useState('loading'); // 'loading' | 'ok' | 'denied'

  // ─────────────────────────────────────────────────────────────────────────
  // Reverse Geocoding (Nominatim)
  // ─────────────────────────────────────────────────────────────────────────
  const reverseGeocode = useCallback(async (lat, lng) => {
    setIsGeocoding(true);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`,
        { headers: { 'Accept-Language': 'ar' } }
      );
      const data = await res.json();
      if (data?.display_name) {
        const addr   = data.address || {};
        const suburb = addr.suburb || addr.neighbourhood || addr.residential || addr.district || '';
        const road   = addr.road   || addr.pedestrian   || addr.street       || '';
        const city   = addr.city   || addr.town         || addr.state        || '';
        const formatted = [suburb, road, city].filter(Boolean).join('، ')
          || data.display_name.split(',').slice(0, 3).join('، ');
        setAddressText(formatted);
      }
    } catch (e) {
      console.warn('Reverse geocode failed:', e);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Move the customer marker on the Leaflet map imperatively
  // ─────────────────────────────────────────────────────────────────────────
  const moveCustomerMarker = useCallback((lat, lng) => {
    if (customerMarkerRef.current) {
      customerMarkerRef.current.setLatLng([lat, lng]);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Add / update cashier marker imperatively
  // ─────────────────────────────────────────────────────────────────────────
  const addCashierMarker = useCallback((lat, lng) => {
    if (!mapRef.current) return;
    if (cashierMarkerRef.current) {
      cashierMarkerRef.current.setLatLng([lat, lng]);
    } else {
      cashierMarkerRef.current = L.marker([lat, lng], {
        icon: makeCashierIcon(),
        interactive: false,
        zIndexOffset: 100,
      }).addTo(mapRef.current);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RESET all state when modal opens
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    // Reset derived UI state each time the modal opens
    setAddressText(initialAddress || '');
    setSearchQuery('');
    setSearchResults([]);
    setGpsStatus('loading');

    const startCoords = initialLocation || laundryLocation;
    setCustomerCoords(startCoords);
    setCashierCoords(null);

    // Attempt GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const c = { lat: coords.latitude, lng: coords.longitude };
          setCashierCoords(c);
          setGpsStatus('ok');
          addCashierMarker(c.lat, c.lng);
        },
        (err) => {
          console.warn('GPS denied/failed:', err.message);
          setGpsStatus('denied');
          setCashierCoords(laundryLocation);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      setGpsStatus('denied');
      setCashierCoords(laundryLocation);
    }

    // If no initial address, fetch one
    if (!initialAddress && startCoords) {
      reverseGeocode(startCoords.lat, startCoords.lng);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ─────────────────────────────────────────────────────────────────────────
  // Initialise Leaflet map (once per open, destroyed on close)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      cashierMarkerRef.current = null;
      customerMarkerRef.current = null;
      tileLayerRef.current = null;
    }

    const center = initialLocation || laundryLocation;

    const map = L.map(mapContainerRef.current, {
      center:           [center.lat, center.lng],
      zoom:             15,
      zoomControl:      false,
      attributionControl: false,
    });

    // Tile layer
    tileLayerRef.current = L.tileLayer(TILE_LAYERS[activeLayer].url, {
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map);

    // Customer marker (draggable)
    customerMarkerRef.current = L.marker([center.lat, center.lng], {
      icon:     makeCustomerIcon(targetLabel),
      draggable: true,
      zIndexOffset: 200,
    }).addTo(map);

    customerMarkerRef.current.on('dragend', ({ target }) => {
      const { lat, lng } = target.getLatLng();
      setCustomerCoords({ lat, lng });
      reverseGeocode(lat, lng);
    });

    // Click on map → move customer marker
    map.on('click', ({ latlng: { lat, lng } }) => {
      setCustomerCoords({ lat, lng });
      customerMarkerRef.current?.setLatLng([lat, lng]);
      reverseGeocode(lat, lng);
    });

    mapRef.current = map;

    // ✅ Critical: let the modal finish painting, then fix tile blank
    const t1 = setTimeout(() => { map.invalidateSize(); }, 100);
    const t2 = setTimeout(() => { map.invalidateSize(); }, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        cashierMarkerRef.current = null;
        customerMarkerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  // run once when isOpen flips to true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ─────────────────────────────────────────────────────────────────────────
  // Keep customer marker in sync with state (when changed via search etc.)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (customerCoords) {
      moveCustomerMarker(customerCoords.lat, customerCoords.lng);
    }
  }, [customerCoords, moveCustomerMarker]);

  // ─────────────────────────────────────────────────────────────────────────
  // Add cashier marker when GPS coords arrive (after map is ready)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (cashierCoords && mapRef.current) {
      addCashierMarker(cashierCoords.lat, cashierCoords.lng);
    }
  }, [cashierCoords, addCashierMarker]);

  // ─────────────────────────────────────────────────────────────────────────
  // Switch tile layer
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(TILE_LAYERS[activeLayer].url);
    }
  }, [activeLayer]);

  // ─────────────────────────────────────────────────────────────────────────
  // Live search with debounce
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        let viewboxParams = '';
        if (laundryLocation && laundryLocation.lat && laundryLocation.lng) {
          const lat = parseFloat(laundryLocation.lat);
          const lng = parseFloat(laundryLocation.lng);
          const minLat = lat - 1.0;
          const maxLat = lat + 1.0;
          const minLng = lng - 1.0;
          const maxLng = lng + 1.0;
          viewboxParams = `&viewbox=${minLng},${maxLat},${maxLng},${minLat}&bounded=1`;
        }

        const res  = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&accept-language=ar&limit=6&addressdetails=1${viewboxParams}`
        );
        const data = await res.json();
        setSearchResults(data || []);
      } catch (e) {
        console.warn('Search failed:', e);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery, laundryLocation]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleSelectSuggestion = useCallback((item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const label = item.display_name.split(',').slice(0, 3).join('، ');

    setCustomerCoords({ lat, lng });
    setAddressText(label);
    setSearchResults([]);
    setSearchQuery('');

    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
      customerMarkerRef.current?.setLatLng([lat, lng]);
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  }, []);

  const handleJumpToCashier = useCallback(() => {
    if (mapRef.current && cashierCoords) {
      mapRef.current.flyTo([cashierCoords.lat, cashierCoords.lng], 16, { duration: 0.9 });
    }
  }, [cashierCoords]);

  const handleJumpToCustomer = useCallback(() => {
    if (mapRef.current && customerCoords) {
      mapRef.current.flyTo([customerCoords.lat, customerCoords.lng], 17, { duration: 0.9 });
    }
  }, [customerCoords]);

  const handleConfirm = useCallback(() => {
    if (!customerCoords) return;
    
    const fullAddress = addressText || 'موقع محدد على الخريطة';

    const distKm =
      laundryLocation
        ? parseFloat(haversineKm(laundryLocation, customerCoords).toFixed(2))
        : 0;

    onSelectLocation({
      address:    fullAddress,
      latitude:   customerCoords.lat,
      longitude:  customerCoords.lng,
      distanceKm: distKm,
      buildingNo: '',
      aptNo:      '',
      landmark:   '',
    });
    onClose();
  }, [customerCoords, addressText, laundryLocation, onSelectLocation, onClose]);

  // ─────────────────────────────────────────────────────────────────────────
  // Distance card data (computed, no memo needed — cheap calc)
  // ─────────────────────────────────────────────────────────────────────────
  const distKm = laundryLocation && customerCoords
    ? haversineKm(laundryLocation, customerCoords)
    : null;
  const distanceCard = distKm !== null
    ? { 
        km: distKm.toFixed(1), 
        mins: Math.max(5, Math.round((distKm / 30) * 60 + 3)),
        isOutOfBounds: distKm > 80
      }
    : null;

  // ─────────────────────────────────────────────────────────────────────────
  // Don't mount anything if closed
  // ─────────────────────────────────────────────────────────────────────────
  if (!isOpen) return null;

  return (
    <div className="location-picker-overlay" onClick={onClose}>
      <div
        className="location-picker-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="location-picker-header">
          <div>
            <h3>
              <MapPin size={20} />
              تحديد العنوان على الخريطة
            </h3>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* ── Search Bar ──────────────────────────────────────────── */}
        <div className="location-picker-search-bar" style={{ position: 'relative' }}>
          <div className="search-input-wrapper">
            <Search size={18} className="search-input-icon" />
            <input
              type="text"
              placeholder="ابحث بالحي أو الشارع أو المدينة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
            {isSearching && (
              <div className="geocoding-spinner" style={{ position: 'absolute', insetInlineEnd: '2.8rem' }} />
            )}
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => { setSearchQuery(''); setSearchResults([]); }}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {searchResults.length > 0 && (
            <ul className="map-search-suggestions">
              {searchResults.map((item, idx) => (
                <li key={idx} onClick={() => handleSelectSuggestion(item)}>
                  <MapPin size={16} className="sug-icon" />
                  <div>
                    <strong>{item.display_name.split(',')[0]}</strong>
                    <span>{item.display_name.split(',').slice(1, 3).join(',')}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Map ─────────────────────────────────────────────────── */}
        <div className="location-picker-body">
          {/* The actual Leaflet map container */}
          <div ref={mapContainerRef} className="map-container-inner" />

          {/* Floating custom zoom toolbar (Top Left) */}
          <div 
            className="map-floating-controls"
            style={{
              position: 'absolute',
              top: '1rem',
              insetInlineStart: '1rem',
              insetInlineEnd: 'auto',
              padding: '4px',
              borderRadius: '10px'
            }}
          >
            {/* Zoom In */}
            <button
              type="button"
              className="map-control-btn zoom-btn"
              onClick={handleZoomIn}
              title="تكبير الخريطة"
            >
              <Plus size={18} />
            </button>

            {/* Zoom Out */}
            <button
              type="button"
              className="map-control-btn zoom-btn"
              onClick={handleZoomOut}
              title="تصغير الخريطة"
            >
              <Minus size={18} />
            </button>
          </div>

          {/* Floating Location Action Buttons (Top Right, Horizontal Layout) */}
          <div 
            style={{
              position: 'absolute',
              top: '1rem',
              insetInlineEnd: '1rem',
              zIndex: 800,
              display: 'flex',
              gap: '0.5rem',
              direction: 'rtl'
            }}
          >
            {/* Locate Me / Cashier */}
            <button
              type="button"
              className="map-control-btn cashier-locate"
              onClick={handleJumpToCashier}
              title="الانتقال إلى موقعي الحالي"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                width: 'auto', 
                padding: '0 12px', 
                height: '40px', 
                background: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(226, 232, 240, 0.95)',
                borderRadius: '10px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                color: '#059669',
                cursor: 'pointer'
              }}
            >
              <Navigation size={15} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 'bold', whiteSpace: 'nowrap', color: '#334155' }}>موقعي الحالي</span>
            </button>

            {/* Focus on Customer Pin */}
            {customerCoords && (
              <button
                type="button"
                className="map-control-btn customer-locate"
                onClick={handleJumpToCustomer}
                title={`الانتقال إلى ${targetLabel}`}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  width: 'auto', 
                  padding: '0 12px', 
                  height: '40px', 
                  background: 'rgba(255, 255, 255, 0.96)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(226, 232, 240, 0.95)',
                  borderRadius: '10px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  color: '#e11d48',
                  cursor: 'pointer'
                }}
              >
                <Compass size={15} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 'bold', whiteSpace: 'nowrap', color: '#334155' }}>{targetLabel}</span>
              </button>
            )}
          </div>

          {/* Layer switcher pills */}
          <div className="map-layers-switch">
            {Object.entries(TILE_LAYERS).map(([key, val]) => (
              <button
                key={key}
                type="button"
                className={`layer-pill ${activeLayer === key ? 'active' : ''}`}
                onClick={() => setActiveLayer(key)}
              >
                <Layers size={12} />
                {val.name}
              </button>
            ))}
          </div>


        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="location-picker-footer">
          {/* Address display & edit */}
          <div className="selected-address-summary">
            <MapIcon size={24} className="addr-icon" />
            <div className="addr-text">
              <h4>العنوان المحدد (تلقائي أو يدوي)</h4>
              {isGeocoding ? (
                <p style={{ color: '#3b82f6', fontSize: '0.9rem', marginTop: '0.3rem' }}>
                  ⏳ جارٍ جلب اسم الموقع...
                </p>
              ) : (
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', marginTop: '0.4rem', fontWeight: 600 }}
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="انقر على الخريطة أو اسحب الدبوس لتحديد العنوان..."
                />
              )}
            </div>
          </div>

          {/* Extra details removed */}

          {/* Confirm / Cancel */}
          <div className="location-picker-actions">
            <button type="button" className="btn-cancel-location" onClick={onClose}>
              إلغاء
            </button>
            <button
              type="button"
              className="btn-confirm-location"
              onClick={handleConfirm}
              disabled={!customerCoords}
            >
              <Check size={18} />
              <span>تأكيد العنوان</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPickerModal;
