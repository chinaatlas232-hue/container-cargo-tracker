import React, { useState, useEffect } from 'react';
import { Container, DailyUpdateLog, AutoUpdateConfig } from '../types';
import { RotateCw, Clock, CheckCircle2, Bell, Zap, Sliders, Calendar, Download, RefreshCw } from 'lucide-react';

interface DailyUpdateManagerProps {
  containers: Container[];
  updateConfig: AutoUpdateConfig;
  onToggleAutoUpdate: (enabled: boolean) => void;
  onTriggerManualDailyUpdate: () => void;
  updateLogs: DailyUpdateLog[];
}

export const DailyUpdateManager: React.FC<DailyUpdateManagerProps> = ({
  containers,
  updateConfig,
  onToggleAutoUpdate,
  onTriggerManualDailyUpdate,
  updateLogs,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(3600 * 14 + 25 * 60); // 14h 25m simulated
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'logs' | 'settings'>('status');

  // Countdown timer simulation
  useEffect(() => {
    if (!updateConfig.enabled) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Trigger automated cycle
          onTriggerManualDailyUpdate();
          return 24 * 3600; // Reset to 24 hours
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [updateConfig.enabled, onTriggerManualDailyUpdate]);

  const formatCountdown = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleManualSyncClick = () => {
    setIsUpdating(true);
    setTimeout(() => {
      onTriggerManualDailyUpdate();
      setIsUpdating(false);
      setSecondsRemaining(24 * 3600);
    }, 700);
  };

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(updateLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `container-daily-logs-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <RefreshCw className={`w-5 h-5 ${isUpdating ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800">محرك التحديث الأوتوماتيكي اليومي</h3>
              <span
                className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  updateConfig.enabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {updateConfig.enabled ? 'مفعل نشط (Active)' : 'متوقف مؤقتاً'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              تحديث إحداثيات ومسار كل حاوية كل 24 ساعة ومزامنة أنظمة الخطوط الملاحية
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'status'
                ? 'bg-white text-blue-600 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            حالة الجدولة
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-white text-blue-600 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>سجل التحديثات</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
              {updateLogs.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-white text-blue-600 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الإعدادات والتنبيهات
          </button>
        </div>
      </div>

      {/* Tab 1: Status & Real-time Trigger */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Auto update toggle box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block mb-1">الوضع التلقائي اليومي:</span>
                <span className="text-sm font-bold text-slate-800">
                  {updateConfig.enabled ? 'مفعل يومياً (06:00 UTC)' : 'معطل يدوي فقط'}
                </span>
              </div>
              <button
                id="btn-toggle-auto-sync"
                type="button"
                onClick={() => onToggleAutoUpdate(!updateConfig.enabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  updateConfig.enabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    updateConfig.enabled ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Countdown Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">الوقت حتى التحديث التلقائي القادم:</span>
                <Clock className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-xl font-bold font-mono text-blue-600 tracking-wider">
                {updateConfig.enabled ? formatCountdown(secondsRemaining) : '--:--:--'}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                دورة كل {updateConfig.frequencyHours} ساعة
              </span>
            </div>

            {/* Manual Trigger Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">تشغيل التحديث يدوياً الآن:</span>
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <button
                id="btn-trigger-manual-daily-update"
                type="button"
                disabled={isUpdating}
                onClick={handleManualSyncClick}
                className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                <span>{isUpdating ? 'جارٍ مزامنة إحداثيات اليوم...' : 'تنفيذ تحديث اليوم الآن'}</span>
              </button>
            </div>
          </div>

          {/* Quick Explanation Banner */}
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">كيف يتم تحديث المواقع يومياً في النظام الحقيقي؟</span>
              <span className="text-blue-800 leading-relaxed">
                يقوم النظام بإجراء طلب مجدول (Scheduled Cron Job) يومياً يتصل بـ APIs شركات الملاحة وأنظمة التتبع البحري
                (AIS)، أو يستقبل إشارات الحاويات الذكية المزودة بشرائح GPS، ويقوم بتحديث الإحداثيات تلقائياً وحفظها في قاعدة البيانات.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Logs Table */}
      {activeTab === 'logs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>سجل الحركات اليومية الموثقة ({updateLogs.length} عملية تحديث):</span>
            <button
              id="btn-export-logs"
              type="button"
              onClick={handleExportLogs}
              className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              تصدير السجل (JSON)
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-inner">
            {updateLogs.map((log) => (
              <div key={log.id} className="p-3 text-xs flex flex-col gap-1.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600">{log.containerId}</span>
                    <span className="text-slate-500">({log.vesselName})</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-mono font-semibold">
                      +{log.distanceTraveledNm} ميل بحري
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>

                <div className="text-[11px] text-slate-700 leading-relaxed">
                  {log.details}
                </div>

                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono pt-1">
                  <span>
                    الموقع السابق: {log.previousCoordinates.lat.toFixed(2)}°, {log.previousCoordinates.lng.toFixed(2)}°
                  </span>
                  <span>→</span>
                  <span className="text-emerald-600 font-semibold">
                    الموقع الجديد: {log.newCoordinates.lat.toFixed(2)}°, {log.newCoordinates.lng.toFixed(2)}°
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Automation Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-4 text-xs text-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                تكرار التحديث التلقائي
              </label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 shadow-sm"
                defaultValue="24"
              >
                <option value="24">كل يوم (كل 24 ساعة - التوقيت القياسي)</option>
                <option value="12">مرتين يومياً (كل 12 ساعة)</option>
                <option value="6">أربع مرات يومياً (كل 6 ساعات)</option>
                <option value="1">كل ساعة (للحاويات الحساسة والمبردة)</option>
              </select>
              <p className="text-[10px] text-slate-500">
                يتم مزامنة بيانات AIS ومواقع الأقمار الصناعية وفق التكرار المختار.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-blue-600" />
                تنبيهات الوصول اليومية
              </label>
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-slate-700">إشعار يومي بملخص تقدم الحاويات</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-slate-700">تنبيه فوري عند اقتراب الحاوية من ميناء الوجهة (أقل من 48 ساعة)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
