import React, { useState, useEffect } from 'react';
import { Container, DailyUpdateLog, AutoUpdateConfig, Coordinate } from './types';
import { INITIAL_CONTAINERS, INITIAL_LOGS } from './data/mockContainers';
import { MapViewer } from './components/MapViewer';
import { ContainerCard } from './components/ContainerCard';
import { CodeImporterModal } from './components/CodeImporterModal';
import { DailyUpdateManager } from './components/DailyUpdateManager';
import { HowItWorksModal } from './components/HowItWorksModal';
import { ContainerDetailsModal } from './components/ContainerDetailsModal';
import { AtlasOceanApp } from './components/AtlasOceanApp';
import {
  Ship,
  Code2,
  HelpCircle,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  Layers,
  Compass,
  Anchor,
  Globe,
  FileSpreadsheet,
  Link2,
  Loader2,
  CheckCircle2,
  LayoutDashboard,
  MapPin,
} from 'lucide-react';
import { fetchAndParseFromUrl, DEFAULT_USER_SHEET_URL } from './utils/excelParser';

export default function App() {
  // Primary view selector: 'atlas' (exact Streamlit master app) or 'radar' (detailed satellite tracker)
  const [activeSystemView, setActiveSystemView] = useState<'atlas' | 'radar'>('atlas');

  const [containers, setContainers] = useState<Container[]>(INITIAL_CONTAINERS);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(INITIAL_CONTAINERS[0]);
  const [detailedContainer, setDetailedContainer] = useState<Container | null>(null);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');

  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);

  // Active Live Definition URL state (Defaults to the user Google Sheet for automatic adjustment)
  const [activeLiveUrl, setActiveLiveUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('live_container_tracking_url') || DEFAULT_USER_SHEET_URL;
    } catch (e) {
      return DEFAULT_USER_SHEET_URL;
    }
  });
  const [isSyncingLiveUrl, setIsSyncingLiveUrl] = useState<boolean>(false);
  const [liveSyncToast, setLiveSyncToast] = useState<string | null>(null);

  const [updateLogs, setUpdateLogs] = useState<DailyUpdateLog[]>(INITIAL_LOGS);
  const [updateConfig, setUpdateConfig] = useState<AutoUpdateConfig>({
    enabled: true,
    updateHourUtc: 6,
    frequencyHours: 24,
    lastSyncTimestamp: new Date().toISOString(),
    nextSyncTimestamp: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    simulationStep: 7,
  });

  // Automatic Adjustment: Auto-fetch user Google Sheet on startup
  useEffect(() => {
    let isMounted = true;
    const autoSyncOnStartup = async () => {
      const targetUrl = activeLiveUrl || DEFAULT_USER_SHEET_URL;
      setIsSyncingLiveUrl(true);
      try {
        const result = await fetchAndParseFromUrl(targetUrl);
        if (isMounted && result.containers.length > 0) {
          setContainers(result.containers);
          setSelectedContainer(result.containers[0]);
          setLiveSyncToast(
            `✓ تم الضبط الآلي بنجاح: تم جلب ومزامنة (${result.containers.length}) حاوية مباشرة من Google Sheet وتطبيق مواقعها الملاحية!`
          );
          setTimeout(() => {
            if (isMounted) setLiveSyncToast(null);
          }, 8000);
        }
      } catch (err: any) {
        console.warn('Auto sync on start error:', err);
      } finally {
        if (isMounted) setIsSyncingLiveUrl(false);
      }
    };

    autoSyncOnStartup();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered containers
  const filteredContainers = containers.filter((c) => {
    const matchesSearch =
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.vesselName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.sequenceNumber && c.sequenceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.lineName && c.lineName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.originPort.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.destinationPort.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCarrier =
      carrierFilter === 'all' ||
      c.carrierCode.toLowerCase() === carrierFilter.toLowerCase();

    return matchesSearch && matchesCarrier;
  });

  // Handle Importing new containers from Code / JSON / Excel / Live Link
  const handleImportContainers = (newContainers: Container[]) => {
    setContainers(newContainers);
    if (newContainers.length > 0) {
      setSelectedContainer(newContainers[0]);
    }
  };

  // Sync latest container updates from the active Live Link
  const handleSyncFromActiveUrl = async () => {
    const targetUrl = activeLiveUrl || DEFAULT_USER_SHEET_URL;
    setIsSyncingLiveUrl(true);
    setLiveSyncToast(null);

    try {
      const result = await fetchAndParseFromUrl(targetUrl);
      setContainers(result.containers);
      if (result.containers.length > 0) {
        setSelectedContainer(result.containers[0]);
      }
      setLiveSyncToast(`✓ تم بنجاح جلب ومزامنة (${result.containers.length}) حاوية من Google Sheet وتحديث الخريطة فورياً!`);
      setTimeout(() => setLiveSyncToast(null), 6000);
    } catch (err: any) {
      setLiveSyncToast(`خطأ أثناء المزامنة من الرابط: ${err.message || 'تعذر الوصول'}`);
      setTimeout(() => setLiveSyncToast(null), 8000);
    } finally {
      setIsSyncingLiveUrl(false);
    }
  };

  const handleRemoveLiveUrl = () => {
    setActiveLiveUrl('');
    try {
      localStorage.removeItem('live_container_tracking_url');
    } catch (e) {
      // ignore
    }
    setLiveSyncToast('تم فك ارتباط الرابط المباشر بنجاح.');
    setTimeout(() => setLiveSyncToast(null), 4000);
  };

  // Trigger Daily Update (simulating 1 day progression with strict numeric validation)
  const handleTriggerDailyUpdate = () => {
    const newLogs: DailyUpdateLog[] = [];
    const timestamp = new Date().toISOString();

    setContainers((prevContainers) =>
      prevContainers.map((c) => {
        const waypoints = c.routeWaypoints;
        if (!waypoints || waypoints.length < 2) return c;

        const prevCoords = c.currentLocation.coordinates;
        const currentIdx = typeof c.currentWaypointIndex === 'number' && !isNaN(c.currentWaypointIndex)
          ? Math.max(0, Math.min(waypoints.length - 1, c.currentWaypointIndex))
          : 0;

        let nextIdx = currentIdx;
        let newCoords: Coordinate = { ...prevCoords };

        // تحققات دقيقة ومحمية لنسبة التقدم لتجنب أي حذف، تقريب عشوائي أو فقدان للصفر (0)
        const rawProgress = typeof c.progressPercent === 'number' ? c.progressPercent : parseFloat(String(c.progressPercent));
        const validBaseProgress = !isNaN(rawProgress) && isFinite(rawProgress)
          ? Math.max(0, Math.min(100, rawProgress))
          : 0;

        const progressDelta = Math.floor(Math.random() * 5 + 5);
        let newProgress = Math.min(100, Math.max(0, Number((validBaseProgress + progressDelta).toFixed(2))));

        if (currentIdx < waypoints.length - 1) {
          nextIdx = currentIdx + 1;
          const targetWp = waypoints[nextIdx];
          const prevLat = typeof prevCoords?.lat === 'number' && !isNaN(prevCoords.lat) ? prevCoords.lat : 0;
          const prevLng = typeof prevCoords?.lng === 'number' && !isNaN(prevCoords.lng) ? prevCoords.lng : 0;
          const targetLat = typeof targetWp?.lat === 'number' && !isNaN(targetWp.lat) ? targetWp.lat : prevLat;
          const targetLng = typeof targetWp?.lng === 'number' && !isNaN(targetWp.lng) ? targetWp.lng : prevLng;

          newCoords = {
            lat: Number((prevLat * 0.4 + targetLat * 0.6).toFixed(4)),
            lng: Number((prevLng * 0.4 + targetLng * 0.6).toFixed(4)),
          };
        } else {
          newCoords = c.destinationPort?.coordinates || prevCoords;
          newProgress = 100;
        }

        const rawMovement = typeof c.dailyMovementNauticalMiles === 'number'
          ? c.dailyMovementNauticalMiles
          : parseFloat(String(c.dailyMovementNauticalMiles));
        const validMovement = !isNaN(rawMovement) && isFinite(rawMovement) ? rawMovement : 200;
        const distanceTraveled = Math.max(0, Math.floor(validMovement + (Math.random() * 30 - 15)));

        newLogs.push({
          id: `log-${Date.now()}-${c.id}`,
          timestamp,
          containerId: c.id,
          vesselName: c.vesselName,
          previousCoordinates: prevCoords,
          newCoordinates: newCoords,
          distanceTraveledNm: distanceTraveled,
          status: newProgress >= 100 ? 'In Port (Delivered)' : `At Sea (${c.currentLocation.speedKnots} kts)`,
          automated: true,
          details:
            newProgress >= 100
              ? `وصلت الحاوية إلى ${c.destinationPort.name} بنجاح وبدأت إجراءات التفريغ الجمركي.`
              : `تم التحديث التلقائي اليومي بنجاح. أبحرت السفينة مسافة ${distanceTraveled} ميل بحري خلال آخر 24 ساعة. نسبة الإنجاز: ${newProgress}%.`,
        });

        return {
          ...c,
          progressPercent: newProgress,
          currentWaypointIndex: nextIdx,
          currentLocation: {
            ...c.currentLocation,
            coordinates: newCoords,
            lastUpdated: timestamp,
            status: newProgress >= 100 ? 'In Port' : 'At Sea',
          },
        };
      })
    );

    setUpdateLogs((prev) => [...newLogs, ...prev]);
    setLiveSyncToast('تم تنفيذ التحديث اليومي والتحقق الحسابي بدقة وحفظ الحالة الحية.');
    setTimeout(() => setLiveSyncToast(null), 3500);
  };

  return (
    <div className="min-h-screen selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Top System Switcher Banner (Hidden when printing) */}
      <div className="no-print bg-[#07151a] border-b border-slate-800 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-bold">
          <Ship className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-black tracking-wide">أطلس المحيط للتجارة العامة</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSystemView('atlas')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSystemView === 'atlas'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>لوحة التحكم والكشوفات (الكود الأم)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSystemView('radar')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSystemView === 'radar'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>🛰️ مركز الرادار والخرائط الفضائية</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCodeModalOpen(true)}
            className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">استيراد كشف Excel</span>
          </button>
        </div>
      </div>

      {/* Main View Display: Atlas Ocean Master System or Satellite Radar */}
      {activeSystemView === 'atlas' ? (
        <AtlasOceanApp
          containers={containers}
          selectedContainer={selectedContainer}
          onSelectContainer={setSelectedContainer}
          onContainersLoaded={(loaded) => {
            if (loaded && loaded.length > 0) {
              setContainers(loaded);
              if (!selectedContainer) setSelectedContainer(loaded[0]);
            }
          }}
        />
      ) : (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
          {/* Header */}
          <header className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 lg:px-8 shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
                <Ship className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg lg:text-xl font-bold tracking-tight text-slate-800">
                    مركز الرادار والتتبع الفضائي للحاويات
                  </h1>
                  <span className="hidden sm:inline-flex text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-bold">
                    AIS + Satellite
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden md:block">
                  متابعة المسارات البحرية المباشرة من ميناء نانشا إلى العقبة وأم قصر ومرسين
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => setIsHowItWorksOpen(true)}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1.5"
              >
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">الشرح التقني</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCodeModalOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>استيراد كشف Excel</span>
              </button>
            </div>
          </header>

          {/* Live Sync Toast */}
          {liveSyncToast && (
            <div className="bg-emerald-600 text-white text-xs font-bold py-2.5 px-4 text-center shadow-md flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{liveSyncToast}</span>
            </div>
          )}

          {/* Active Live Link Status Ribbon */}
          {activeLiveUrl && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-2 text-xs text-blue-900 flex flex-wrap items-center justify-between gap-2 max-w-7xl mx-auto w-full">
              <div className="flex items-center gap-2 truncate">
                <Link2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-bold">الربط الأوتوماتيكي المباشر مفعل:</span>
                <span className="font-mono text-slate-600 truncate max-w-xs md:max-w-md" dir="ltr">
                  {activeLiveUrl}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSyncFromActiveUrl}
                  disabled={isSyncingLiveUrl}
                  className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                >
                  {isSyncingLiveUrl ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>جارٍ التحديث...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" />
                      <span>تحديث الحاويات الآن</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveLiveUrl}
                  className="px-2 py-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors text-[11px] font-semibold cursor-pointer"
                >
                  فك الارتباط
                </button>
              </div>
            </div>
          )}

          {/* Content Area */}
          <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto space-y-6">
            {/* Top Metric Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                  <Ship className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block mb-0.5">الحاويات المتتبعة:</span>
                  <span className="text-base lg:text-lg font-bold text-slate-800 font-mono">
                    {containers.length} حاويات
                  </span>
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block mb-0.5">التحديث الأوتوماتيكي:</span>
                  <span className="text-base lg:text-lg font-bold text-emerald-600">كل 24 ساعة</span>
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block mb-0.5">ميناء الشحن والتحميل:</span>
                  <span className="text-sm lg:text-base font-bold text-slate-800">ميناء نانشا (GOCT)</span>
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                  <Anchor className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 block mb-0.5">سجلات التحديث اليومية:</span>
                  <span className="text-base lg:text-lg font-bold text-indigo-700 font-mono">
                    {updateLogs.length} عمليات
                  </span>
                </div>
              </div>
            </div>

            {/* Map & Live Visualizer Section */}
            <section className="h-[480px] lg:h-[540px] w-full">
              <MapViewer
                containers={filteredContainers}
                selectedContainer={selectedContainer}
                onSelectContainer={(c) => setSelectedContainer(c)}
              />
            </section>

            {/* Automated Daily Update Manager */}
            <DailyUpdateManager
              containers={containers}
              updateConfig={updateConfig}
              onToggleAutoUpdate={(enabled) => setUpdateConfig((prev) => ({ ...prev, enabled }))}
              onTriggerManualDailyUpdate={handleTriggerDailyUpdate}
              updateLogs={updateLogs}
            />

            {/* Containers Explorer & Filter */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-800">قائمة الحاويات المسجلة وتفاصيل مساراتها</h3>
                  <span className="text-xs text-blue-700 font-medium bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                    {filteredContainers.length} من أصل {containers.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative">
                    <select
                      id="select-carrier-filter"
                      value={carrierFilter}
                      onChange={(e) => setCarrierFilter(e.target.value)}
                      className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
                    >
                      <option value="all">جميع الخطوط الملاحية</option>
                      <option value="MSCU">MSC (MSCU)</option>
                      <option value="COSU">COSCO (COSU)</option>
                      <option value="MAEU">Maersk (MAEU)</option>
                      <option value="CMAU">CMA CGM (CMAU)</option>
                    </select>
                  </div>

                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-container-search"
                      type="text"
                      placeholder="بحث برقم الحاوية، السفينة، أو الميناء..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredContainers.map((container) => (
                  <ContainerCard
                    key={container.id}
                    container={container}
                    isSelected={selectedContainer?.id === container.id}
                    onSelect={(c) => setSelectedContainer(c)}
                    onOpenDetails={(c) => setDetailedContainer(c)}
                  />
                ))}
              </div>
            </section>
          </main>

          <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500">
            <p>
              أطلس المحيط للتجارة العامة - نظام تتبع ومراقبة الحاويات والشحنات البحرية والجوية مع الاستعلام الحي عن الجمارك
              والديون
            </p>
          </footer>
        </div>
      )}

      {/* Global Modals */}
      <CodeImporterModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        onImport={handleImportContainers}
        activeLiveUrl={activeLiveUrl}
        onSaveLiveUrl={setActiveLiveUrl}
      />

      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />

      <ContainerDetailsModal
        container={detailedContainer}
        onClose={() => setDetailedContainer(null)}
      />
    </div>
  );
}
