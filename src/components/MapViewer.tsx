import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Container } from '../types';

interface MapViewerProps {
  containers: Container[];
  selectedContainer: Container | null;
  onSelectContainer: (container: Container) => void;
}

export const MapViewer: React.FC<MapViewerProps> = ({
  containers,
  selectedContainer,
  onSelectContainer,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Dark sleek maritime map tiles
    const map = L.map(mapContainerRef.current, {
      center: [20.0, 60.0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
    });

    // Add Zoom control at top left
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Standard OpenStreetMap tiles (100% free, reliable, no API key watermark)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers & polylines when containers or selectedContainer changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    containers.forEach((c) => {
      const isSelected = selectedContainer?.id === c.id;

      // 1. Draw Route Lines
      if (c.routeWaypoints && c.routeWaypoints.length > 1) {
        const fullPoints: L.LatLngExpression[] = c.routeWaypoints.map((w) => [w.lat, w.lng]);
        
        // Completed portion of route
        const completedPoints = c.routeWaypoints
          .slice(0, c.currentWaypointIndex + 1)
          .map((w) => [w.lat, w.lng] as L.LatLngExpression);
        
        // Remaining portion of route
        const remainingPoints = c.routeWaypoints
          .slice(c.currentWaypointIndex)
          .map((w) => [w.lat, w.lng] as L.LatLngExpression);

        // Solid line for completed
        if (completedPoints.length > 1) {
          L.polyline(completedPoints, {
            color: isSelected ? '#10b981' : '#3b82f6',
            weight: isSelected ? 4 : 2.5,
            opacity: isSelected ? 0.9 : 0.6,
          }).addTo(layerGroup);
        }

        // Dashed line for remaining path
        if (remainingPoints.length > 1) {
          L.polyline(remainingPoints, {
            color: isSelected ? '#38bdf8' : '#64748b',
            weight: isSelected ? 3 : 2,
            dashArray: '6, 8',
            opacity: isSelected ? 0.8 : 0.45,
          }).addTo(layerGroup);
        }
      }

      // 2. Origin Port Marker
      const originIcon = L.divIcon({
        className: 'custom-port-marker',
        html: `
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-md text-[11px] font-bold text-slate-800 whitespace-nowrap pointer-events-auto">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>${c.originPort.city}</span>
          </div>
        `,
        iconSize: [80, 26],
        iconAnchor: [40, 13],
      });
      L.marker([c.originPort.coordinates.lat, c.originPort.coordinates.lng], { icon: originIcon })
        .bindPopup(`
          <div class="text-right p-1 text-slate-800 font-sans" dir="rtl">
            <div class="font-bold text-xs text-emerald-600 mb-0.5">ميناء الشحن (المغادرة)</div>
            <div class="font-bold text-sm text-slate-900">${c.originPort.name}</div>
            <div class="text-xs text-slate-500 mt-1">تاريخ الإبحار: ${new Date(c.originPort.departureDate).toLocaleDateString('ar-EG')}</div>
          </div>
        `)
        .addTo(layerGroup);

      // 3. Destination Port Marker
      const destIcon = L.divIcon({
        className: 'custom-port-marker',
        html: `
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-md text-[11px] font-bold text-slate-800 whitespace-nowrap pointer-events-auto">
            <span class="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
            <span>${c.destinationPort.city}</span>
          </div>
        `,
        iconSize: [80, 26],
        iconAnchor: [40, 13],
      });
      L.marker([c.destinationPort.coordinates.lat, c.destinationPort.coordinates.lng], { icon: destIcon })
        .bindPopup(`
          <div class="text-right p-1 text-slate-800 font-sans" dir="rtl">
            <div class="font-bold text-xs text-blue-600 mb-0.5">ميناء الوصول المستهدف</div>
            <div class="font-bold text-sm text-slate-900">${c.destinationPort.name}</div>
            <div class="text-xs text-slate-500 mt-1">تاريخ الوصول المقدر (ETA): ${new Date(c.destinationPort.estimatedArrival).toLocaleDateString('ar-EG')}</div>
          </div>
        `)
        .addTo(layerGroup);

      // 4. Current Container / Vessel Position Marker
      const lat = c.currentLocation.coordinates.lat;
      const lng = c.currentLocation.coordinates.lng;
      bounds.extend([lat, lng]);

      // Determine shipment prefix (RQ for sea / RA for air)
      const seqUpper = (c.sequenceNumber || '').toUpperCase().trim();
      const idUpper = (c.id || '').toUpperCase().trim();
      const titleUpper = (c.title || '').toUpperCase().trim();
      const shipmentType = (seqUpper.startsWith('RA') || idUpper.startsWith('RA') || titleUpper.includes('RA'))
        ? 'RA'
        : 'RQ';
      const containerDisplayLabel = `${shipmentType} - ${c.id}`;

      const vesselIcon = L.divIcon({
        className: 'custom-vessel-marker',
        html: `
          <div class="relative group cursor-pointer">
            <div class="absolute -inset-2 bg-blue-600/25 rounded-full blur-sm ${isSelected ? 'animate-pulse' : ''}"></div>
            <div class="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
              isSelected
                ? 'bg-blue-600 text-white font-bold border-2 border-white shadow-xl scale-110'
                : 'bg-slate-900 text-white border border-slate-700 shadow-lg'
            } transition-transform duration-200">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 21h20"/>
                <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8-4-8 4c0 2.24.57 4.34 1.62 6"/>
                <path d="M12 10V4"/>
                <path d="m8 8 4-4 4 4"/>
              </svg>
              <span class="text-[11px] tracking-wide font-mono font-bold">${containerDisplayLabel}</span>
              <span class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-400 animate-ping'}"></span>
            </div>
            ${
              isSelected
                ? `<div class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap border border-slate-700 shadow-md">
                    ${c.currentLocation.speedKnots} kts | ${c.progressPercent}%
                  </div>`
                : ''
            }
          </div>
        `,
        iconSize: [140, 36],
        iconAnchor: [70, 18],
      });

      const marker = L.marker([lat, lng], { icon: vesselIcon, zIndexOffset: isSelected ? 1000 : 100 })
        .on('click', () => {
          onSelectContainer(c);
        })
        .addTo(layerGroup);

      // Popup with detailed snapshot
      marker.bindPopup(`
        <div class="text-right p-2 text-slate-900 font-sans leading-relaxed" dir="rtl" style="min-width: 210px">
          <div class="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
            <span class="font-mono font-bold text-xs text-blue-600">${containerDisplayLabel}</span>
            <span class="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">${c.carrierCode}</span>
          </div>
          <div class="text-xs font-semibold text-slate-800">${c.vesselName}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">${c.currentLocation.name}</div>
          
          <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
            <div>
              <span class="text-slate-500 block text-[10px]">السرعة:</span>
              <span class="font-bold text-slate-800">${c.currentLocation.speedKnots} عقدة</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px]">الإنجاز:</span>
              <span class="font-bold text-emerald-600">${c.progressPercent}%</span>
            </div>
          </div>
          
          <div class="mt-2 text-[10px] text-slate-400">
            الإحداثيات: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°
          </div>
        </div>
      `);

      if (isSelected) {
        marker.openPopup();
      }
    });

    // Fly to selected or fit all
    if (selectedContainer) {
      map.flyTo(
        [selectedContainer.currentLocation.coordinates.lat, selectedContainer.currentLocation.coordinates.lng],
        6,
        { duration: 1.2 }
      );
    } else if (containers.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 6 });
    }
  }, [containers, selectedContainer, onSelectContainer]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[460px]" />

      {/* Floating Map Legend & Stats Overlay */}
      <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3.5 shadow-md max-w-xs text-xs text-slate-700 pointer-events-auto">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            خريطة الملاحة الحية
          </span>
          <span className="text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
            {containers.length} حاويات نشطة
          </span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow-sm"></span>
            <span>موقع السفينة / الحاوية الحالي</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-emerald-500"></span>
            <span>المسار المقطوع (الأميال المبحرة)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 border-b border-dashed border-blue-400"></span>
            <span>المسار المتبقي حتى الوصول</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-blue-600"></span>
            <span>ميناء الوصول المستهدف (Destination Port)</span>
          </div>
        </div>
      </div>

      {/* Center on all containers button */}
      <div className="absolute bottom-4 left-4 z-[400] flex gap-2">
        <button
          id="btn-reset-map-view"
          onClick={() => {
            const map = mapInstanceRef.current;
            if (!map || containers.length === 0) return;
            const bounds = L.latLngBounds(
              containers.map((c) => [c.currentLocation.coordinates.lat, c.currentLocation.coordinates.lng])
            );
            map.fitBounds(bounds, { padding: [50, 50] });
          }}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="m10 15 5-3-5-3v6Z" />
          </svg>
          عرض جميع الحاويات
        </button>
      </div>
    </div>
  );
};
