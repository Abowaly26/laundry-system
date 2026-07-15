import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix leaflet default icon broken paths in Vite/React environments
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * StaticOrderMap
 * خريطة ثابتة / inline تُعرض في صفحة تفاصيل الطلب لإظهار موقع العميل.
 * تستقبل إحداثيات delivery_lat / delivery_lng أو customer_lat / customer_lng.
 * تضع دبوسًا احترافيًا على الموقع مع نافذة popup تُظهر العنوان النصي.
 */
const StaticOrderMap = ({ lat, lng, address, height = '220px', interactive = false, onClick }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !lat || !lng) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      center: [parseFloat(lat), parseFloat(lng)],
      zoom: 15,
      zoomControl: interactive,
      attributionControl: false,
      scrollWheelZoom: interactive,
      dragging: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
    });

    L.tileLayer(
      'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ar',
      { maxZoom: 19 }
    ).addTo(map);

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="
          display:flex;
          flex-direction:column;
          align-items:center;
          animation:pinDrop 0.4s cubic-bezier(0.175,0.885,0.32,1.275);
        ">
          <div style="
            width:40px;height:40px;
            background:linear-gradient(135deg,#e11d48,#f43f5e);
            color:white;
            border:3px solid white;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 8px 16px rgba(225,29,72,0.45);
          ">
            <svg style="transform:rotate(45deg)" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div style="width:12px;height:5px;background:rgba(0,0,0,0.25);border-radius:50%;margin-top:3px;filter:blur(1px)"></div>
        </div>
      `,
      iconSize: [40, 52],
      iconAnchor: [20, 52],
    });

    L.marker([parseFloat(lat), parseFloat(lng)], { icon })
      .addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng]);

  if (!lat || !lng) return null;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius: '14px',
        overflow: 'hidden',
        height,
        border: '2px solid var(--border-color, #e2e8f0)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginTop: '0.75rem',
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />


      {/* Open in Google Maps Link */}
      <a
        href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()} // منع انتشار الحدث لفتح المودال عند الضغط على فتح خرائط جوجل
        style={{
          position: 'absolute',
          bottom: '0.6rem',
          insetInlineEnd: '0.6rem',
          zIndex: 900,
          background: 'rgba(255,255,255,0.92)',
          color: '#1e40af',
          padding: '0.35rem 0.75rem',
          borderRadius: '8px',
          fontSize: '0.78rem',
          fontWeight: 700,
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          border: '1px solid #bfdbfe',
        }}
      >
        🗺 فتح في خرائط جوجل
      </a>
    </div>
  );
};

export default StaticOrderMap;
