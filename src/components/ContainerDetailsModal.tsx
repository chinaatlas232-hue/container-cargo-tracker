import React from 'react';
import { Container } from '../types';
import { X, Ship, Anchor, MapPin, Calendar, Clock, Gauge, Compass, CheckCircle2, ShieldCheck, Thermometer, BatteryCharging, Wind } from 'lucide-react';

interface ContainerDetailsModalProps {
  container: Container | null;
  onClose: () => void;
  onViewOnMap?: (container: Container) => void;
}

export const ContainerDetailsModal: React.FC<ContainerDetailsModalProps> = ({
  container,
  onClose,
  onViewOnMap,
}) => {
  if (!container) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-3 overflow-hidden">
      <div className="bg-white border border-slate-200 rounded-none md:rounded-2xl w-screen h-screen max-w-full max-h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-200 bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 border border-blue-700 flex items-center justify-center text-white shadow-sm">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-blue-700 font-mono tracking-wide">{container.id}</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                  {container.carrier}
                </span>
                {container.sequenceNumber && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono font-bold border border-slate-300">
                    تسلسل: {container.sequenceNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">{container.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>إغلاق (Esc)</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto">
          {/* Quick Route & Status Bar */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">ميناء المغادرة:</span>
                <span className="text-xs font-bold text-emerald-700">{container.originPort.name}</span>
                <span className="text-[10px] text-slate-500 block">{container.originPort.country}</span>
              </div>
              <div className="flex flex-col items-center px-4">
                <span className="text-[10px] text-blue-600 font-bold mb-1">{container.progressPercent}% تم إنجازه</span>
                <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${container.progressPercent}%` }}></div>
                </div>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block">ميناء الوصول:</span>
                <span className="text-xs font-bold text-blue-600">{container.destinationPort.name}</span>
                <span className="text-[10px] text-slate-500 block">{container.destinationPort.country}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t md:border-t-0 md:border-r border-slate-200 pt-3 md:pt-0 md:pr-4 w-full md:w-auto justify-end">
              <span className="text-xs text-slate-500">الوصول المقدر (ETA):</span>
              <span className="text-xs font-bold text-slate-800 font-mono bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
                {new Date(container.destinationPort.estimatedArrival).toLocaleDateString('ar-EG', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Terminal Berthing & Port Status Highlight (NANSHA Terminal GOCT) */}
          {(container.terminalName || container.berthDate || container.etdDate || container.entryDate) && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
              <h4 className="text-xs font-bold text-amber-900 mb-2.5 flex items-center gap-1.5">
                <Anchor className="w-4 h-4 text-amber-700" />
                بيانات محطة الشحن ورسو السفينة بميناء نانشا (Terminal Berthing Schedule)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {container.terminalName && (
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                    <span className="text-slate-400 block text-[10px]">محطة المنشأ (POL Terminal):</span>
                    <span className="font-bold text-slate-800 text-xs">{container.terminalName}</span>
                  </div>
                )}
                {container.entryDate && (
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                    <span className="text-slate-400 block text-[10px]">تاريخ دخول المحطة:</span>
                    <span className="font-bold text-emerald-700 font-mono text-xs">{container.entryDate}</span>
                  </div>
                )}
                {container.berthDate && (
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                    <span className="text-slate-400 block text-[10px]">موعد رسو السفينة:</span>
                    <span className="font-bold text-amber-800 font-mono text-xs">{container.berthDate}</span>
                  </div>
                )}
                {container.etdDate && (
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                    <span className="text-slate-400 block text-[10px]">المغادرة المتوقعة (ETD):</span>
                    <span className="font-bold text-blue-700 font-mono text-xs">{container.etdDate}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Voyage & Vessel Specs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 block mb-1">اسم السفينة الحاملة:</span>
              <span className="text-xs font-bold text-slate-800 truncate block">{container.vesselName}</span>
              <span className="text-[10px] text-slate-500 font-mono">رحلة #{container.voyageNumber}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 block mb-1">الإحداثيات الحالية:</span>
              <span className="text-xs font-bold text-blue-600 font-mono block" dir="ltr">
                {container.currentLocation.coordinates.lat.toFixed(4)}°, {container.currentLocation.coordinates.lng.toFixed(4)}°
              </span>
              <span className="text-[10px] text-slate-500">{container.currentLocation.name}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 block mb-1">سرعة الإبحار الحالية:</span>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-blue-600" />
                {container.currentLocation.speedKnots} عقدة بحرية
              </span>
              <span className="text-[10px] text-slate-500">الوجهة: {container.currentLocation.headingDeg}° شمال</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 block mb-1">معدل الإبحار اليومي:</span>
              <span className="text-xs font-bold text-emerald-700">
                ~{container.dailyMovementNauticalMiles} ميل بحري / يوم
              </span>
              <span className="text-[10px] text-slate-500">تحديث تلقائي كل 24 ساعة</span>
            </div>
          </div>

          {/* Container Specs & IoT Sensors */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              مواصفات الحاوية وأجهزة الاستشعار الذكية (Smart Container Telemetry)
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">نوع الحاوية:</span>
                <span className="font-semibold text-slate-800">{container.type}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">الوزن الإجمالي المقدر:</span>
                <span className="font-semibold text-slate-800">{container.weightKg.toLocaleString()} كغم</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">حالة المستشعر (IoT):</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <BatteryCharging className="w-3 h-3" />
                  بطارية {container.batteryLevel || 95}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">حالة التبريد / الرطوبة:</span>
                <span className="font-semibold text-sky-700 flex items-center gap-1">
                  <Thermometer className="w-3 h-3" />
                  {container.temperatureCelsius !== undefined ? `${container.temperatureCelsius}°C مئوية` : 'حاوية جافة معيارية'}
                </span>
              </div>
            </div>
          </div>

          {/* Google Sheet Live Manifest Details if available */}
          {(container.sequenceNumber || container.daysInTransit !== undefined || container.packagesCount || container.volumeCbm || container.containerColor || container.lineName) && (
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
              <h4 className="text-xs font-bold text-blue-900 mb-3 flex items-center gap-1.5">
                <Ship className="w-4 h-4 text-blue-600" />
                بيانات بوليصة الشحن (كشف Google Sheet المربوط)
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {container.sequenceNumber && (
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="text-slate-400 block text-[10px]">تسلسل الحاوية:</span>
                    <span className="font-bold text-blue-700 font-mono text-sm">{container.sequenceNumber}</span>
                  </div>
                )}
                {container.daysInTransit !== undefined && (
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="text-slate-400 block text-[10px]">عدد الأيام بالطريق:</span>
                    <span className="font-bold text-amber-700 text-sm">{container.daysInTransit} يوم</span>
                  </div>
                )}
                {container.packagesCount !== undefined && (
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="text-slate-400 block text-[10px]">عدد الطرود:</span>
                    <span className="font-bold text-slate-800 text-sm">{container.packagesCount} طرد</span>
                  </div>
                )}
                {container.volumeCbm !== undefined && (
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="text-slate-400 block text-[10px]">حجم البضاعة (CBM):</span>
                    <span className="font-bold text-slate-800 text-sm">{container.volumeCbm} م³</span>
                  </div>
                )}
                {container.containerColor && (
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="text-slate-400 block text-[10px]">لون الحاوية:</span>
                    <span className="font-bold text-purple-700">{container.containerColor}</span>
                  </div>
                )}
                {container.lineName && (
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="text-slate-400 block text-[10px]">الخط الملاحي (Line Name):</span>
                    <span className="font-bold text-indigo-700">{container.lineName}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline Milestones */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              جدول المحطات والمراحل الملاحية (Milestones Timeline)
            </h4>

            <div className="relative pr-6 space-y-4 before:absolute before:right-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {container.milestones.map((m) => (
                <div key={m.id} className="relative flex items-start gap-3 text-xs">
                  <span
                    className={`absolute -right-6 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      m.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white border-slate-300 text-transparent'
                    }`}
                  >
                    {m.completed && <CheckCircle2 className="w-3 h-3" />}
                  </span>

                  <div className={`p-3 rounded-xl border w-full ${
                    m.isCurrent
                      ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-sm'
                      : m.completed
                      ? 'bg-slate-50 border-slate-200 text-slate-700'
                      : 'bg-slate-50/50 border-slate-100 text-slate-400'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{m.title}</span>
                      <span className="text-[10px] font-mono text-slate-500">{m.date}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">{m.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {onViewOnMap && (
            <button
              type="button"
              onClick={() => {
                onViewOnMap(container);
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <MapPin className="w-4 h-4" />
              <span>عرض مباشر على خريطة التتبع 🗺️</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
