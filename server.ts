import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as XLSX from 'xlsx';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.use(express.json());

// Google Sheet IDs
const ATLAS_SHEET_IDS = {
  marine: '1amOmnZgzn2bhWTgje_9W2sUK6V-OygWk',
  air: '1L97mB_YenJN-vCGfrcL-uLRV9i3haN-zd0gr1cbn-ZI',
  tracking: '1migl0qhyatX_Kf7LnpDhVVMlzdqAP4ID',
};

// In-memory cache
interface CachedData {
  df: any[];
  dfTracking: any[];
  containers: any[];
  timestamp: number;
}

let cache: CachedData | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute auto refresh

function cleanNumeric(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const s = String(val)
    .replace(/¥/g, '')
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Converts an Excel date serial number to YYYY-MM-DD string.
 * Base 1899-12-30 (serial 25569 = 1970-01-01 UTC).
 */
function excelSerialToDateString(serial: number): string {
  if (isNaN(serial) || serial <= 0) return '';
  const utcDays = Math.floor(serial - 25569);
  const utcMs = utcDays * 86400 * 1000;
  const d = new Date(utcMs);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Robust date parser and formatter that safely normalizes:
 * - Excel serial date numbers (e.g. 46275, 46198, 46270)
 * - ISO date strings (2026-09-10)
 * - Slashed strings (2026/09/10, 10/09/2026)
 * - Date objects
 * - Cleans 'nan', 'none', '-', null, undefined gracefully to ''
 */
function parseAndFormatDate(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return '';
    if (val >= 30000 && val <= 65000) {
      return excelSerialToDateString(val);
    }
    if (val > 1000000000000) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    }
    return '';
  }

  const s = String(val).trim();
  if (!s || s === '-' || s.toLowerCase() === 'nan' || s.toLowerCase() === 'none' || s.toLowerCase() === 'null') {
    return '';
  }

  // Pure numeric string representing Excel serial date (e.g. "46275" or "46275.0")
  if (/^\d{4,5}(\.\d+)?$/.test(s)) {
    const num = parseFloat(s);
    if (num >= 30000 && num <= 65000) {
      return excelSerialToDateString(num);
    }
  }

  // Already standard ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // Timestamp format YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    return s.slice(0, 10);
  }

  // Slashed date format: YYYY/MM/DD or DD/MM/YYYY
  if (s.includes('/')) {
    const parts = s.split(/[\/\s]/)[0].split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const yyyy = parts[0];
        const mm = parts[1].padStart(2, '0');
        const dd = parts[2].padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      } else if (parts[2].length === 4) {
        const yyyy = parts[2];
        const mm = parts[1].padStart(2, '0');
        const dd = parts[0].padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    }
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    if (yyyy >= 1990 && yyyy <= 2100) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  return s;
}

/**
 * Accurately calculate the elapsed days between two dates,
 * or from a start date to today.
 */
