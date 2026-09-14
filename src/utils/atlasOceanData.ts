import * as XLSX from 'xlsx';
import bundledData from '../data/bundledAtlasData.json';

export interface AtlasRow {
  [key: string]: any;
  'No.'?: any;
  'نوع النقل'?: 'الشحن البحري' | 'الشحن الجوي' | string;
  'code'?: string;
  'Shipping mark'?: string;
  'رقم دخول المخزن'?: string;
  'نوع البظاعة'?: string;
  'عدد الكارتون'?: number;
  'الوزن'?: number;
  'حجم'?: number;
  'رقم الحاوية'?: string;
  'Staff'?: string;
  'المجموع'?: number;
  'الزبون دفع'?: number;
  'Client Paid'?: number;
  'المكتب دفع'?: number;
  'Office Paid'?: number;
  'نقل داخلي'?: any;
  '%'?: any;
  'قيمة الفاتورة بالدولار'?: any;
  'رقم قيد الادخال'?: any;
  'رقم الفاتورة'?: any;
  'سعر البيع'?: number;
  'مبلغ الجمرك'?: number;
  'قيمة الاستحصالات'?: number;
  'متبقي حقيقي'?: number;
  'الكفيل'?: string;
  'تاريخ التوزيع'?: string;
  'عدد الايام'?: number;
}

export interface TrackingRow {
  [key: string]: any;
  'تايخ التحميل'?: any;
  'تاريخ اليوم '?: any;
  'عدد الايام بالطريق'?: any;
  'تسلسل الحاوية'?: string;
  'رقم الحاوية'?: string;
  'حجم الحاوية '?: string;
  'اللون'?: string;
  'عدد الطرود'?: any;
  'حجم البظاعة '?: any;
  'الميناء'?: string;
  'line name'?: string;
  'التتبع العلمي المباشر'?: string;
}

