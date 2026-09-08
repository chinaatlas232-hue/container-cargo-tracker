import React from 'react';
import { Container } from '../types';
import { Ship, Anchor, Compass, Clock, MapPin, Gauge, ShieldCheck, Thermometer, BatteryCharging } from 'lucide-react';

interface ContainerCardProps {
  container: Container;
  isSelected: boolean;
  onSelect: (container: Container) => void;
  onOpenDetails: (container: Container) => void;
}

export const ContainerCard: React.FC<ContainerCardProps> = ({
  container,
  isSelected,
  onSelect,
  onOpenDetails,
}) => {
  const getCarrierBadgeColor = (code: string) => {
    switch (code) {
      case 'MSCU':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MAEU':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'COSU':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CMAU':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const status = container.currentLocation.status;
  const isInPort = status === 'In Port' || status === 'Delivered' || container.progressPercent >= 100;

  // Background color strictly based on Status:
  // - In Port: very light green (bg-emerald-50)
  // - In Transit / At Sea: very light yellow (bg-amber-50)
  const statusBgClass = isInPort
    ? 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-300'
    : 'bg-amber-50 hover:bg-amber-100/70 border-amber-300';

  return (
    <div
      id={`container-card-${container.id}`}
      onClick={() => onSelect(container)}
      className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${statusBgClass} ${
        isSelected
          ? 'ring-2 ring-blue-600 border-blue-600 shadow-md'
          : 'shadow-sm'
      }`}
    >
      {/* Top row: ID, Carrier, and Status */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-blue-600 tracking-wider">
            {container.id}
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded border font-mono ${getCarrierBadgeColor(
              container.carrierCode
            )}`}
          >
            {container.carrierCode}
          </span>
        </div>

        <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          {container.currentLocation.status}
        </span>
      </div>

      {/* Cargo title & Sequence */}
      <div className="mb-2">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <h4 className="text-xs font-semibold text-slate-800 line-clamp-1">
            {container.title}
          </h4>
          {container.sequenceNumber && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 shrink-0">
              تسلسل: {container.sequenceNumber}
            </span>
          )}
        </div>
      </div>

      {/* Origin -> Destination route snippet */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
        <div className="flex items-center gap-1.5">
          <Anchor className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-semibold text-slate-700">{container.originPort.city}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <span className="w-5 h-px bg-slate-300"></span>
          <Ship className="w-3 h-3 text-blue-600" />
          <span className="w-5 h-px bg-slate-300"></span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold text-slate-700">{container.destinationPort.city}</span>
        </div>
      </div>

      {/* Google Sheet custom metadata badges if present */}
      {(container.daysInTransit !== undefined || container.packagesCount || container.volumeCbm || container.containerColor || container.lineName || container.terminalName) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5 text-[10px]">
          {container.terminalName && container.daysInTransit !== undefined && container.daysInTransit <= 4 && (
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
              ⚓ محطة نانشا (GOCT)
            </span>
          )}
          {container.daysInTransit !== undefined && (
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
              ⏱ {container.daysInTransit} يوم بالطريق
            </span>
          )}
          {container.packagesCount !== undefined && (
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
              📦 {container.packagesCount} طرد
            </span>
          )}
          {container.volumeCbm !== undefined && (
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              📐 {container.volumeCbm} م³
            </span>
          )}
          {container.containerColor && (
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
              🎨 {container.containerColor}
            </span>
          )}
          {container.lineName && (
            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
              خط: {container.lineName}
            </span>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1 font-mono">
          <span>نسبة إنجاز الرحلة</span>
          <span className="font-bold text-blue-600">{container.progressPercent}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${container.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 mb-3">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3 h-3 text-slate-400" />
          <span className="truncate">السفينة: {container.vesselName.split(' ')[0]}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Gauge className="w-3 h-3 text-slate-400" />
          <span>السرعة: {container.currentLocation.speedKnots} kts</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="truncate">
            وصول: {new Date(container.destinationPort.estimatedArrival).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>النوع: {container.type.includes('Reefer') ? 'مبرد' : 'جاف'}</span>
        </div>
      </div>

      {/* Extra badge if reefer or IoT */}
      {(container.temperatureCelsius !== undefined || container.batteryLevel !== undefined) && (
        <div className="flex items-center gap-2 mb-3 text-[10px] border-t border-slate-100 pt-2 text-slate-500 font-mono">
          {container.temperatureCelsius !== undefined && (
            <span className="flex items-center gap-1 text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
              <Thermometer className="w-2.5 h-2.5" />
              {container.temperatureCelsius}°C
            </span>
          )}
          {container.batteryLevel !== undefined && (
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              <BatteryCharging className="w-2.5 h-2.5" />
              بطارية GPS: {container.batteryLevel}%
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          id={`btn-view-details-${container.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(container);
          }}
          className="w-full py-1.5 px-2.5 rounded-lg bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-200"
        >
          عرض تفاصيل الحاوية والمسار
        </button>
      </div>
    </div>
  );
};
