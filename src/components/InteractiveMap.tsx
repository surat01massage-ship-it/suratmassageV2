import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Navigation, ExternalLink, Compass, Crosshair, MapPin } from 'lucide-react';

// Fix Leaflet's default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const staffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const activeStaffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Point {
  lat: number;
  lng: number;
  name?: string;
  type: 'customer' | 'staff_available' | 'staff_busy' | 'staff_offline';
  label?: string;
}

interface InteractiveMapProps {
  customerLat: number;
  customerLng: number;
  staffPins: Array<{
    id: string;
    nickname: string;
    lat: number;
    lng: number;
    available: 'ON' | 'OFF';
    status: 'Pending' | 'Approved' | 'Reject';
  }>;
  activeBooking?: {
    status: string;
    staffLat?: number;
    staffLng?: number;
  } | null;
  height?: string;
  onLocationChange?: (lat: number, lng: number) => void;
  onUseGPS?: () => void;
  isLoadingGPS?: boolean;
}

// Component to handle map clicks, center and fit all pins
function MapEvents({ 
  onLocationChange, 
  centerLat, 
  centerLng,
  staffPins
}: { 
  onLocationChange?: (lat: number, lng: number) => void;
  centerLat: number;
  centerLng: number;
  staffPins: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (!map || isNaN(centerLat) || isNaN(centerLng)) return;

    // Helper: calculate approx distance in km to avoid huge zoom out across provinces
    const approxDistKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const dLat = (lat2 - lat1) * 111.32;
      const dLon = (lon2 - lon1) * 111.32 * Math.cos((lat1 * Math.PI) / 180);
      return Math.sqrt(dLat * dLat + dLon * dLon);
    };

    // Filter nearby staff only (< 40km) for map fitting bounds
    const nearbyStaff = staffPins.filter(
      p => p.lat && p.lng && !isNaN(p.lat) && !isNaN(p.lng) && approxDistKm(centerLat, centerLng, p.lat, p.lng) <= 40
    );

    if (nearbyStaff.length > 0) {
      const points: [number, number][] = [[centerLat, centerLng], ...nearbyStaff.map(s => [s.lat, s.lng] as [number, number])];
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else {
      map.setView([centerLat, centerLng], 14, { animate: true });
    }
  }, [centerLat, centerLng, staffPins.length, map]);

  useMapEvents({
    click(e) {
      if (onLocationChange) {
        onLocationChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function InteractiveMap({
  customerLat,
  customerLng,
  staffPins,
  activeBooking,
  height = 'h-[320px]',
  onLocationChange,
  onUseGPS,
  isLoadingGPS = false
}: InteractiveMapProps) {
  const activeStaffPin = activeBooking && activeBooking.staffLat && activeBooking.staffLng 
    ? { lat: activeBooking.staffLat, lng: activeBooking.staffLng }
    : null;

  const validStaffPins = staffPins.filter(p => p.available === 'ON' && p.status !== 'Reject');

  return (
    <div className={`relative w-full ${height} rounded-2xl overflow-hidden shadow-inner border border-slate-200 z-0`}>
      <MapContainer 
        center={[customerLat, customerLng]} 
        zoom={14} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        />
        
        <MapEvents 
          onLocationChange={onLocationChange} 
          centerLat={customerLat} 
          centerLng={customerLng} 
          staffPins={validStaffPins}
        />

        {/* Customer Marker */}
        <Marker position={[customerLat, customerLng]} icon={customerIcon}>
          <Popup>
            <div className="font-bold text-slate-800 text-xs">📍 พิกัดของคุณ</div>
          </Popup>
        </Marker>

        {/* Nearby Staff Pins */}
        {validStaffPins.map(staff => {
          const isActive = activeBooking && activeBooking.staffLat === staff.lat;
          return (
            <Marker 
              key={staff.id} 
              position={[staff.lat, staff.lng]} 
              icon={isActive ? activeStaffIcon : staffIcon}
            >
              <Popup>
                <div className="p-1">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                    <span>💆</span>
                    {isActive ? `พี่${staff.nickname} (กำลังเดินทาง)` : `พี่${staff.nickname} (พร้อมรับงาน)`}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-bold mt-0.5">● ออนไลน์อยู่ตอนนี้</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Top Right: Tap to Pin helper */}
      {onLocationChange && (
        <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm border border-slate-200 text-[10px] font-bold text-slate-700 px-3 py-1.5 rounded-xl shadow-sm z-[400] pointer-events-none flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          แตะบนแผนที่เพื่อปักหมุด
        </div>
      )}

      {/* Floating GPS Button on Map */}
      {onUseGPS && (
        <div 
          className="absolute bottom-3 left-3 z-[400]"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onUseGPS}
            disabled={isLoadingGPS}
            className="bg-white hover:bg-sky-50 text-sky-700 border-2 border-sky-500/30 hover:border-sky-500 shadow-md hover:shadow-lg px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="กดเพื่อใช้ตำแหน่งปัจจุบัน GPS"
          >
            <Compass className={`w-4 h-4 text-sky-600 ${isLoadingGPS ? 'animate-spin' : ''}`} />
            <span>{isLoadingGPS ? 'กำลังค้นหา GPS...' : '📍 ตำแหน่งปัจจุบัน'}</span>
          </button>
        </div>
      )}

      <div 
        className="absolute bottom-3 right-3 flex items-center gap-1.5 z-[400]"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-slate-200 text-[9px] font-mono text-slate-600 px-2 py-1 rounded-md shadow-sm">
          <Navigation className="w-3 h-3 text-sky-500" />
          <span className="font-semibold">{customerLat.toFixed(4)}, {customerLng.toFixed(4)}</span>
        </div>
        <a 
          href={activeStaffPin 
            ? `https://www.google.com/maps/dir/?api=1&origin=${activeStaffPin.lat},${activeStaffPin.lng}&destination=${customerLat},${customerLng}&travelmode=driving`
            : `https://www.google.com/maps/search/?api=1&query=${customerLat},${customerLng}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 bg-sky-500 hover:bg-sky-600 text-white text-[9px] font-extrabold px-2.5 py-1 rounded-md shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 duration-150"
        >
          <ExternalLink className="w-3 h-3" />
          <span>{activeStaffPin ? 'เส้นทางนวด' : 'เปิด Google Maps'}</span>
        </a>
      </div>
    </div>
  );
}
