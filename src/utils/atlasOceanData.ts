import * as XLSX from 'xlsx';

export interface AtlasRow {
  [key: string]: any;
  'No.'?: any;
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

export function formatCurrency(num: number, currency: '$' | '¥' | '' = '$'): string {
  const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

export async function fetchAtlasData(): Promise<{
  df: AtlasRow[];
  dfTracking: TrackingRow[];
  error?: string;
}> {
  try {
    const fetchCsv = async (sheetId: string) => {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch sheet ${sheetId}`);
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

    // Clean tracking rows
    const cleanedTracking: TrackingRow[] = removeTotalsRows(trackingRaw).map((r) => {
      const cleaned: any = {};
      for (const [k, v] of Object.entries(r)) {
        cleaned[k.trim()] = v;
      }
      const contCol = cleaned['رقم الحاوية'] || cleaned['رقم الحاويات'] || cleaned['Container'] || '';
      cleaned['التتبع العلمي المباشر'] = getContainerLiveStatus(contCol);
      return cleaned;
    });

    // Standardize & combine marine + air
    const cleanRows = (rawRows: Record<string, any>[]) => {
      return removeTotalsRows(rawRows).map((r) => {
        const item: any = {};
        for (const [k, v] of Object.entries(r)) {
          item[k.trim()] = v;
        }

        // Numeric fields
        item['عدد الكارتون'] = cleanNumeric(item['عدد الكارتون']);
        item['الوزن'] = cleanNumeric(item['الوزن']);
        item['حجم'] = cleanNumeric(item['حجم']);
        item['المجموع'] = cleanNumeric(item['المجموع']);
        item['الزبون دفع'] = cleanNumeric(item['الزبون دفع'] || item['Client Paid']);
        item['Client Paid'] = item['الزبون دفع'];
        item['المكتب دفع'] = cleanNumeric(item['المكتب دفع'] || item['Office Paid']);
        item['Office Paid'] = item['المكتب دفع'];
        item['نقل داخلي'] = cleanNumeric(item['نقل داخلي']);
        item['%'] = cleanNumeric(item['%']) || 6.8;
        item['قيمة الفاتورة بالدولار'] = cleanNumeric(item['قيمة الفاتورة بالدولار']);
        item['سعر البيع'] = cleanNumeric(item['سعر البيع']);
        item['مبلغ الجمرك'] = cleanNumeric(item['مبلغ الجمرك']);
        item['قيمة الاستحصالات'] = cleanNumeric(item['قيمة الاستحصالات']);
        item['متبقي حقيقي'] = cleanNumeric(item['متبقي حقيقي']) || (item['مبلغ الجمرك'] - item['قيمة الاستحصالات']);
        item['عدد الايام'] = cleanNumeric(item['عدد الايام']);

        return item as AtlasRow;
      });
    };

    const combinedDf = [...cleanRows(marineRaw), ...cleanRows(airRaw)];

    return {
      df: combinedDf,
      dfTracking: cleanedTracking,
    };
  } catch (err: any) {
    console.error('Atlas Ocean Data fetch error:', err);
    return {
      df: [],
      dfTracking: [],
      error: err?.message || 'Failed to load Atlas Ocean Sheets',
    };
  }
}

export function exportTableToExcel(data: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
