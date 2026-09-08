import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchAtlasData,
  AtlasRow,
  TrackingRow,
  exportTableToExcel,
  cleanNumeric,
} from '../utils/atlasOceanData';
import { AtlasCustomTable } from './AtlasCustomTable';
import {
  PortPackagesChart,
  TopCustomersChart,
  AgingDebtChart,
} from './AtlasCharts';
import { Container } from '../types';
import { MapViewer } from './MapViewer';
import { ContainerDetailsModal } from './ContainerDetailsModal';
import { YardInventoryModal } from './YardInventoryModal';
import { TencentSheetsSection } from './TencentSheetsSection';
import {
  RotateCcw,
  Printer,
  FileSpreadsheet,
  FileText,
  Search,
  CheckCircle2,
  Menu,
  X,
  Plus,
  Save,
  MapPin,
  Ship,
  Plane,
  Radio,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface AtlasOceanAppProps {
  containers: Container[];
  selectedContainer: Container | null;
  onSelectContainer: (container: Container | null) => void;
}

type PageKey =
  | 'marine_tencent'
  | 'air_tencent'
  | 'dashboard'
  | 'customs'
  | 'sponsors'
  | 'aging'
  | 'collections'
  | 'tracking'
  | 'charts';

const GENERAL_PAGE_OPTIONS: { id: PageKey; label: string }[] = [
  { id: 'dashboard', label: '📊 لوحة التحكم الشاملة' },
  { id: 'customs', label: '💰 كشف أجور الكمارك' },
  { id: 'sponsors', label: '👤📋 الديون على الكفلاء' },
  { id: 'aging', label: '⏳ أعمار الديون (Aging Report)' },
  { id: 'collections', label: '🛃 كمرك الشحنات والاستحصالات' },
  { id: 'tracking', label: '🛰️ تتبع الشحنات الجديد' },
  { id: 'charts', label: '📈 الرسوم البيانية والتحليلات' },
];

export const AtlasOceanApp: React.FC<AtlasOceanAppProps> = ({
  containers,
  selectedContainer,
  onSelectContainer,
}) => {
  const [currentPage, setCurrentPage] = useState<PageKey>('marine_tencent');
  const [rawData, setRawData] = useState<AtlasRow[]>([]);
  const [trackingData, setTrackingData] = useState<TrackingRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedContainerFilter, setSelectedContainerFilter] = useState<string>('الكل');
  const [selectedCodeFilter, setSelectedCodeFilter] = useState<string>('الكل');
  const [selectedSponsorFilter, setSelectedSponsorFilter] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [displayMode, setDisplayMode] = useState<'all' | 'marine' | 'air'>('all');

  // Mobile sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [selectedMarineSheetId, setSelectedMarineSheetId] = useState<string>('marine-collections');

  // Detailed container modal
  const [modalContainer, setModalContainer] = useState<Container | null>(null);

  // Yard Inventory printable modal
  const [isYardModalOpen, setIsYardModalOpen] = useState<boolean>(false);

  // Tracking map view mode
  const [showFullMap, setShowFullMap] = useState<boolean>(false);

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAtlasData();
      if (res.error) setError(res.error);
      setRawData(res.df);
      setTrackingData(res.dfTracking);
    } catch (e: any) {
      setError(e?.message || 'خطأ في تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filter options lists
  const availableContainers = useMemo(() => {
    const list = new Set<string>();
    rawData.forEach((r) => {
      const c = String(r['رقم الحاوية'] || '').trim();
      if (c && !c.toLowerCase().includes('total')) list.add(c);
    });
    return ['الكل', ...Array.from(list).sort()];
  }, [rawData]);

  const availableCodes = useMemo(() => {
    const list = new Set<string>();
    rawData.forEach((r) => {
      const c = String(r['code'] || r['الكود'] || '').trim();
      if (c && !c.toLowerCase().includes('total')) list.add(c);
    });
    return ['الكل', ...Array.from(list).sort()];
  }, [rawData]);

  const availableSponsors = useMemo(() => {
    const list = new Set<string>();
    rawData.forEach((r) => {
      const s = String(r['الكفيل'] || '').trim();
      if (s && !s.toLowerCase().includes('total')) list.add(s);
    });
    return ['الكل', ...Array.from(list).sort()];
  }, [rawData]);

  // Apply Sidebar Filters
  const filteredDf = useMemo(() => {
    return rawData.filter((row) => {
      const cont = String(row['رقم الحاوية'] || '').trim();
      const code = String(row['code'] || row['الكود'] || '').trim();
      const sponsor = String(row['الكفيل'] || '').trim();

      if (selectedContainerFilter !== 'الكل' && cont !== selectedContainerFilter) {
        return false;
      }
      if (selectedCodeFilter !== 'الكل' && code !== selectedCodeFilter) {
        return false;
      }
      if (selectedSponsorFilter !== 'الكل' && sponsor !== selectedSponsorFilter) {
        return false;
      }
      return true;
    });
  }, [rawData, selectedContainerFilter, selectedCodeFilter, selectedSponsorFilter]);

  // Handle opening container modal
  const handleContainerClick = (containerNo: string) => {
    const normalized = containerNo.replace(/\s+/g, '').toUpperCase();
    const found = containers.find(
      (c) =>
        c.id.replace(/\s+/g, '').toUpperCase() === normalized ||
        c.sequenceNumber?.replace(/\s+/g, '').toUpperCase() === normalized
    );
    if (found) {
      setModalContainer(found);
      onSelectContainer(found);
    } else {
      window.open(
        'https://i.saas.freightower.com/cargo?id=1422568&unionId=oSPkV6j3hTSfHTVOS8d8d3_qfh2E#/tracking/ocean',
        '_blank'
      );
    }
  };

  // Helper to render top action buttons
  const renderDownloadButtons = (dataToDownload: any[], filename: string) => {
    return (
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => exportTableToExcel(dataToDownload, filename)}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>📊 Download as Excel</span>
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-5 py-2.5 rounded-lg font-bold text-sm shadow transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4 text-slate-600" />
          <span>🖨️ طباعة الصفحة الحالية</span>
        </button>
      </div>
    );
  };

  /* ========================================================================= */
  /* 1. DASHBOARD TAB                                                          */
  /* ========================================================================= */
  const renderDashboard = () => {
    // Search filter
    let dashDf = filteredDf;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      dashDf = dashDf.filter((r) => {
        const c = String(r['code'] || '').toLowerCase();
        const k = String(r['الكفيل'] || '').toLowerCase();
        const cont = String(r['رقم الحاوية'] || '').toLowerCase();
        const sm = String(r['Shipping mark'] || '').toLowerCase();
        return c.includes(q) || k.includes(q) || cont.includes(q) || sm.includes(q);
      });
    }

    const marineDf = dashDf.filter((r) =>
      String(r['رقم الحاوية'] || '').toUpperCase().startsWith('RQ')
    );
    const airDf = dashDf.filter((r) =>
      String(r['رقم الحاوية'] || '').toUpperCase().startsWith('RA')
    );

    const activeViewDf =
      displayMode === 'marine' ? marineDf : displayMode === 'air' ? airDf : dashDf;

    // Metrics
    const totalOrders = activeViewDf.length;
    const totalWeight = activeViewDf.reduce((acc, r) => acc + (r['الوزن'] || 0), 0);
    const totalCtns = activeViewDf.reduce((acc, r) => acc + (r['عدد الكارتون'] || 0), 0);
    const totalVolume = activeViewDf.reduce((acc, r) => acc + (r['حجم'] || 0), 0);

    const uniqueClients = new Set(
      activeViewDf.map((r) => String(r['code'] || r['Shipping mark'] || '')).filter(Boolean)
    ).size;
    const uniqueContainers = new Set(
      activeViewDf.map((r) => String(r['رقم الحاوية'] || '')).filter(Boolean)
    ).size;

    const totalOfficePaid = activeViewDf.reduce((acc, r) => acc + (r['المكتب دفع'] || 0), 0);
    const totalClientPaid = activeViewDf.reduce((acc, r) => acc + (r['الزبون دفع'] || 0), 0);
    const totalAmountAll = activeViewDf.reduce((acc, r) => acc + (r['المجموع'] || 0), 0);

    const defaultCols = [
      'code',
      'Shipping mark',
      'عدد الكارتون',
      'الوزن',
      'حجم',
      'رقم الحاوية',
      'الكفيل',
      'المجموع',
      'الزبون دفع',
      'المكتب دفع',
      'نقل داخلي',
      'سعر البيع',
      'مبلغ الجمرك',
      'قيمة الاستحصالات',
      'متبقي حقيقي',
      'تاريخ التوزيع',
      'عدد الايام',
    ];

    const filterCols = (rows: AtlasRow[]) => {
      return rows.map((r) => {
        const item: any = {};
        defaultCols.forEach((col) => {
          if (r[col] !== undefined) item[col] = r[col];
        });
        return item;
      });
    };

    return (
      <div>
        <h1 className="atlas-h1">📊 لوحة التحكم الرئيسية</h1>
        <hr className="border-slate-700 my-4" />

        {/* Smart Search */}
        <div className="no-print mb-4">
          <div className="relative">
            <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 بحث ذكي (ابحث برقم الكود، اسم الكفيل، أو رقم الحاوية)..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pr-10 pl-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Display Mode Radio */}
        <div className="no-print mb-5 bg-slate-900 p-3 rounded-lg border border-slate-800">
          <div className="text-slate-300 font-bold text-sm mb-2">طريقة العرض:</div>
          <div className="flex flex-wrap gap-4 text-sm font-semibold">
            <label className="flex items-center gap-2 cursor-pointer text-white">
              <input
                type="radio"
                name="displayMode"
                checked={displayMode === 'all'}
                onChange={() => setDisplayMode('all')}
                className="text-blue-600 focus:ring-0"
              />
              <span>📄 شامل (عرض الكل)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-white">
              <input
                type="radio"
                name="displayMode"
                checked={displayMode === 'marine'}
                onChange={() => setDisplayMode('marine')}
                className="text-blue-600 focus:ring-0"
              />
              <span>🚢 الشحن البحري (RQ)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-white">
              <input
                type="radio"
                name="displayMode"
                checked={displayMode === 'air'}
                onChange={() => setDisplayMode('air')}
                className="text-blue-600 focus:ring-0"
              />
              <span>✈️ الشحن الجوي (RA)</span>
            </label>
          </div>
        </div>

        {/* Metric Cards - Soft Pastel Shades */}
        {/* Row 1 (3 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 shadow-xs text-center">
            <div className="text-xs font-semibold text-slate-600 mb-1">🚢 عدد الحاويات</div>
            <div className="text-2xl font-bold font-mono text-slate-900">{uniqueContainers.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-xl border border-teal-200 bg-teal-50 text-teal-950 shadow-xs text-center">
            <div className="text-xs font-semibold text-teal-700 mb-1">👥 عدد العملاء</div>
            <div className="text-2xl font-bold font-mono text-teal-900">{uniqueClients.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-950 shadow-xs text-center">
            <div className="text-xs font-semibold text-amber-700 mb-1">💰 المبلغ الكلي</div>
            <div className="text-2xl font-bold font-mono text-amber-900">
              ${totalAmountAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Row 2 (4 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-950 shadow-xs text-center">
            <div className="text-xs font-semibold text-blue-700 mb-1">📦 عدد الطلبات</div>
            <div className="text-xl font-bold font-mono text-blue-900">{totalOrders.toLocaleString()}</div>
          </div>
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-950 shadow-xs text-center">
            <div className="text-xs font-semibold text-amber-700 mb-1">📦 إجمالي عدد الكارتون</div>
            <div className="text-xl font-bold font-mono text-amber-900">
              {totalCtns.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 shadow-xs text-center">
            <div className="text-xs font-semibold text-emerald-700 mb-1">💰 مبالغ دفعت من المكتب</div>
            <div className="text-xl font-bold font-mono text-emerald-900">
              ${totalOfficePaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-950 shadow-xs text-center">
            <div className="text-xs font-semibold text-purple-700 mb-1">👤 مبالغ دفعت من الزبون</div>
            <div className="text-xl font-bold font-mono text-purple-900">
              ${totalClientPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Row 3 (2 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 shadow-xs text-center">
            <div className="text-xs font-semibold text-emerald-700 mb-1">⚖️ إجمالي الوزن (kg)</div>
            <div className="text-xl font-bold font-mono text-emerald-900">
              {totalWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-orange-200 bg-orange-50 text-orange-950 shadow-xs text-center">
            <div className="text-xs font-semibold text-orange-700 mb-1">📐 إجمالي الحجم (m³)</div>
            <div className="text-xl font-bold font-mono text-orange-900">
              {totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <hr className="border-slate-700 my-4" />
        {renderDownloadButtons(activeViewDf, 'لوحة_التحكم_أطلس_المحيط')}

        {/* Marine RQ Table */}
        {['all', 'marine'].includes(displayMode) && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-200 mb-2">🚢 جدول الشحن البحري (RQ)</h3>
            <AtlasCustomTable
              data={filterCols(marineDf)}
              onContainerClick={handleContainerClick}
            />
          </div>
        )}

        {/* Air RA Table */}
        {['all', 'air'].includes(displayMode) && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-200 mb-2">✈️ جدول الشحن الجوي (RA)</h3>
            <AtlasCustomTable
              data={filterCols(airDf)}
              onContainerClick={handleContainerClick}
            />
          </div>
        )}
      </div>
    );
  };

  /* ========================================================================= */
  /* 2. CUSTOMS TAB                                                            */
  /* ========================================================================= */
  const renderCustoms = () => {
    let customsDf = filteredDf;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      customsDf = customsDf.filter((r) => {
        const c = String(r['code'] || '').toLowerCase();
        const k = String(r['الكفيل'] || '').toLowerCase();
        const cont = String(r['رقم الحاوية'] || '').toLowerCase();
        return c.includes(q) || k.includes(q) || cont.includes(q);
      });
    }

    const totalCustoms = customsDf.reduce((acc, r) => acc + (r['مبلغ الجمرك'] || 0), 0);
    const totalCollected = customsDf.reduce((acc, r) => acc + (r['قيمة الاستحصالات'] || 0), 0);
    const totalRemaining = customsDf.reduce((acc, r) => acc + (r['متبقي حقيقي'] || 0), 0);

    const notArrivedRemaining = customsDf
      .filter((r) => String(r['الكفيل'] || '').includes('لم تصل بعد'))
      .reduce((acc, r) => acc + (r['متبقي حقيقي'] || 0), 0);

    // Group by Code Pivot with Shipments list
    const codeGrouped = new Map<
      string,
      { cartons: number; customs: number; collected: number; remaining: number; shipments: Set<string> }
    >();
    customsDf.forEach((r) => {
      const c = String(r['code'] || r['الكود'] || 'غير محدد').trim();
      const curr = codeGrouped.get(c) || { cartons: 0, customs: 0, collected: 0, remaining: 0, shipments: new Set() };
      curr.cartons += r['عدد الكارتون'] || 0;
      curr.customs += r['مبلغ الجمرك'] || 0;
      curr.collected += r['قيمة الاستحصالات'] || 0;
      curr.remaining += r['متبقي حقيقي'] || 0;
      const sh = String(r['رقم الحاوية'] || '').trim();
      if (sh && !sh.toLowerCase().includes('total')) curr.shipments.add(sh);
      codeGrouped.set(c, curr);
    });

    const customsSummaryRows: any[] = [];
    let grandCartons = 0;
    let grandCustoms = 0;
    let grandCollected = 0;
    let grandRemaining = 0;

    Array.from(codeGrouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([code, stats]) => {
        grandCartons += stats.cartons;
        grandCustoms += stats.customs;
        grandCollected += stats.collected;
        grandRemaining += stats.remaining;
        customsSummaryRows.push({
          'الكود': code,
          'رقم الشحنة': Array.from(stats.shipments).join(', ') || '-',
          'Sum of عدد الكارتون': stats.cartons,
          'Sum of مبلغ الجمرك': stats.customs,
          'Sum of قيمة الاستحصالات': stats.collected,
          'Sum of متبقي حقيقي': stats.remaining,
        });
      });

    customsSummaryRows.push({
      'الكود': 'Grand Total',
      'رقم الشحنة': '-',
      'Sum of عدد الكارتون': grandCartons,
      'Sum of مبلغ الجمرك': grandCustoms,
      'Sum of قيمة الاستحصالات': grandCollected,
      'Sum of متبقي حقيقي': grandRemaining,
    });

    return (
      <div>
        <h1 className="atlas-h1">💰 كشف اجور الكمارك</h1>
        <hr className="border-slate-700 my-4" />

        <div className="no-print mb-4">
          <div className="relative">
            <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 بحث ذكي (ابحث برقم الكود، اسم الكفيل، أو رقم الحاوية)..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pr-10 pl-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* 4 Metric Cards - Soft Pastel Shades */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 shadow-xs text-center">
            <div className="text-xs font-semibold text-slate-600 mb-1">أجور الجمرك الكلي</div>
            <div className="text-xl font-bold font-mono text-slate-900">
              ${totalCustoms.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 shadow-xs text-center">
            <div className="text-xs font-semibold text-emerald-700 mb-1">إجمالي المتبقي الحقيقي</div>
            <div className="text-xl font-bold font-mono text-emerald-900">
              ${totalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-950 shadow-xs text-center">
            <div className="text-xs font-semibold text-blue-700 mb-1">إجمالي الاستحصالات (المسدد)</div>
            <div className="text-xl font-bold font-mono text-blue-900">
              ${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-950 shadow-xs text-center">
            <div className="text-xs font-semibold text-amber-700 mb-1">متبقي (لم تصل بعد)</div>
            <div className="text-xl font-bold font-mono text-amber-900">
              ${notArrivedRemaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <hr className="border-slate-700 my-4" />
        <h3 className="text-lg font-bold text-slate-200 mb-2">
          📊 جدول ملخص أجور الكمارك والاستحصالات حسب الكود
        </h3>
        {renderDownloadButtons(customsSummaryRows, 'ملخص_أجور_الكمارك_والاستحصالات')}
        <AtlasCustomTable data={customsSummaryRows} />
      </div>
    );
  };

  /* ========================================================================= */
  /* 3. SPONSORS TAB                                                           */
  /* ========================================================================= */
  const renderSponsors = () => {
    const sponsorsGrouped = new Map<string, { customs: number; collected: number; remaining: number; orders: number }>();
    filteredDf.forEach((r) => {
      const sp = String(r['الكفيل'] || 'غير محدد').trim();
      const curr = sponsorsGrouped.get(sp) || { customs: 0, collected: 0, remaining: 0, orders: 0 };
      curr.customs += r['مبلغ الجمرك'] || 0;
      curr.collected += r['قيمة الاستحصالات'] || 0;
      curr.remaining += r['متبقي حقيقي'] || 0;
      curr.orders += 1;
      sponsorsGrouped.set(sp, curr);
    });

    // Sponsors Pivot detailed rows
    const containerCartons = new Map<string, number>();
    rawData.forEach((r) => {
      const c = String(r['رقم الحاوية'] || '').trim();
      if (c) {
        containerCartons.set(c, (containerCartons.get(c) || 0) + (r['عدد الكارتون'] || 0));
      }
    });

    const pivotRows: any[] = [];
    let totClientPaid = 0;
    let totOfficePaid = 0;
    let totSum = 0;
    let totCartons = 0;
    let totCustoms = 0;
    let totCollected = 0;
    let totRemaining = 0;
    let totContCartons = 0;

    filteredDf.forEach((r) => {
      const cont = String(r['رقم الحاوية'] || '');
      const sm = String(r['Shipping mark'] || '');
      const cp = r['الزبون دفع'] || 0;
      const op = r['المكتب دفع'] || 0;
      const sum = r['المجموع'] || 0;
      const ctns = r['عدد الكارتون'] || 0;
      const cust = r['مبلغ الجمرك'] || 0;
      const coll = r['قيمة الاستحصالات'] || 0;
      const rem = r['متبقي حقيقي'] || 0;
      const contCtn = containerCartons.get(cont) || 0;

      totClientPaid += cp;
      totOfficePaid += op;
      totSum += sum;
      totCartons += ctns;
      totCustoms += cust;
      totCollected += coll;
      totRemaining += rem;

      pivotRows.push({
        'رقم الحاوية': cont,
        'Shipping mark': sm,
        'الزبون دفع': cp,
        'المكتب دفع': op,
        المجموع: sum,
        'Sum of عدد الكارتون': ctns,
        'Sum of مبلغ الجمرك': cust,
        'Sum of قيمة الاستحصالات': coll,
        'Sum of متبقي حقيقي': rem,
        'مجموع الكارتون بالحاوية': contCtn,
      });
    });

    // Total of container cartons
    containerCartons.forEach((ctn) => {
      totContCartons += ctn;
    });

    pivotRows.push({
      'رقم الحاوية': 'Grand Total',
      'Shipping mark': '',
      'الزبون دفع': totClientPaid,
      'المكتب دفع': totOfficePaid,
      المجموع: totSum,
      'Sum of عدد الكارتون': totCartons,
      'Sum of مبلغ الجمرك': totCustoms,
      'Sum of قيمة الاستحصالات': totCollected,
      'Sum of متبقي حقيقي': totRemaining,
      'مجموع الكارتون بالحاوية': totCartons,
    });

    return (
      <div>
        <h1 className="atlas-h1">👥 الديون على الكفلاء</h1>
        <hr className="border-slate-700 my-4" />

        <h3 className="text-lg font-bold text-slate-200 mb-3">📋 ملخص المبالغ لكل كفيل</h3>
        <div className="space-y-3 mb-6">
          {Array.from(sponsorsGrouped.entries()).map(([sponsorName, stats]) => {
            const cardBg = sponsorName.includes('لم تصل بعد') ? '#b45309' : '#1e3a8a';
            return (
              <div
                key={sponsorName}
                className="metric-card text-right"
                style={{
                  backgroundColor: cardBg,
                  padding: '16px',
                  borderRadius: '10px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
              >
                <h3 className="text-base font-bold text-white border-b border-white/20 pb-2 mb-3">
                  👤 الكفيل: {sponsorName}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-center text-white">
                  <div>
                    📦 الطلبات:{' '}
                    <b className="font-mono">
                      {stats.orders.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </b>
                  </div>
                  <div>
                    💰 الجمرك:{' '}
                    <b className="font-mono">
                      ${stats.customs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </b>
                  </div>
                  <div>
                    ✅ المسدد:{' '}
                    <b className="font-mono">
                      ${stats.collected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </b>
                  </div>
                  <div>
                    ⏳ المتبقي:{' '}
                    <b className="font-mono">
                      ${stats.remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </b>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <hr className="border-slate-700 my-4" />
        <h3 className="text-lg font-bold text-slate-200 mb-2">
          📊 جدول تفصيلي بملخص الكفلاء (Pivot Table)
        </h3>
        {renderDownloadButtons(pivotRows, 'تفاصيل_الكفلاء_Pivot_أطلس')}
        <AtlasCustomTable
          data={pivotRows}
          isSponsorsPivot={true}
          onContainerClick={handleContainerClick}
        />
      </div>
    );
  };

  /* ========================================================================= */
  /* 4. AGING REPORT TAB                                                       */
  /* ========================================================================= */
  const renderAging = () => {
    // Filter rows with positive days and remaining amount
    const agingRows = filteredDf.filter((r) => (r['عدد الايام'] || 0) > 0 && (r['متبقي حقيقي'] || 0) > 0);

    // Pivot table: Container + Code -> Days -> Remaining
    const daysSet = new Set<number>();
    agingRows.forEach((r) => daysSet.add(r['عدد الايام'] || 0));
    const sortedDays = Array.from(daysSet).sort((a, b) => a - b);

    // Grouping by [Container, Code]
    const rowMap = new Map<string, Record<string, any>>();
    agingRows.forEach((r) => {
      const cont = String(r['رقم الحاوية'] || 'عام');
      const code = String(r['code'] || r['الكود'] || 'عام');
      const key = `${cont}___${code}`;
      const day = r['عدد الايام'] || 0;
      const rem = r['متبقي حقيقي'] || 0;

      if (!rowMap.has(key)) {
        rowMap.set(key, { 'رقم الحاوية': cont, code, total: 0 });
      }
      const item = rowMap.get(key)!;
      item[String(day)] = (item[String(day)] || 0) + rem;
      item.total += rem;
    });

    const agingTableRows: any[] = [];
    const dayTotals: Record<string, number> = {};
    let grandGrandTotal = 0;

    Array.from(rowMap.values()).forEach((item) => {
      const rowObj: any = {
        'رقم الحاوية': item['رقم الحاوية'],
        code: item.code,
      };
      sortedDays.forEach((d) => {
        const val = item[String(d)] || 0;
        rowObj[String(d)] = val;
        dayTotals[String(d)] = (dayTotals[String(d)] || 0) + val;
      });
      rowObj['Grand Total'] = item.total;
      grandGrandTotal += item.total;
      agingTableRows.push(rowObj);
    });

    const totalRow: any = {
      'رقم الحاوية': 'Grand Total',
      code: '',
    };
    sortedDays.forEach((d) => {
      totalRow[String(d)] = dayTotals[String(d)] || 0;
    });
    totalRow['Grand Total'] = grandGrandTotal;
    agingTableRows.push(totalRow);

    // Categorized Aging Chart data
    const categorizeDays = (days: number) => {
      if (days <= 30) return 'أقل من 30 يوماً';
      if (days <= 60) return 'من 30 إلى 60 يوماً';
      if (days <= 90) return 'من 61 إلى 90 يوماً';
      return 'أكثر من 90 يوماً (يتضمن +95 يوم)';
    };

    const codeBuckets = new Map<string, Record<string, number>>();
    agingRows.forEach((r) => {
      const c = String(r['code'] || r['الكود'] || 'عام').trim();
      const bucket = categorizeDays(r['عدد الايام'] || 0);
      const rem = r['متبقي حقيقي'] || 0;

      if (!codeBuckets.has(c)) {
        codeBuckets.set(c, {
          'أقل من 30 يوماً': 0,
          'من 30 إلى 60 يوماً': 0,
          'من 61 إلى 90 يوماً': 0,
          'أكثر من 90 يوماً (يتضمن +95 يوم)': 0,
          total: 0,
        });
      }
      const b = codeBuckets.get(c)!;
      b[bucket] += rem;
      b.total += rem;
    });

    const chartData = Array.from(codeBuckets.entries())
      .map(([code, data]) => ({
        الكود: code,
        'أقل من 30 يوماً': data['أقل من 30 يوماً'],
        'من 30 إلى 60 يوماً': data['من 30 إلى 60 يوماً'],
        'من 61 إلى 90 يوماً': data['من 61 إلى 90 يوماً'],
        'أكثر من 90 يوماً (يتضمن +95 يوم)': data['أكثر من 90 يوماً (يتضمن +95 يوم)'],
        total: data.total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)
      .reverse();

    return (
      <div>
        <h1 className="atlas-h1">⏳ تقرير أعمار الديون (Aging Report)</h1>
        <hr className="border-slate-700 my-4" />

        <h3 className="text-lg font-bold text-slate-200 mb-2">
          📋 جدول تحليلي يوزع المتبقي الحقيقي حسب الكود ورقم الحاوية وأيام التأخير
        </h3>
        {renderDownloadButtons(agingTableRows, 'تقرير_أعمار_الديون_أطلس')}
        <AtlasCustomTable
          data={agingTableRows}
          isAgingReport={true}
          onContainerClick={handleContainerClick}
        />

        <hr className="border-slate-700 my-6" />
        <h3 className="text-lg font-bold text-slate-200 mb-2">
          📊 رسم بياني لتحليل أعمار الديون (Aging Analysis)
        </h3>
        {chartData.length > 0 ? (
          <AgingDebtChart data={chartData} />
        ) : (
          <div className="p-4 bg-slate-800 text-slate-300 rounded-lg text-center">
            لا توجد مبالغ متأخرة لعرض الرسم البياني.
          </div>
        )}
      </div>
    );
  };

  /* ========================================================================= */
  /* 5. COLLECTIONS TAB                                                        */
  /* ========================================================================= */
  const renderCollections = () => {
    const totalCustoms = filteredDf.reduce((acc, r) => acc + (r['مبلغ الجمرك'] || 0), 0);
    const totalCollected = filteredDf.reduce((acc, r) => acc + (r['قيمة الاستحصالات'] || 0), 0);
    const totalRemaining = filteredDf.reduce((acc, r) => acc + (r['متبقي حقيقي'] || 0), 0);

    // Group by Container
    const contGrouped = new Map<string, { customs: number; collected: number; remaining: number }>();
    filteredDf.forEach((r) => {
      const c = String(r['رقم الحاوية'] || 'غير محدد').trim();
      const curr = contGrouped.get(c) || { customs: 0, collected: 0, remaining: 0 };
      curr.customs += r['مبلغ الجمرك'] || 0;
      curr.collected += r['قيمة الاستحصالات'] || 0;
      curr.remaining += r['متبقي حقيقي'] || 0;
      contGrouped.set(c, curr);
    });

    const collectionsTableRows: any[] = [];
    let sumCust = 0;
    let sumColl = 0;
    let sumRem = 0;

    Array.from(contGrouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([cont, stats]) => {
        sumCust += stats.customs;
        sumColl += stats.collected;
        sumRem += stats.remaining;
        collectionsTableRows.push({
          'رقم الحاوية': cont,
          'Sum of مبلغ الجمرك': stats.customs,
          'Sum of الاستحصالات': stats.collected,
          'Sum of متبقي حقيقي': stats.remaining,
        });
      });

    collectionsTableRows.push({
      'رقم الحاوية': 'Grand Total',
      'Sum of مبلغ الجمرك': sumCust,
      'Sum of الاستحصالات': sumColl,
      'Sum of متبقي حقيقي': sumRem,
    });

    return (
      <div>
        <h1 className="atlas-h1">🛃 نافذة كمرك الشحنات والاستحصالات</h1>
        <hr className="border-slate-700 my-4" />

        <h3 className="text-lg font-bold text-slate-200 mb-3">
          📋 ملخص الحاويات حسب مبالغ الجمرك والاستحصالات والمتبقي الحقيقي
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 shadow-xs text-center">
            <div className="text-xs font-semibold text-slate-600 mb-1">إجمالي مبالغ الجمرك</div>
            <div className="text-xl font-bold font-mono text-slate-900">
              ${totalCustoms.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 shadow-xs text-center">
            <div className="text-xs font-semibold text-emerald-700 mb-1">إجمالي الاستحصالات</div>
            <div className="text-xl font-bold font-mono text-emerald-900">
              ${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-950 shadow-xs text-center">
            <div className="text-xs font-semibold text-amber-700 mb-1">إجمالي المتبقي الحقيقي</div>
            <div className="text-xl font-bold font-mono text-amber-900">
              ${totalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <hr className="border-slate-700 my-4" />
        {renderDownloadButtons(collectionsTableRows, 'كمرك_الشحنات_والاستحصالات_أطلس')}
        <AtlasCustomTable
          data={collectionsTableRows}
          onContainerClick={handleContainerClick}
        />
      </div>
    );
  };

  /* ========================================================================= */
  /* 6. TRACKING TAB                                                           */
  /* ========================================================================= */
  const renderTracking = () => {
    return (
      <div>
        <h1 className="atlas-h1">📦 تتبع الشحنات الجديد</h1>
        <hr className="border-slate-700 my-4" />

        {/* Map Header & Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <span>🗺️ خريطة تتبع الشحنات والموقع الجغرافي المباشر</span>
            <span className="text-xs font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
              ميناء نانشا (GOCT) ➔ العقبة / أم قصر / مرسين
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsYardModalOpen(true)}
              className="no-print text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>نموذج جرد الساحة</span>
            </button>
            <button
              type="button"
              onClick={() => setShowFullMap(!showFullMap)}
              className="no-print text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Ship className="w-3.5 h-3.5" />
              <span>{showFullMap ? 'تصغير الخريطة (Mini Map)' : 'تكبير الخريطة الشاملة (Full Map)'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Map Component */}
        <div
          className={`w-full rounded-xl overflow-hidden border border-slate-700 mb-6 transition-all duration-300 ${
            showFullMap ? 'h-[580px]' : 'h-[340px]'
          }`}
        >
          <MapViewer
            containers={containers}
            selectedContainer={selectedContainer}
            onSelectContainer={(c) => {
              onSelectContainer(c);
              setModalContainer(c);
            }}
          />
        </div>

        <hr className="border-slate-700 my-4" />
        <h3 className="text-lg font-bold text-slate-200 mb-2">
          📋 بيانات ومتابعة الشحنات المرفوعة على جوجل شيت (الـ 39 حاوية)
        </h3>
        {renderDownloadButtons(trackingData, 'تتبع_الحاويات_أطلس_المحيط')}
        <AtlasCustomTable
          data={trackingData}
          onContainerClick={handleContainerClick}
        />
      </div>
    );
  };

  /* ========================================================================= */
  /* 7. CHARTS TAB                                                             */
  /* ========================================================================= */
  const renderCharts = () => {
    // Port summary from tracking data
    const portMap = new Map<string, { packages: number; containers: Set<string> }>();
    trackingData.forEach((r) => {
      const port = String(r['الميناء'] || 'غير محدد').trim();
      const cont = String(r['رقم الحاوية'] || '').trim();
      const pkgs = cleanNumeric(r['عدد الطرود']);

      if (!portMap.has(port)) {
        portMap.set(port, { packages: 0, containers: new Set<string>() });
      }
      const p = portMap.get(port)!;
      p.packages += pkgs;
      if (cont) p.containers.add(cont);
    });

    const portSummaryRows = Array.from(portMap.entries()).map(([port, data]) => ({
      الميناء: port,
      'Sum of الطرود': data.packages,
      'Count of الحاويات': data.containers.size,
    }));

    // Top 20 Customers air vs marine (removed 'أخرى / عام' column as requested)
    const custMap = new Map<string, { marine: number; air: number; total: number }>();
    filteredDf.forEach((r) => {
      const code = String(r['code'] || r['الكود'] || 'غير محدد').trim();
      const cont = String(r['رقم الحاوية'] || '').toUpperCase();
      const cartons = r['عدد الكارتون'] || 0;

      if (!custMap.has(code)) {
        custMap.set(code, { marine: 0, air: 0, total: 0 });
      }
      const c = custMap.get(code)!;
      if (cont.startsWith('RA')) c.air += cartons;
      else c.marine += cartons;
      c.total += cartons;
    });

    const topCustomersList = Array.from(custMap.entries())
      .map(([code, data]) => ({
        الكود: code,
        '🚢 شحن بحري (RQ)': data.marine,
        '✈️ شحن جوي (RA)': data.air,
        total: data.total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    const topCustomersForChart = [...topCustomersList].reverse();

    return (
      <div>
        <h1 className="atlas-h1">📈 لوحة الرسوم البيانية والتحليلات</h1>
        <hr className="border-slate-700 my-4" />

        <h3 className="text-lg font-bold text-slate-200 mb-2">
          رسم بياني: عدد الحاويات والطرود حسب الميناء (من شيت التتبع)
        </h3>
        <h4 className="text-sm font-semibold text-slate-400 mb-2">جدول الملخص:</h4>
        <AtlasCustomTable data={portSummaryRows} />
        <PortPackagesChart data={portSummaryRows} />

        <hr className="border-slate-700 my-6" />
        <h3 className="text-lg font-bold text-slate-200 mb-2">
          🏆 أفضل 20 زبون حسب نوع الشحن (جوّي / بحري) وعدد الطرود
        </h3>
        <TopCustomersChart data={topCustomersForChart} />

        <h4 className="text-white font-bold text-[22px] mb-2">جدول أفضل 20 زبون:</h4>
        <AtlasCustomTable data={topCustomersList} />
      </div>
    );
  };

  return (
    <div className="atlas-main flex flex-col md:flex-row min-h-screen">
      {/* Mobile Header Bar */}
      <div className="no-print md:hidden bg-[#07151a] p-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-2 font-bold text-white text-base">
          <Ship className="w-5 h-5 text-blue-400" />
          <span>شركة أطلس المحيط</span>
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-white bg-slate-800 rounded-lg"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`atlas-sidebar no-print w-full md:w-64 p-3.5 shrink-0 border-l border-slate-800 flex flex-col justify-between ${
          isSidebarOpen ? 'block' : 'hidden md:flex'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>🚢 شركة أطلس المحيط</span>
            </h2>
          </div>
          <hr className="border-slate-800 mb-3" />

          {/* Filters */}
          <div className="mb-4 space-y-3 text-right">
            <h3 className="text-xs font-bold text-slate-300">🔍 الفلاتر الجانبية</h3>

            {/* Container Select */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                🚢 رقم الحاوية / الشحنة:
              </label>
              <select
                value={selectedContainerFilter}
                onChange={(e) => setSelectedContainerFilter(e.target.value)}
                className="w-full bg-white text-slate-900 font-bold text-xs p-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {availableContainers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Code Select */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                🏷️ كود العميل (Code):
              </label>
              <select
                value={selectedCodeFilter}
                onChange={(e) => setSelectedCodeFilter(e.target.value)}
                className="w-full bg-white text-slate-900 font-bold text-xs p-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {availableCodes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Sponsor Select */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                👤 اسم الكفيل:
              </label>
              <select
                value={selectedSponsorFilter}
                onChange={(e) => setSelectedSponsorFilter(e.target.value)}
                className="w-full bg-white text-slate-900 font-bold text-xs p-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {availableSponsors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <hr className="border-slate-800 my-3" />

          {/* Main Section 1: الشحن البحري (Main Sea Freight Section with 3 Dedicated Sheets) */}
          <div className="mb-3.5 bg-slate-900/90 p-2.5 rounded-xl border border-blue-900/60 shadow-xs">
            <div className="flex items-center justify-between text-xs font-black text-blue-400 mb-2 px-1">
              <span className="flex items-center gap-1.5">
                <Ship className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-black">الشحن البحري</span>
              </span>
              <span className="text-[10px] bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded font-mono border border-blue-500/30">
                3 شيتات حصرية
              </span>
            </div>

            <div className="space-y-1">
              {[
                { id: 'marine-collections', label: '1. استحصال الشحن البحري', icon: '📑' },
                { id: 'marine-treasury', label: '2. قاصة البحري', icon: '💼' },
                { id: 'marine-deposits', label: '3. ايداعات الزبائن للبحري', icon: '📥' },
              ].map((sub) => {
                const isSelected = currentPage === 'marine_tencent' && selectedMarineSheetId === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setSelectedMarineSheetId(sub.id);
                      setCurrentPage('marine_tencent');
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full text-right px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md font-black ring-1 ring-blue-400'
                        : 'text-slate-200 bg-slate-950/70 hover:bg-slate-800 border border-slate-800/80 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{sub.icon}</span>
                      <span>{sub.label}</span>
                    </span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub Section 2: الشحن الجوي (Sub Air Freight Section directly below) */}
          <div className="mb-3.5 bg-slate-900/90 p-2.5 rounded-xl border border-rose-900/60 shadow-xs">
            <div className="flex items-center justify-between text-xs font-black text-rose-400 mb-2 px-1">
              <span className="flex items-center gap-1.5">
                <Plane className="w-4 h-4 text-rose-400" />
                <span className="text-sm font-black">الشحن الجوي</span>
              </span>
              <span className="text-[10px] bg-rose-600/30 text-rose-300 px-1.5 py-0.5 rounded font-mono border border-rose-500/30">
                Tencent Live
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setCurrentPage('air_tencent');
                setIsSidebarOpen(false);
              }}
              className={`w-full text-right px-2.5 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                currentPage === 'air_tencent'
                  ? 'bg-rose-600 text-white shadow-md font-black ring-1 ring-rose-400'
                  : 'text-slate-200 bg-slate-950/70 hover:bg-slate-800 border border-slate-800/80 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-rose-300" />
                <span>شيتات تينسنت الجوية</span>
              </span>
              {currentPage === 'air_tencent' && (
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          </div>

          {/* Section 3: General Operational & Financial Reports */}
          <div className="mb-4">
            <h3 className="text-xs font-bold text-slate-300 mb-2 px-1">📊 التقارير والإدارة التشغيلية</h3>
            <div className="space-y-1.5">
              {GENERAL_PAGE_OPTIONS.map((opt) => {
                const isActive = currentPage === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setCurrentPage(opt.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full text-right px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-xs ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md font-black ring-1 ring-blue-400'
                        : 'text-slate-200 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 hover:text-white'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Button to open Yard Inventory printable report */}
          <button
            type="button"
            onClick={() => setIsYardModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-3 rounded-lg text-xs mb-3 shadow transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>📋 نموذج جرد الساحة والمستودع</span>
          </button>
        </div>

        {/* Bottom Section: Reload Button moved to bottom as requested */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <button
            type="button"
            onClick={loadAllData}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-3 rounded-lg text-xs shadow hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>🔄 تحديث البيانات</span>
          </button>

          <div className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[10px] text-emerald-400 font-semibold text-center leading-relaxed">
            متصل بملفات Google Sheets وتينسنت بنجاح ✔️
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto block-container w-full max-w-full">
        {isLoading && (
          <div className="p-8 text-center bg-slate-900 rounded-xl border border-slate-800 my-4">
            <RotateCcw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
            <div className="text-base font-bold text-white">جاري تحميل بيانات Google Sheets ومنظومة أطلس وتينسنت...</div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/80 border border-red-500 text-white rounded-lg mb-4 text-sm font-semibold">
            {error}
          </div>
        )}

        {!isLoading && (
          <>
            {currentPage === 'marine_tencent' && (
              <TencentSheetsSection
                category="marine"
                allRows={rawData}
                activeSheetId={selectedMarineSheetId}
                onSelectSheet={(id) => setSelectedMarineSheetId(id)}
              />
            )}
            {currentPage === 'air_tencent' && (
              <TencentSheetsSection category="air" allRows={rawData} />
            )}
            {currentPage === 'dashboard' && renderDashboard()}
            {currentPage === 'customs' && renderCustoms()}
            {currentPage === 'sponsors' && renderSponsors()}
            {currentPage === 'aging' && renderAging()}
            {currentPage === 'collections' && renderCollections()}
            {currentPage === 'tracking' && renderTracking()}
            {currentPage === 'charts' && renderCharts()}
          </>
        )}
      </main>

      {/* Modal for detailed container info */}
      {modalContainer && (
        <ContainerDetailsModal
          container={modalContainer}
          onClose={() => setModalContainer(null)}
        />
      )}

      {/* Modal for Yard Inventory Print */}
      {isYardModalOpen && (
        <YardInventoryModal
          isOpen={isYardModalOpen}
          onClose={() => setIsYardModalOpen(false)}
          availableShipments={availableContainers}
          initialShipment={selectedContainerFilter}
          allRows={rawData}
        />
      )}
    </div>
  );
};