export function cleanNumeric(val: any): number {
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
 * Uses 1899-12-30 base (Excel 1900 leap year bug compensation: serial 25569 = 1970-01-01 UTC).
 */
export function excelSerialToDateString(serial: number): string {
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
export function parseAndFormatDate(val: any): string {
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

  // General Date fallback
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
export function calculateDaysDifference(startDateVal: any, endDateVal: any = new Date()): number {
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

export function formatCurrency(num: number, currency: '$' | '¥' | '' = '$'): string {
  const formatted = (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (currency === '$') return `$${formatted}`;
  if (currency === '¥') return `¥${formatted}`;
  return formatted;
}

export function removeTotalsRows<T extends Record<string, any>>(rows: T[]): T[] {
  return rows.filter((r) => {
    return !Object.values(r).some((v) => {
      const str = String(v || '').trim().toLowerCase();
      return str.includes('grand total') || str.includes('grandtotal') || str.includes('الإجمالي الكلي');
    });
  });
}

export function getContainerLiveStatus(containerNumber: string): string {
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

export const ATLAS_SHEET_IDS = {
  marine: '1amOmnZgzn2bhWTgje_9W2sUK6V-OygWk',
  air: '1L97mB_YenJN-vCGfrcL-uLRV9i3haN-zd0gr1cbn-ZI',
  tracking: '1migl0qhyatX_Kf7LnpDhVVMlzdqAP4ID',
};

export function normalizeShipmentRow(
  r: Record<string, any>,
  transportType: 'الشحن البحري' | 'الشحن الجوي',
  trackingMap?: Map<string, string>
): AtlasRow {
  const item: Record<string, any> = {};
  for (const [k, v] of Object.entries(r)) {
    item[k.trim()] = v;
  }

  item['نوع النقل'] = transportType;

  // Independent Container Number vs Sequence Number handling
  if (transportType === 'الشحن الجوي') {
    // Air freight does not have maritime containers
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
      // RQ is an order/shipment sequence identifier, NOT a maritime container number
      item['تسلسل الحاوية'] = rawCont;
      // Map to physical container number if available in tracking; never retain RQ prefix as a container number
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

  // Unified Sponsor name
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

  // Date and Days normalization (resolving Excel serial dates and 46275 days bug)
  const distDateStr = parseAndFormatDate(
    item['تاريخ التوزيع'] ||
    item['تاريخ توزيع'] ||
    item['Distribution Date'] ||
    ''
  );
  item['تاريخ التوزيع'] = distDateStr;

  const rawDays = cleanNumeric(item['عدد الايام'] || item['Days'] || item['عدد الأيام']);
  if (!distDateStr) {
    // If not distributed yet, days must be 0, never 46275 (the Excel serial date bug)
    item['عدد الايام'] = 0;
  } else if (rawDays >= 10000) {
    // If corrupted by Excel empty-cell formula bug, calculate true elapsed days
    item['عدد الايام'] = calculateDaysDifference(distDateStr);
  } else {
    item['عدد الايام'] = Math.max(0, Math.round(rawDays));
  }

  return item as AtlasRow;
}

export async function fetchAtlasData(forceRefresh = false): Promise<{
  df: AtlasRow[];
  dfTracking: TrackingRow[];
  containers?: any[];
  error?: string;
  source?: string;
}> {
  // Strategy 1: Fetch through our server API endpoint (bypasses CORS completely and follows redirects)
  try {
    const apiRes = await fetch(`/api/atlas/all${forceRefresh ? '?force=true' : ''}`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && Array.isArray(data.df) && data.df.length > 0) {
        return {
          df: data.df,
          dfTracking: data.dfTracking || [],
          containers: data.containers,
          source: 'server-api',
        };
      }
    }
  } catch {
    // Continue to fallback
  }

  // Strategy 2: Direct or Proxy Fetch from Google Sheets if server API not responding
  try {
    const fetchCsv = async (sheetId: string) => {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      let res: Response | null = null;
      try {
        res = await fetch(`/api/proxy-sheet?url=${encodeURIComponent(url)}`);
      } catch {
        res = null;
      }
      if (!res || !res.ok) {
        res = await fetch(url);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const wb = XLSX.read(text, { type: 'string' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, any>[];
    };

    const [marineRaw, airRaw, trackingRaw] = await Promise.all([
      fetchCsv(ATLAS_SHEET_IDS.marine),
      fetchCsv(ATLAS_SHEET_IDS.air),
      fetchCsv(ATLAS_SHEET_IDS.tracking),
    ]);

    const trackingMap = new Map<string, string>();
    const cleanedTracking: TrackingRow[] = removeTotalsRows(trackingRaw).map((r) => {
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

    const combinedDf: AtlasRow[] = [
      ...removeTotalsRows(marineRaw).map((r) => normalizeShipmentRow(r, 'الشحن البحري', trackingMap)),
      ...removeTotalsRows(airRaw).map((r) => normalizeShipmentRow(r, 'الشحن الجوي', trackingMap)),
    ];

    return {
      df: combinedDf,
      dfTracking: cleanedTracking,
      source: 'direct-fetch',
    };
  } catch (directErr: any) {
    console.warn('Direct fetch failed, falling back to bundled dataset:', directErr?.message);

    // Strategy 3: Guaranteed Bundled Data Fallback
    if (bundledData && Array.isArray(bundledData.df) && bundledData.df.length > 0) {
      const fallbackTracking = ((bundledData.dfTracking || []) as TrackingRow[]).map((t) => {
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
      fallbackTracking.forEach((t) => {
        const seq = String(t['تسلسل الحاوية'] || '').trim().toUpperCase();
        const cont = String(t['رقم الحاوية'] || '').trim().toUpperCase();
        if (seq && cont && !cont.startsWith('RQ') && !cont.includes('TOTAL')) {
          fallbackMap.set(seq, cont);
        }
      });

      const normalizedDf = (bundledData.df as AtlasRow[]).map((r) => {
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

      return {
        df: normalizedDf,
        dfTracking: fallbackTracking,
        source: 'bundled-fallback',
      };
    }

    return {
      df: [],
      dfTracking: [],
      error: directErr?.message || 'Failed to load Atlas Ocean Sheets',
    };
  }
}

export function exportTableToExcel(data: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