function calculateDaysDifference(startDateVal: any, endDateVal: any = new Date()): number {
  const startStr = parseAndFormatDate(startDateVal);
  if (!startStr) return 0;
  const startMs = new Date(startStr).getTime();
  if (isNaN(startMs)) return 0;

  let endMs: number;
  if (endDateVal instanceof Date) {
    endMs = endDateVal.getTime();
  } else {
    const endStr = parseAndFormatDate(endDateVal);
    endMs = endStr ? new Date(endStr).getTime() : Date.now();
  }
  if (isNaN(endMs)) return 0;

  const diffMs = endMs - startMs;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function removeTotalsRows(rows: any[]): any[] {
  return rows.filter((r) => {
    return !Object.values(r).some((v) => {
      const str = String(v || '').trim().toLowerCase();
      return str.includes('grand total') || str.includes('grandtotal') || str.includes('الإجمالي الكلي');
    });
  });
}

function getContainerLiveStatus(containerNumber: string): string {
  if (!containerNumber || ['nan', 'none', ''].includes(String(containerNumber).toLowerCase().trim())) {
    return 'غير متوفر';
  }
  const str = String(containerNumber).trim().toUpperCase();
  if (str.startsWith('CMA')) {
    return '🟢 في البحر (متحرك - CMA CGM - مفعل VIP)';
  } else if (str.startsWith('ECMU')) {
    return '🔵 واصل إلى الميناء (تم التفريغ - مفعل VIP)';
  } else if (str.startsWith('TCKU') || str.startsWith('SEGU') || str.startsWith('TIIU')) {
    return '🟡 في منطقة الانتظار (مفعل VIP)';
  } else {
    return '🔵 قيد المتابعة الملاحية (مفعل VIP)';
  }
}

async function fetchGoogleSheetCsv(sheetId: string): Promise<Record<string, any>[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet ${sheetId} (HTTP ${res.status})`);
  }
  const text = await res.text();
  const wb = XLSX.read(text, { type: 'string' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, any>[];
}

function normalizeRow(
  r: Record<string, any>,
  transportType: 'الشحن البحري' | 'الشحن الجوي',
  trackingMap?: Map<string, string>
): Record<string, any> {
  const item: Record<string, any> = {};
  for (const [k, v] of Object.entries(r)) {
    item[k.trim()] = v;
  }

  item['نوع النقل'] = transportType;

  // Independent Container Number vs Sequence Number handling
  if (transportType === 'الشحن الجوي') {
    item['رقم الحاوية'] = '';
    item['تسلسل الحاوية'] = '';
  } else {
    const rawCont = String(
      item['رقم الحاوية'] ||
      item['Container NO.'] ||
      item['Container No.'] ||
      item['Container'] ||
      item['حاوية'] ||
      ''
    ).trim();

    const rawSeq = String(
      item['تسلسل الحاوية'] ||
      item['Sequence'] ||
      item['Seq'] ||
      ''
    ).trim();

    if (rawCont.toUpperCase().startsWith('RQ')) {
      item['تسلسل الحاوية'] = rawCont;
      item['رقم الحاوية'] = (trackingMap && trackingMap.get(rawCont.toUpperCase())) || '';
    } else if (rawCont.toUpperCase().startsWith('RA')) {
      item['تسلسل الحاوية'] = rawCont;
      item['رقم الحاوية'] = '';
    } else {
      item['رقم الحاوية'] = rawCont;
      item['تسلسل الحاوية'] = rawSeq;
    }
  }

  // Unified Client Code mapping
  item['code'] = String(
    item['code'] ||
    item['الكود'] ||
    item['Code'] ||
    item['CODE'] ||
    ''
  ).trim();

  // Unified Shipping mark / PO
  item['Shipping mark'] = String(
    item['Shipping mark'] ||
    item['Shipping Mark'] ||
    item['مارك'] ||
    item['Order NO.'] ||
    item['رقم الفاتورة'] ||
    item['code'] ||
    ''
  ).trim();

  // Unified Sponsor
  item['الكفيل'] = String(
    item['الكفيل'] ||
    item['كفيل'] ||
    item['Sponsor'] ||
    ''
  ).trim();

  // Numeric fields
  item['عدد الكارتون'] = cleanNumeric(item['عدد الكارتون'] || item['Ctns'] || item['ctns'] || item['عدد الطرود']);
  item['الوزن'] = cleanNumeric(item['الوزن'] || item['Weight'] || item['weight']);
  item['حجم'] = cleanNumeric(item['حجم'] || item['Cbm'] || item['cbm'] || item['الحجم']);
  
  item['المجموع'] = cleanNumeric(item['المجموع'] || item['Total'] || item['Amount']);
  item['متبقي حقيقي'] = cleanNumeric(item['متبقي حقيقي']);
  item['مبلغ الجمرك'] = cleanNumeric(item['مبلغ الجمرك']) || item['المجموع'];
  item['قيمة الاستحصالات'] = cleanNumeric(item['قيمة الاستحصالات']) || Math.max(0, item['مبلغ الجمرك'] - item['متبقي حقيقي']);

  item['الزبون دفع'] = cleanNumeric(item['الزبون دفع'] || item['Client paid'] || item['Client Paid']);
  item['Client Paid'] = item['الزبون دفع'];
  item['المكتب دفع'] = cleanNumeric(item['المكتب دفع'] || item['Office paid'] || item['Office Paid']);
  item['Office Paid'] = item['المكتب دفع'];

  item['نقل داخلي'] = cleanNumeric(item['نقل داخلي'] || item['Trucking fees'] || item['Trucking Fees']);
  item['%'] = cleanNumeric(item['%']) || 6.8;
  item['قيمة الفاتورة بالدولار'] = cleanNumeric(item['قيمة الفاتورة بالدولار'] || item['$'] || item['USD']);
  item['سعر البيع'] = cleanNumeric(item['سعر البيع'] || item['Selling Price']);

  // Date and Days normalization
  const distDateStr = parseAndFormatDate(
    item['تاريخ التوزيع'] ||
    item['تاريخ توزيع'] ||
    item['Distribution Date'] ||
    ''
  );
  item['تاريخ التوزيع'] = distDateStr;

  const rawDays = cleanNumeric(item['عدد الايام'] || item['Days'] || item['عدد الأيام']);
  if (!distDateStr) {
    item['عدد الايام'] = 0;
  } else if (rawDays >= 10000) {
    item['عدد الايام'] = calculateDaysDifference(distDateStr);
  } else {
    item['عدد الايام'] = Math.max(0, Math.round(rawDays));
  }

  return item;
}

// Convert 39 tracking rows to Container objects for Map & Satellite tracking
function buildContainersFromTracking(trackingRows: any[]): any[] {
  const routes: Record<string, any> = {
    UMMQASR: {
      dest: { name: 'ميناء أم قصر التجاري (Umm Qasr)', city: 'أم قصر', country: 'العراق', coords: { lat: 30.0333, lng: 47.9333 } },
      waypoints: [
        { lat: 22.6450, lng: 113.6700 },
        { lat: 14.2, lng: 112.5 },
        { lat: 1.25, lng: 103.8 },
        { lat: 5.8, lng: 80.2 },
        { lat: 16.0, lng: 62.0 },
        { lat: 24.5, lng: 58.5 },
        { lat: 26.5, lng: 56.4 },
        { lat: 27.8, lng: 51.2 },
        { lat: 30.0333, lng: 47.9333 }
      ]
    },
    AQABA: {
      dest: { name: 'ميناء العقبة للحاويات (Aqaba)', city: 'العقبة', country: 'الأردن', coords: { lat: 29.53, lng: 35.00 } },
      waypoints: [
        { lat: 22.6450, lng: 113.6700 },
        { lat: 14.2, lng: 112.5 },
        { lat: 1.25, lng: 103.8 },
        { lat: 5.8, lng: 80.2 },
        { lat: 12.5, lng: 58.0 },
        { lat: 12.5, lng: 48.0 },
        { lat: 12.6, lng: 43.3 },
        { lat: 20.5, lng: 38.5 },
        { lat: 28.5, lng: 34.7 },
        { lat: 29.53, lng: 35.00 }
      ]
    },
    MERSIN: {
      dest: { name: 'ميناء مرسين الدولي (Mersin)', city: 'مرسين', country: 'تركيا', coords: { lat: 36.80, lng: 34.64 } },
      waypoints: [
        { lat: 22.6450, lng: 113.6700 },
        { lat: 14.2, lng: 112.5 },
        { lat: 1.25, lng: 103.8 },
        { lat: 5.8, lng: 80.2 },
        { lat: 12.5, lng: 48.0 },
        { lat: 12.6, lng: 43.3 },
        { lat: 22.0, lng: 38.0 },
        { lat: 29.9, lng: 32.5 },
        { lat: 34.5, lng: 33.5 },
        { lat: 36.80, lng: 34.64 }
      ]
    }
  };

  return trackingRows.map((r, idx) => {
    const rawPort = String(r['الميناء'] || '').toUpperCase().replace(/[\s\n\r_-]/g, '');
    let route = routes.UMMQASR;
    if (rawPort.includes('AQABA') || rawPort.includes('عقبة')) route = routes.AQABA;
    else if (rawPort.includes('MERSIN') || rawPort.includes('مرسين')) route = routes.MERSIN;

    const days = cleanNumeric(r['عدد الايام بالطريق']);
    const isArrived = days >= 42;
    const progress = Math.min(100, Math.max(8, isArrived ? 100 : Math.round((days / 38) * 100)));
    const segCount = route.waypoints.length - 1;
    const frac = (progress / 100) * segCount;
    const sIdx = Math.min(Math.floor(frac), segCount - 1);
    const sFrac = frac - sIdx;
    const p1 = route.waypoints[sIdx];
    const p2 = route.waypoints[sIdx + 1];

    const currentCoords = {
      lat: Number((p1.lat + (p2.lat - p1.lat) * sFrac).toFixed(4)),
      lng: Number((p1.lng + (p2.lng - p1.lng) * sFrac).toFixed(4)),
    };

    const seq = String(r['تسلسل الحاوية'] || '').trim();
    const contNo = String(r['رقم الحاوية'] || '').trim();
    const code = contNo || seq || `CONT-${idx + 1}`;
    const lineName = String(r['line name'] || 'CMA').trim();

    const loadDateStr = parseAndFormatDate(r['تايخ التحميل'] || r['تاريخ التحميل']);
    const departureDate = loadDateStr ? `${loadDateStr}T04:00:00Z` : '2026-08-25T04:00:00Z';

    // Calculate estimated arrival (approx 40 days from departure)
    let etaDateStr = '2026-09-18';
    if (loadDateStr) {
      const loadDateObj = new Date(loadDateStr);
      const etaObj = new Date(loadDateObj.getTime() + 40 * 24 * 3600 * 1000);
      etaDateStr = parseAndFormatDate(etaObj);
    }

    return {
      id: code,
      sequenceNumber: seq,
      title: `حاوية ${seq} (${code})`,
      carrier: `${lineName} Global Marine`,
      carrierCode: lineName.slice(0, 4).toUpperCase(),
      vesselName: `${lineName} Express ${idx + 101}`,
      voyageNumber: `VOY-2026-${100 + idx}`,
      type: String(r['حجم الحاوية '] || r['حجم الحاوية'] || '40 HQ').trim().includes('40') ? '40ft High Cube' : '40ft Standard',
      cargoDescription: `بضائع عامة وطرود - ${cleanNumeric(r['عدد الطرود'])} طرد (${cleanNumeric(r['حجم البظاعة '])} m³)`,
      weightKg: Math.round(cleanNumeric(r['حجم البظاعة ']) * 350) || 22000,
      packagesCount: cleanNumeric(r['عدد الطرود']),
      volumeCbm: cleanNumeric(r['حجم البظاعة ']),
      containerColor: String(r['اللون'] || '').trim() || undefined,
      daysInTransit: days,
      lineName,
      originPort: {
        name: 'ميناء نانشا الدولي (Port of Nansha)',
        city: 'نانشا (قوانغتشو)',
        country: 'الصين',
        coordinates: { lat: 22.6450, lng: 113.6700 },
        departureDate,
      },
      destinationPort: {
        name: route.dest.name,
        city: route.dest.city,
        country: route.dest.country,
        coordinates: route.dest.coords,
        estimatedArrival: `${etaDateStr}T12:00:00Z`,
      },
      currentLocation: {
        name: isArrived ? `ميناء ${route.dest.city} (تم التفريغ)` : `في المسار البحري نحو ميناء ${route.dest.city}`,
        coordinates: currentCoords,
        speedKnots: isArrived ? 0 : 17.5,
        headingDeg: 280,
        lastUpdated: new Date().toISOString(),
        status: isArrived ? 'In Port' : 'At Sea',
      },
      progressPercent: progress,
      routeWaypoints: route.waypoints,
      currentWaypointIndex: sIdx,
      dailyMovementNauticalMiles: isArrived ? 0 : 380,
      batteryLevel: 95,
      milestones: [
        {
          id: `m1-${idx}`,
          title: 'تحميل البضائع ومغادرة ميناء نانشا GOCT',
          location: 'ميناء نانشا، الصين',
          date: loadDateStr || '2026-08-25',
          completed: true,
        },
        {
          id: `m2-${idx}`,
          title: 'الإبحار الملاحي المباشر',
          location: `المسار الدولي - اليوم ${days}`,
          date: 'اليوم',
          completed: true,
          isCurrent: !isArrived,
        },
        {
          id: `m3-${idx}`,
          title: 'الوصول والتخليص الجمركي بميناء الوجهة',
          location: route.dest.name,
          date: etaDateStr,
          completed: isArrived,
          isCurrent: isArrived,
        },
      ],
    };
  });
}

async function loadDataFromSheets(forceRefresh = false): Promise<CachedData> {
  const now = Date.now();
  if (!forceRefresh && cache && (now - cache.timestamp < CACHE_TTL_MS)) {
    return cache;
  }

  try {
    const [marineRaw, airRaw, trackingRaw] = await Promise.all([
      fetchGoogleSheetCsv(ATLAS_SHEET_IDS.marine),
      fetchGoogleSheetCsv(ATLAS_SHEET_IDS.air),
      fetchGoogleSheetCsv(ATLAS_SHEET_IDS.tracking),
    ]);

    const trackingMap = new Map<string, string>();
    const cleanedTracking = removeTotalsRows(trackingRaw).map((r) => {
      const cleaned: any = {};
      for (const [k, v] of Object.entries(r)) {
        cleaned[k.trim()] = v;
      }
      const contCol = cleaned['رقم الحاوية'] || cleaned['رقم الحاويات'] || cleaned['Container'] || '';
      cleaned['التتبع العلمي المباشر'] = getContainerLiveStatus(contCol);

      // Date parsing for tracking rows
      cleaned['تايخ التحميل'] = parseAndFormatDate(cleaned['تايخ التحميل'] || cleaned['تاريخ التحميل']);
      cleaned['تاريخ اليوم '] = parseAndFormatDate(cleaned['تاريخ اليوم '] || cleaned['تاريخ اليوم']);

      let transitDays = cleanNumeric(cleaned['عدد الايام بالطريق']);
      if ((!transitDays || transitDays <= 0 || transitDays >= 10000) && cleaned['تايخ التحميل']) {
        transitDays = calculateDaysDifference(cleaned['تايخ التحميل'], cleaned['تاريخ اليوم ']);
      }
      cleaned['عدد الايام بالطريق'] = Math.max(0, Math.round(transitDays));

      const seq = String(cleaned['تسلسل الحاوية'] || '').trim().toUpperCase();
      const cont = String(cleaned['رقم الحاوية'] || '').trim().toUpperCase();
      if (seq && cont && !cont.startsWith('RQ') && !cont.includes('TOTAL')) {
        trackingMap.set(seq, cont);
      }
      return cleaned;
    });

    const combinedDf = [
      ...removeTotalsRows(marineRaw).map((r) => normalizeRow(r, 'الشحن البحري', trackingMap)),
      ...removeTotalsRows(airRaw).map((r) => normalizeRow(r, 'الشحن الجوي', trackingMap)),
    ];

    const parsedContainers = buildContainersFromTracking(cleanedTracking);

    cache = {
      df: combinedDf,
      dfTracking: cleanedTracking,
      containers: parsedContainers,
      timestamp: now,
    };

    return cache;
  } catch (err: any) {
    console.error('Failed to load from Google Sheets directly:', err.message);

    // Fallback to bundled data if available
    try {
      const bundlePath = path.join(process.cwd(), 'src', 'data', 'bundledAtlasData.json');
      if (fs.existsSync(bundlePath)) {
        const raw = fs.readFileSync(bundlePath, 'utf8');
        const parsed = JSON.parse(raw);
        const fallbackTracking = (parsed.dfTracking || []).map((t: any) => {
          const load = parseAndFormatDate(t['تايخ التحميل'] || t['تاريخ التحميل']);
          const today = parseAndFormatDate(t['تاريخ اليوم '] || t['تاريخ اليوم']);
          let days = cleanNumeric(t['عدد الايام بالطريق']);
          if ((!days || days <= 0 || days >= 10000) && load) {
            days = calculateDaysDifference(load, today);
          }
          return {
            ...t,
            'تايخ التحميل': load,
            'تاريخ اليوم ': today,
            'عدد الايام بالطريق': Math.max(0, Math.round(days)),
          };
        });

        const fallbackMap = new Map<string, string>();
        fallbackTracking.forEach((t: any) => {
          const seq = String(t['تسلسل الحاوية'] || '').trim().toUpperCase();
          const cont = String(t['رقم الحاوية'] || '').trim().toUpperCase();
          if (seq && cont && !cont.startsWith('RQ') && !cont.includes('TOTAL')) {
            fallbackMap.set(seq, cont);
          }
        });
        const normalizedDf = (parsed.df || []).map((r: any) => {
          const transport = String(r['نوع النقل'] || '');
          const distDateStr = parseAndFormatDate(r['تاريخ التوزيع'] || '');
          const rawDays = cleanNumeric(r['عدد الايام']);
          let cleanDays = 0;
          if (!distDateStr) {
            cleanDays = 0;
          } else if (rawDays >= 10000) {
            cleanDays = calculateDaysDifference(distDateStr);
          } else {
            cleanDays = Math.max(0, Math.round(rawDays));
          }

          if (transport.includes('جوي')) {
            return {
              ...r,
              'تاريخ التوزيع': distDateStr,
              'عدد الايام': cleanDays,
              'رقم الحاوية': '',
              'تسلسل الحاوية': '',
            };
          }
          const rawCont = String(r['رقم الحاوية'] || r['Container NO.'] || '').trim();
          const rawSeq = String(r['تسلسل الحاوية'] || '').trim();
          if (rawCont.toUpperCase().startsWith('RQ')) {
            const mapped = fallbackMap.get(rawCont.toUpperCase()) || '';
            return {
              ...r,
              'تاريخ التوزيع': distDateStr,
              'عدد الايام': cleanDays,
              'تسلسل الحاوية': rawCont,
              'رقم الحاوية': mapped,
            };
          }
          if (rawCont.toUpperCase().startsWith('RA')) {
            return {
              ...r,
              'تاريخ التوزيع': distDateStr,
              'عدد الايام': cleanDays,
              'تسلسل الحاوية': rawCont,
              'رقم الحاوية': '',
            };
          }
          return {
            ...r,
            'تاريخ التوزيع': distDateStr,
            'عدد الايام': cleanDays,
            'رقم الحاوية': rawCont,
            'تسلسل الحاوية': rawSeq,
          };
        });

        const parsedContainers = buildContainersFromTracking(fallbackTracking);
        cache = {
          df: normalizedDf,
          dfTracking: fallbackTracking,
          containers: parsedContainers,
          timestamp: now,
        };
        return cache;
      }
    } catch (e) {
      console.warn('Fallback to bundle failed:', e);
    }

    throw err;
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

app.get('/api/atlas/all', async (req, res) => {
  const force = req.query.force === 'true';
  try {
    const data = await loadDataFromSheets(force);
    res.json({
      success: true,
      df: data.df,
      dfTracking: data.dfTracking,
      containers: data.containers,
      totalShipments: data.df.length,
      totalTracking: data.dfTracking.length,
      timestamp: data.timestamp,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch Atlas Ocean sheets',
    });
  }
});

app.post('/api/atlas/refresh', async (req, res) => {
  try {
    const data = await loadDataFromSheets(true);
    res.json({
      success: true,
      message: 'Refreshed successfully from Google Sheets',
      totalShipments: data.df.length,
      totalTracking: data.dfTracking.length,
      timestamp: data.timestamp,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to refresh from Google Sheets',
    });
  }
});

// Sheet proxy helper
app.get('/api/proxy-sheet', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }
  try {
    const upstreamRes = await fetch(targetUrl, { redirect: 'follow' });
    const contentType = upstreamRes.headers.get('content-type') || 'text/csv';
    const text = await upstreamRes.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    res.send(text);
  } catch (err: any) {
    res.status(502).send(err.message || 'Proxy error');
  }
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Atlas Ocean Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
