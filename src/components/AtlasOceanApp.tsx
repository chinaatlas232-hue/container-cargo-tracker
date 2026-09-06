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
import {
  RotateCcw,
  Printer,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Menu,
  X,
  Plus,
  Save,
  MapPin,
  Ship,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface AtlasOceanAppProps {
  containers: Container[];
  selectedContainer: Container | null;
  onSelectContainer: (container: Container | null) => void;
}

type PageKey =
  | 'dashboard'
  | 'customs'
  | 'sponsors'
  | 'aging'
  | 'collections'
  | 'tracking'
  | 'charts'
  | 'data_entry';

const PAGE_OPTIONS: { id: PageKey; label: string }[] = [
  { id: 'dashboard', label: 'لوحة التحكم (Dashboard)' },
  { id: 'customs', label: 'كشف اجور الكمارك' },
  { id: 'sponsors', label: 'الديون على الكفلاء' },
  { id: 'aging', label: 'اعمار الديون (Aging Report)' },
  { id: 'collections', label: 'كمرك الشحنات والاستحصالات' },
  { id: 'tracking', label: 'تتبع الشحنات الجديد' },
  { id: 'charts', label: 'الرسوم البيانية' },
  { id: 'data_entry', label: 'إدخال وتعديل البيانات' },
];

export const AtlasOceanApp: React.FC<AtlasOceanAppProps> = ({
  containers,
  selectedContainer,
  onSelectContainer,
}) => {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
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

  // Detailed container modal
  const [modalContainer, setModalContainer] = useState<Container | null>(null);

  // Data editor state
  const [editableRows, setEditableRows] = useState<AtlasRow[]>([]);
  const [saveSuccessToast, setSaveSuccessToast] = useState<boolean>(false);

  // Tracking map view mode
  const [showFullMap, setShowFullMap] = useState<boolean>(false);

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAtlasData();
      if (res.error) setError(res.error);
      setRawData(res.df);
      setEditableRows(res.df);
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
      'No.',
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
              <span>📄 طباعة شامل (عرض الكل)</span>
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

        {/* Metric Cards */}
        {/* Row 1 (3 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="metric-card" style={{ backgroundColor: '#1e3a8a' }}>
            <div className="metric-title">🚢 عدد الحاويات</div>
            <div className="metric-value">{uniqueContainers.toLocaleString()}</div>
          </div>
          <div className="metric-card" style={{ backgroundColor: '#0f766e' }}>
            <div className="metric-title">👥 عدد العملاء</div>
            <div className="metric-value">{uniqueClients.toLocaleString()}</div>
          </div>
          <div className="metric-card" style={{ backgroundColor: '#b45309' }}>
            <div className="metric-title">💰 المبلغ الكلي</div>
            <div className="metric-value">
              {totalAmountAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Row 2 (4 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="metric-card" style={{ backgroundColor: '#1d4ed8' }}>
            <div className="metric-title">📦 عدد الطلبات</div>
            <div className="metric-value">{totalOrders.toLocaleString()}</div>
          </div>
          <div className="metric-card" style={{ backgroundColor: '#b45309' }}>
            <div className="metric-title">📦 إجمالي عدد الكارتون</div>
            <div className="metric-value">
              {totalCtns.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="metric-card" style={{ backgroundColor: '#16a34a' }}>
            <div className="metric-title">💰 مبالغ دفعت من المكتب</div>
            <div className="metric-value">
              {totalOfficePaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="metric-card" style={{ backgroundColor: '#9333ea' }}>
            <div className="metric-title">👤 مبالغ دفعت من الزبون</div>
            <div className="metric-value">
              {totalClientPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Row 3 (2 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="metric-card" style={{ backgroundColor: '#047857' }}>
            <div className="metric-title">⚖️ إجمالي الوزن (kg)</div>
            <div className="metric-value">
              {totalWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="metric-card" style={{ backgroundColor: '#7c2d12' }}>
            <div className="metric-title">📐 إجمالي الحجم (m³)</div>
            <div className="metric-value">
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

    // Group by Code Pivot
    const codeGrouped = new Map<string, { cartons: number; customs: number; collected: number; remaining: number }>();
    customsDf.forEach((r) => {
      const c = String(r['code'] || r['الكود'] || 'غير محدد').trim();
      const curr = codeGrouped.get(c) || { cartons: 0, customs: 0, collected: 0, remaining: 0 };
      curr.cartons += r['عدد الكارتون'] || 0;
      curr.customs += r['مبلغ الجمرك'] || 0;
      curr.collected += r['قيمة الاستحصالات'] || 0;
      curr.remaining += r['متبقي حقيقي'] || 0;
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
          'Row Labels': code,
          'Sum of عدد الكارتون': stats.cartons,
          'Sum of مبلغ الجمرك': stats.customs,
          'Sum of قيمة الاستحصالات': stats.collected,
          'Sum of متبقي حقيقي': stats.remaining,
        });
      });

    customsSummaryRows.push({
      'Row Labels': 'Grand Total',
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

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="metric-card" style={{ backgroundColor: '#1e3a8a' }}>
            <div className="metric-title">أجور الجمرك الكلي</div>
            <div className="metric-value">
              ${totalCustoms.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="metric-card" style={{ backgroundColor: '#0f766e' }}>
            <div className="metric-title">إجمالي المتبقي الحقيقي</div>
            <div className="metric-value">
              ${totalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="metric-card" style={{ backgroundColor: '#16a34a' }}>
            <div className="metric-title">إجمالي الاستحصالات (المسدد)</div>
            <div className="metric-value">
              ${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="metric-card" style={{ backgroundColor: '#dc2626' }}>
            <div className="metric-title">متبقي (لم تصل بعد)</div>
            <div className="metric-value">
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
          <div className="metric-card" style={{ backgroundColor: '#1e3a8a' }}>
            <div className="metric-title">إجمالي مبالغ الجمرك</div>
            <div className="metric-value">
              ${totalCustoms.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="metric-card" style={{ backgroundColor: '#059669' }}>
            <div className="metric-title">إجمالي الاستحصالات</div>
            <div className="metric-value">
              ${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="metric-card" style={{ backgroundColor: '#d97706' }}>
            <div className="metric-title">إجمالي المتبقي الحقيقي</div>
            <div className="metric-value">
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
          <button
            type="button"
            onClick={() => setShowFullMap(!showFullMap)}
            className="no-print text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Ship className="w-3.5 h-3.5" />
            <span>{showFullMap ? 'تصغير الخريطة (Mini Map)' : 'تكبير الخريطة الشاملة (Full Map)'}</span>
          </button>
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

    // Top 20 Customers air vs marine
    const custMap = new Map<string, { marine: number; air: number; other: number; total: number }>();
    filteredDf.forEach((r) => {
      const code = String(r['code'] || r['الكود'] || 'غير محدد').trim();
      const cont = String(r['رقم الحاوية'] || '').toUpperCase();
      const cartons = r['عدد الكارتون'] || 0;

      if (!custMap.has(code)) {
        custMap.set(code, { marine: 0, air: 0, other: 0, total: 0 });
      }
      const c = custMap.get(code)!;
      if (cont.startsWith('RQ')) c.marine += cartons;
      else if (cont.startsWith('RA')) c.air += cartons;
      else c.other += cartons;
      c.total += cartons;
    });

    const topCustomersList = Array.from(custMap.entries())
      .map(([code, data]) => ({
        الكود: code,
        '🚢 شحن بحري (RQ)': data.marine,
        '✈️ شحن جوي (RA)': data.air,
        '📦 أخرى / عام': data.other,
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

        <h4 className="text-sm font-semibold text-slate-400 mb-2">جدول أفضل 20 زبون:</h4>
        <AtlasCustomTable data={topCustomersList} />
      </div>
    );
  };

  /* ========================================================================= */
  /* 8. DATA ENTRY TAB                                                         */
  /* ========================================================================= */
  const renderDataEntry = () => {
    const handleCellChange = (index: number, key: string, value: any) => {
      setEditableRows((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [key]: value };
        return next;
      });
    };

    const handleAddNewRow = () => {
      const newRow: AtlasRow = {
        'No.': editableRows.length + 1,
        code: 'NEW_CODE',
        'Shipping mark': '',
        'عدد الكارتون': 0,
        الوزن: 0,
        حجم: 0,
        'رقم الحاوية': 'RQ6000',
        الكفيل: 'جديد',
        المجموع: 0,
        'الزبون دفع': 0,
        'المكتب دفع': 0,
        'مبلغ الجمرك': 0,
        'قيمة الاستحصالات': 0,
        'متبقي حقيقي': 0,
      };
      setEditableRows([newRow, ...editableRows]);
    };

    const handleSave = () => {
      setRawData(editableRows);
      setSaveSuccessToast(true);
      setTimeout(() => setSaveSuccessToast(false), 3500);
    };

    const columnsToEdit = [
      'No.',
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
      'مبلغ الجمرك',
      'قيمة الاستحصالات',
    ];

    return (
      <div>
        <h1 className="atlas-h1">📝 إدخال وتعديل البيانات محلياً</h1>
        <hr className="border-slate-700 my-4" />

        <p className="text-slate-300 text-sm mb-4">
          يمكنك تعديل البيانات مباشرة في الجدول أدناه، أو إضافة سجل جديد:
        </p>

        {saveSuccessToast && (
          <div className="mb-4 p-3 bg-emerald-900 border border-emerald-500 text-emerald-100 rounded-lg flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>تم حفظ التغييرات وتحديث بيانات الجلسة بنجاح!</span>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={handleAddNewRow}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة سجل جديد</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>💾 حفظ التغييرات وتحديث العرض</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900 max-h-[600px]">
          <table className="w-full text-xs text-right text-slate-200">
            <thead className="bg-[#0b2239] text-white font-bold sticky top-0">
              <tr>
                {columnsToEdit.map((col) => (
                  <th key={col} className="p-2 border border-slate-700 text-center">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {editableRows.slice(0, 100).map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-800 border-b border-slate-800">
                  {columnsToEdit.map((col) => (
                    <td key={col} className="p-1 border border-slate-800">
                      <input
                        type="text"
                        value={row[col] !== undefined ? row[col] : ''}
                        onChange={(e) => handleCellChange(rIdx, col, e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-700 rounded px-1.5 py-1 text-white text-xs text-center focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        className={`atlas-sidebar no-print w-full md:w-80 p-4 shrink-0 border-l border-slate-800 ${
          isSidebarOpen ? 'block' : 'hidden md:block'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🚢 شركة أطلس المحيط</span>
          </h2>
        </div>
        <hr className="border-slate-800 mb-4" />

        {/* Reload button matching Streamlit secondary button (red #dc2626) */}
        <button
          type="button"
          onClick={loadAllData}
          disabled={isLoading}
          style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
          className="w-full flex items-center justify-center gap-2 text-white font-bold py-2.5 px-4 rounded-lg text-sm mb-5 shadow hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>🔄 تحديث البيانات من جوجل شيت والمنصة</span>
        </button>

        {/* Filters */}
        <div className="mb-5 space-y-3.5 text-right">
          <h3 className="text-sm font-bold text-slate-200">🔍 الفلاتر الجانبية</h3>

          {/* Container Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              🚢 اختر رقم الحاوية:
            </label>
            <select
              value={selectedContainerFilter}
              onChange={(e) => setSelectedContainerFilter(e.target.value)}
              className="w-full bg-white text-black font-semibold text-xs p-2 rounded border border-slate-300 focus:outline-none"
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              🏷️ اختر الكود (Code):
            </label>
            <select
              value={selectedCodeFilter}
              onChange={(e) => setSelectedCodeFilter(e.target.value)}
              className="w-full bg-white text-black font-semibold text-xs p-2 rounded border border-slate-300 focus:outline-none"
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              👤 اختر اسم الكفيل:
            </label>
            <select
              value={selectedSponsorFilter}
              onChange={(e) => setSelectedSponsorFilter(e.target.value)}
              className="w-full bg-white text-black font-semibold text-xs p-2 rounded border border-slate-300 focus:outline-none"
            >
              {availableSponsors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <hr className="border-slate-800 my-4" />

        {/* Main Navigation Radio options */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-white mb-2.5">📌 القائمة الرئيسية</h3>
          <div className="space-y-1.5">
            {PAGE_OPTIONS.map((opt) => {
              const isActive = currentPage === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setCurrentPage(opt.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-right px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-700 text-white shadow'
                      : 'text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-white"></span>}
                </button>
              );
            })}
          </div>
        </div>

        <hr className="border-slate-800 my-4" />
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-emerald-400 font-semibold leading-relaxed">
          متصل بملفات Google Sheets ومنصة Freightower بنجاح ✔️
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto block-container">
        {isLoading && (
          <div className="p-8 text-center bg-slate-900 rounded-xl border border-slate-800 my-4">
            <RotateCcw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
            <div className="text-base font-bold text-white">جاري تحميل بيانات Google Sheets ومنظومة أطلس...</div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/80 border border-red-500 text-white rounded-lg mb-4 text-sm font-semibold">
            {error}
          </div>
        )}

        {!isLoading && (
          <>
            {currentPage === 'dashboard' && renderDashboard()}
            {currentPage === 'customs' && renderCustoms()}
            {currentPage === 'sponsors' && renderSponsors()}
            {currentPage === 'aging' && renderAging()}
            {currentPage === 'collections' && renderCollections()}
            {currentPage === 'tracking' && renderTracking()}
            {currentPage === 'charts' && renderCharts()}
            {currentPage === 'data_entry' && renderDataEntry()}
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
    </div>
  );
};
