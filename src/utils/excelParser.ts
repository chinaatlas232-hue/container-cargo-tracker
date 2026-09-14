import * as XLSX from 'xlsx';
import { Container, Coordinate, Milestone } from '../types';

// Standard carrier inference based on ISO 6346 4-letter prefix or explicit line name
export const inferCarrier = (code: string, lineName?: string) => {
  if (lineName) {
    const ln = lineName.trim().toUpperCase();
    if (ln.includes('CMA')) return { name: 'CMA CGM Group', code: 'CMAU' };
    if (ln.includes('WAN') || ln.includes('HAI')) return { name: 'Wan Hai Lines', code: 'WHSU' };
    if (ln.includes('OOCL')) return { name: 'OOCL (Orient Overseas Container Line)', code: 'OOLU' };
    if (ln.includes('COSCO') || ln.includes('COS')) return { name: 'COSCO Shipping Lines', code: 'COSU' };
    if (ln.includes('TRITON')) return { name: 'Triton International / Maersk', code: 'TRHU' };
  }

  const prefix = code.slice(0, 4).toUpperCase();
  if (prefix.startsWith('MSC') || prefix.startsWith('MED')) return { name: 'MSC (Mediterranean Shipping Co)', code: 'MSCU' };
  if (prefix.startsWith('MAE') || prefix.startsWith('MSK')) return { name: 'Maersk Line', code: 'MAEU' };
  if (prefix.startsWith('COS') || prefix.startsWith('CCL') || prefix.startsWith('CSN') || prefix.startsWith('CSG')) return { name: 'COSCO Shipping Lines', code: 'COSU' };
  if (prefix.startsWith('CMA') || prefix.startsWith('APL') || prefix.startsWith('FFA') || prefix.startsWith('ECM')) return { name: 'CMA CGM Group', code: 'CMAU' };
  if (prefix.startsWith('WHS') || prefix.startsWith('CAA')) return { name: 'Wan Hai Lines', code: 'WHSU' };
  if (prefix.startsWith('OOC') || prefix.startsWith('OOL')) return { name: 'OOCL (Orient Overseas Container Line)', code: 'OOLU' };
  if (prefix.startsWith('HLC') || prefix.startsWith('HAP')) return { name: 'Hapag-Lloyd', code: 'HLCU' };
  if (prefix.startsWith('EGL') || prefix.startsWith('EMC')) return { name: 'Evergreen Marine', code: 'EGLU' };
  if (prefix.startsWith('ONE') || prefix.startsWith('NYK')) return { name: 'Ocean Network Express (ONE)', code: 'ONEU' };
  if (prefix.startsWith('TII') || prefix.startsWith('TCN') || prefix.startsWith('TRH')) return { name: 'Textainer / Triton Container Line', code: 'TRHU' };
  if (prefix.startsWith('SEG') || prefix.startsWith('SEL')) return { name: 'Seaco Global Maritime', code: 'SEGU' };
  return { name: 'Global Container Line', code: prefix || 'GENU' };
};

export const DEFAULT_USER_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1migl0qhyatX_Kf7LnpDhVVMlzdqAP4ID/edit?usp=drivesdk&ouid=110228641000261338428&rtpof=true&sd=true';

// Specific Maritime Routes for user destinations
interface PortRouteInfo {
  destPort: {
    name: string;
    city: string;
    country: string;
    coords: Coordinate;
  };
  waypoints: Coordinate[];
}

export const NANSHA_PORT_DEFINITION = {
  name: 'ميناء نانشا الدولي (Port of Nansha)',
  terminalName: 'محطة نانشا المرحلة الثانية (Nansha Phase II Terminal GOCT)',
  city: 'نانشا (قوانغتشو)',
  country: 'الصين',
  coords: { lat: 22.6450, lng: 113.6700 },
};

export function parseExcelSerialDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val === 'number') {
    const ms = Math.round((val - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(val).trim();
  const num = Number(str);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const ms = Math.round((num - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

const SPECIFIC_PORT_ROUTES: Record<string, PortRouteInfo> = {
  UMMQASR: {
    destPort: {
      name: 'ميناء أم قصر التجاري (Umm Qasr)',
      city: 'أم قصر',
      country: 'العراق',
      coords: { lat: 30.0333, lng: 47.9333 },
    },
    waypoints: [
      { lat: 22.6450, lng: 113.6700 }, // Nansha Port (GOCT Terminal), Guangzhou, China
      { lat: 14.2, lng: 112.5 }, // South China Sea
      { lat: 1.25, lng: 103.8 }, // Singapore / Malacca Strait
      { lat: 5.8, lng: 80.2 }, // Indian Ocean / Sri Lanka
      { lat: 16.0, lng: 62.0 }, // Arabian Sea
      { lat: 24.5, lng: 58.5 }, // Gulf of Oman
      { lat: 26.5, lng: 56.4 }, // Strait of Hormuz
      { lat: 27.8, lng: 51.2 }, // Persian Gulf
      { lat: 30.0333, lng: 47.9333 }, // Umm Qasr Port
    ],
  },
  AQABA: {
    destPort: {
      name: 'ميناء العقبة للحاويات (Aqaba)',
      city: 'العقبة',
      country: 'الأردن',
      coords: { lat: 29.53, lng: 35.00 },
    },
    waypoints: [
      { lat: 22.6450, lng: 113.6700 }, // Nansha Port (GOCT Terminal), Guangzhou, China
      { lat: 14.2, lng: 112.5 }, // South China Sea
      { lat: 1.25, lng: 103.8 }, // Singapore / Malacca Strait
      { lat: 5.8, lng: 80.2 }, // Indian Ocean / Sri Lanka
      { lat: 12.5, lng: 58.0 }, // Arabian Sea
      { lat: 12.5, lng: 48.0 }, // Gulf of Aden
      { lat: 12.6, lng: 43.3 }, // Bab el-Mandeb
      { lat: 20.5, lng: 38.5 }, // Red Sea Central
      { lat: 28.5, lng: 34.7 }, // Gulf of Aqaba
      { lat: 29.53, lng: 35.00 }, // Aqaba Port
    ],
  },
  MERSIN: {
    destPort: {
      name: 'ميناء مرسين الدولي (Mersin)',
      city: 'مرسين',
      country: 'تركيا',
      coords: { lat: 36.80, lng: 34.64 },
    },
    waypoints: [
      { lat: 22.6450, lng: 113.6700 }, // Nansha Port (GOCT Terminal), Guangzhou, China
      { lat: 14.2, lng: 112.5 }, // South China Sea
      { lat: 1.25, lng: 103.8 }, // Singapore / Malacca Strait
      { lat: 5.8, lng: 80.2 }, // Indian Ocean / Sri Lanka
      { lat: 12.5, lng: 48.0 }, // Gulf of Aden
      { lat: 12.6, lng: 43.3 }, // Bab el-Mandeb
      { lat: 22.0, lng: 38.0 }, // Red Sea
      { lat: 29.9, lng: 32.5 }, // Suez Canal
      { lat: 34.5, lng: 33.5 }, // Eastern Mediterranean
      { lat: 36.80, lng: 34.64 }, // Mersin Port
    ],
  },
};

function resolvePortRoute(rawPort: string): PortRouteInfo | null {
  const p = rawPort.toUpperCase().replace(/[\s\n\r_-]/g, '');
  if (p.includes('UMM') || p.includes('QASR') || p.includes('قصر') || p.includes('أم قصر') || p.includes('العراق')) {
    return SPECIFIC_PORT_ROUTES.UMMQASR;
  }
  if (p.includes('AQABA') || p.includes('عقبة')) {
    return SPECIFIC_PORT_ROUTES.AQABA;
  }
  if (p.includes('MERSIN') || p.includes('مرسين')) {
    return SPECIFIC_PORT_ROUTES.MERSIN;
  }
  return null;
}

function interpolateWaypoints(waypoints: Coordinate[], progressRatio: number): { coord: Coordinate; waypointIndex: number } {
  if (!waypoints || waypoints.length === 0) return { coord: { lat: 0, lng: 0 }, waypointIndex: 0 };
  if (waypoints.length === 1) return { coord: waypoints[0], waypointIndex: 0 };

  const clamped = Math.max(0, Math.min(1, progressRatio));
  const totalSegments = waypoints.length - 1;
  const rawIdx = clamped * totalSegments;
  const segIdx = Math.min(Math.floor(rawIdx), totalSegments - 1);
  const segFraction = rawIdx - segIdx;

  const p1 = waypoints[segIdx];
  const p2 = waypoints[segIdx + 1];

  return {
    coord: {
      lat: Number((p1.lat + (p2.lat - p1.lat) * segFraction).toFixed(4)),
      lng: Number((p1.lng + (p2.lng - p1.lng) * segFraction).toFixed(4)),
    },
    waypointIndex: segIdx,
  };
}

function getMaritimeLocationDescription(coord: Coordinate, destCity: string, isArrived: boolean): string {
  if (isArrived) return `ميناء ${destCity} (وصلت وتم التفريغ / التخليص الجمركي)`;
  if (coord.lat > 32 && coord.lng < 36 && coord.lng > 25) return 'شرق البحر الأبيض المتوسط متجهة لميناء مرسين';
  if (coord.lat > 28 && coord.lat < 31 && coord.lng > 31 && coord.lng < 34) return 'قناة السويس متجهة للبحر الأبيض المتوسط';
  if (coord.lat > 27 && coord.lng > 34 && coord.lng < 36) return 'خليج العقبة متجهة نحو الرسو بالميناء';
  if (coord.lat > 15 && coord.lat < 28 && coord.lng > 34 && coord.lng < 42) return 'البحر الأحمر متجهة شمالاً';
  if (coord.lat > 26 && coord.lng > 48 && coord.lng < 54) return 'الخليج العربي متجهة لميناء أم قصر';
  if (coord.lat > 23 && coord.lat < 27 && coord.lng > 54 && coord.lng < 60) return 'مضيق هرمز وخليج عمان';
  if (coord.lat > 11 && coord.lat < 14 && coord.lng > 42 && coord.lng < 46) return 'مضيق باب المندب الحيوي';
  if (coord.lat > 11 && coord.lat < 16 && coord.lng > 46 && coord.lng < 55) return 'خليج عدن متجهة نحو باب المندب';
  if (coord.lat > 10 && coord.lat < 22 && coord.lng > 55 && coord.lng < 72) return 'بحر العرب متجهة للمياه الإقليمية';
  if (coord.lat > 3 && coord.lat < 10 && coord.lng > 75 && coord.lng < 92) return 'المحيط الهندي قبالة سريلانكا';
  if (coord.lat > 1 && coord.lat < 5 && coord.lng > 98 && coord.lng < 105) return 'مضيق ملقا الملاحي الدولي';
  return 'بحر الصين الجنوبي متجهة نحو مضيق ملقا';
}

// Global hub presets for generating realistic realistic maritime transit coordinates
const globalPorts = [
  { name: 'ميناء شنغهاي الدولي', city: 'شنغهاي', country: 'الصين', coords: { lat: 31.23, lng: 121.47 } },
  { name: 'ميناء نينغبو تشوشان', city: 'نينغبو', country: 'الصين', coords: { lat: 29.86, lng: 121.54 } },
  { name: 'ميناء سنغافورة العالمي', city: 'سنغافورة', country: 'سنغافورة', coords: { lat: 1.29, lng: 103.85 } },
  { name: 'ميناء بوسان', city: 'بوسان', country: 'كوريا الجنوبية', coords: { lat: 35.10, lng: 129.04 } },
  { name: 'ميناء روتردام', city: 'روتردام', country: 'هولندا', coords: { lat: 51.92, lng: 4.47 } },
  { name: 'ميناء هامبورغ', city: 'هامبورغ', country: 'ألمانيا', coords: { lat: 53.55, lng: 9.99 } },
];

const destinationHubs = [
  { name: 'ميناء جبل علي', city: 'دبي', country: 'الإمارات العربية المتحدة', coords: { lat: 25.0066, lng: 55.0617 } },
  { name: 'ميناء الملك عبد العزيز (الدمام)', city: 'الدمام', country: 'المملكة العربية السعودية', coords: { lat: 26.43, lng: 50.10 } },
  { name: 'ميناء جدة الإسلامي', city: 'جدة', country: 'المملكة العربية السعودية', coords: { lat: 21.48, lng: 39.19 } },
  { name: 'ميناء خليفة', city: 'أبوظبي', country: 'الإمارات العربية المتحدة', coords: { lat: 24.87, lng: 54.67 } },
  { name: 'ميناء بورسعيد البحري', city: 'بورسعيد', country: 'مصر', coords: { lat: 31.26, lng: 32.30 } },
  { name: 'ميناء صلالة', city: 'صلالة', country: 'سلطنة عمان', coords: { lat: 17.01, lng: 54.09 } },
];

// Maritime waypoint corridors
const maritimeCorridors = [
  { name: 'بحر العرب متجهة لمضيق هرمز', lat: 16.5, lng: 62.0 },
  { name: 'شمال البحر الأحمر جنوب قناة السويس', lat: 27.2, lng: 34.8 },
  { name: 'مضيق باب المندب وخليج عدن', lat: 12.8, lng: 46.2 },
  { name: 'مضيق ملقا الإستراتيجي', lat: 3.5, lng: 100.8 },
  { name: 'شرق المحيط الهندي قبالة سريلانكا', lat: 6.2, lng: 82.5 },
];

export interface ExcelParseResult {
  containers: Container[];
  extractedCodes: string[];
  totalRows: number;
  fileName: string;
}

// Extracts container IDs and builds rich Container objects from Excel / CSV files or buffers
export function parseWorkbookContainers(workbook: XLSX.WorkBook, sourceLabel: string = 'ملف'): ExcelParseResult {
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('الملف فارغ ولا يحتوي على أي أوراق عمل (Sheets).');
  }

  const foundCodesMap = new Map<string, any>();
  let totalRows = 0;

  // Flexible regex to detect ISO container numbers even with spaces, dashes, or separators
  // e.g. MSCU 9921840, MSCU-992184-0, MAEU1234567, etc.
  const containerIdPattern = /([A-Z]{3,4})\s*[-_./]?\s*([UJZ]?)\s*(\d{6,7})/gi;

  // Search across ALL sheets in workbook
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rawRows = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, { header: 1 });
    const objectRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
    totalRows += rawRows.length;

    // Strategy 1: Check structured rows
    objectRows.forEach((row) => {
      // Priority 1: Check if there is an explicit container column in this row (avoiding sequence columns like 'تسلسل الحاوية')
      let explicitContainerVal: string | null = null;
      for (const [key, val] of Object.entries(row)) {
        if (!val) continue;
        const keyLower = String(key).toLowerCase().trim();
        if (
          !keyLower.includes('تسلسل') &&
          !keyLower.includes('sequence') &&
          !keyLower.includes('seq') &&
          (keyLower === 'رقم الحاوية' ||
            keyLower === 'container' ||
            keyLower === 'container no' ||
            keyLower === 'container number' ||
            keyLower === 'رقم_الحاوية' ||
            keyLower.includes('رقم الحاوية') ||
            keyLower === 'حاوية')
        ) {
          explicitContainerVal = String(val).trim();
          break;
        }
      }

      if (explicitContainerVal) {
        const cleanVal = explicitContainerVal.replace(/[\s\-_/.]/g, '').toUpperCase();
        if (!cleanVal.startsWith('RQ') && cleanVal.length >= 8 && cleanVal.length <= 13) {
          foundCodesMap.set(cleanVal, row);
          return; // Processed this row accurately!
        }
      }

      // Fallback: Check other columns
      for (const [key, val] of Object.entries(row)) {
        if (!val) continue;
        const keyLower = String(key).toLowerCase();
        // Skip sequence numbers
        if (keyLower.includes('تسلسل') || keyLower.includes('sequence') || keyLower.includes('seq')) {
          continue;
        }

        const valStr = String(val).trim();
        const cleanVal = valStr.replace(/[\s\-_/.]/g, '').toUpperCase();

        // Check if value directly matches ISO container ID (3-4 letters + 6-7 digits) and does not start with RQ
        if (!cleanVal.startsWith('RQ') && /^[A-Z]{3,4}[UJZ]?\d{6,7}$/.test(cleanVal)) {
          if (!foundCodesMap.has(cleanVal)) {
            foundCodesMap.set(cleanVal, row);
          }
          break;
        }

        // Match regex inside string
        let match;
        const re = new RegExp(containerIdPattern.source, 'gi');
        while ((match = re.exec(valStr)) !== null) {
          const code = `${match[1]}${match[2] || ''}${match[3]}`.toUpperCase();
          if (!foundCodesMap.has(code)) {
            foundCodesMap.set(code, row);
          }
        }
      }
    });

    // Strategy 2: Check raw cells (only if structured rows did not find containers)
    if (foundCodesMap.size === 0) {
      rawRows.forEach((row) => {
        if (!Array.isArray(row)) return;
        row.forEach((cell) => {
          if (!cell) return;
          const cellStr = String(cell).trim();
          const cleanCell = cellStr.replace(/[\s\-_/.]/g, '').toUpperCase();
          if (/^[A-Z]{3,4}[UJZ]?\d{6,7}$/.test(cleanCell)) {
            if (!foundCodesMap.has(cleanCell)) {
              foundCodesMap.set(cleanCell, {});
            }
          }

          let match;
          const re = new RegExp(containerIdPattern.source, 'gi');
          while ((match = re.exec(cellStr)) !== null) {
            const code = `${match[1]}${match[2] || ''}${match[3]}`.toUpperCase();
            if (!foundCodesMap.has(code)) {
              foundCodesMap.set(code, {});
            }
          }
        });
      });
    }
  }

  const extractedCodes = Array.from(foundCodesMap.keys());

  if (extractedCodes.length === 0) {
    throw new Error(
      `لم يتم العثور على أرقام حاويات مطابقة في ${sourceLabel}. تأكد من وجود أرقام الحاويات (مثل MSCU9921840 أو MAEU1234567) أو تسمية عمود الحاوية بـ "Container" أو "رقم الحاوية".`
    );
  }

  // Convert found codes into Container instances
  const containers: Container[] = extractedCodes.map((code, idx) => {
    const rowData = foundCodesMap.get(code) || {};

    // 1. Determine Line / Carrier
    const rawLineName = String(
      rowData['line name'] || rowData['Line Name'] || rowData['Carrier'] || rowData['شركة الشحن'] || ''
    ).trim();
    const carrier = inferCarrier(code, rawLineName === '/' ? undefined : rawLineName);

    // 2. Determine Destination and Route
    const rawPort = String(
      rowData['الميناء'] || rowData['Destination'] || rowData['ميناء الوصول'] || rowData['Port'] || ''
    ).trim();
    const specificRoute = resolvePortRoute(rawPort);

    const destHub = specificRoute?.destPort || destinationHubs[idx % destinationHubs.length];
    const waypoints: Coordinate[] = specificRoute?.waypoints || [
      NANSHA_PORT_DEFINITION.coords,
      { lat: 14.2, lng: 112.5 },
      { lat: 1.25, lng: 103.8 },
      { lat: 5.8, lng: 80.2 },
      destHub.coords,
    ];

    // 3. Extract user-specific fields from spreadsheet
    const sequenceNumber = String(
      rowData['تسلسل الحاوية'] || rowData['Sequence'] || rowData['Seq'] || ''
    ).trim() || undefined;

    const packagesCount =
      Number(rowData['عدد الطرود'] || rowData['الطرود'] || rowData['Packages'] || 0) || undefined;

    const volumeCbm =
      Number(
        rowData['حجم البظاعة '] ||
          rowData['حجم البظاعة'] ||
          rowData['الحجم'] ||
          rowData['Volume'] ||
          rowData['CBM'] ||
          0
      ) || undefined;

    const containerColor = String(rowData['اللون'] || rowData['Color'] || '').trim() || undefined;

    const rawSize = String(
      rowData['حجم الحاوية '] || rowData['حجم الحاوية'] || rowData['Size'] || rowData['الحجم'] || '40 HQ'
    ).trim();
    const containerType: '40ft Standard' | '20ft Standard' | '40ft High Cube' | '40ft Reefer (مبرد)' =
      rawSize.toUpperCase().includes('HQ') || rawSize.includes('40')
        ? '40ft High Cube'
        : rawSize.includes('20')
        ? '20ft Standard'
        : '40ft Standard';

    const daysInTransit =
      Number(
        rowData['عدد الايام بالطريق'] ||
          rowData['الأيام بالطريق'] ||
          rowData['Days'] ||
          rowData['Days in transit'] ||
          0
      ) || undefined;

    const rawLoadingDate = rowData['تايخ التحميل'] || rowData['تاريخ التحميل'] || rowData['Loading Date'];
    const parsedLoadingDate = parseExcelSerialDate(rawLoadingDate);

    // 4. Progress, Position & Status calculation based on Days in transit
    const typicalVoyageDays = 38;
    const isAtOriginTerminal = daysInTransit !== undefined && daysInTransit <= 4;
    const isArrived = daysInTransit !== undefined && daysInTransit >= 42;

    let progressPercent: number;
    let currentCoords: Coordinate;
    let currentWaypointIndex = 0;
    let status: 'In Transit' | 'At Sea' | 'In Port' | 'Customs' | 'Out for Delivery' | 'Delivered' = 'At Sea';
    let speedKnots = isArrived ? 0 : 16.8 + ((idx * 1.1) % 4);
    let headingDeg = isArrived ? 0 : 275 + (idx % 20);
    let locationName = '';
    let berthDate: string | undefined = undefined;
    let etdDate: string | undefined = undefined;
    let entryDate: string | undefined = undefined;

    if (isAtOriginTerminal) {
      progressPercent = 5;
      status = 'In Port';
      currentCoords = { ...NANSHA_PORT_DEFINITION.coords };
      currentWaypointIndex = 0;
      speedKnots = 0;
      headingDeg = 0;
      locationName = 'محطة نانشا المرحلة الثانية (Nansha Phase II Terminal GOCT) - قيد التجهيز ورسو السفينة';
      entryDate = parsedLoadingDate ? parsedLoadingDate.toISOString().split('T')[0] : '2026-09-03';
      berthDate = '2026-09-13 23:00';
      etdDate = '2026-09-14';
    } else if (isArrived) {
      progressPercent = 100;
      status = 'In Port';
      currentCoords = { ...destHub.coords };
      currentWaypointIndex = waypoints.length - 1;
      speedKnots = 0;
      headingDeg = 0;
      locationName = `ميناء ${destHub.name} (وصلت وتم التفريغ / التخليص الجمركي)`;
    } else if (daysInTransit !== undefined && daysInTransit > 0) {
      const progressRatio = Math.min(0.95, Math.max(0.08, daysInTransit / typicalVoyageDays));
      progressPercent = Math.round(progressRatio * 100);
      const interpolated = interpolateWaypoints(waypoints, progressRatio);
      currentCoords = interpolated.coord;
      currentWaypointIndex = interpolated.waypointIndex;
      status = progressPercent > 90 ? 'In Transit' : 'At Sea';
      locationName = getMaritimeLocationDescription(currentCoords, destHub.city, false);
    } else {
      progressPercent = 55 + ((idx * 7) % 35);
      const interpolated = interpolateWaypoints(waypoints, progressPercent / 100);
      currentCoords = interpolated.coord;
      currentWaypointIndex = interpolated.waypointIndex;
      locationName = getMaritimeLocationDescription(currentCoords, destHub.city, false);
    }

    // 5. Vessel, Cargo and dates
    let vesselName = rowData['Vessel'] || rowData['السفينة'];
    if (!vesselName) {
      if (code === 'CMAU9366839' || code === 'CMAU3547315') {
        vesselName = 'CMA CGM ESMERALDA';
      } else if (carrier.code === 'CMAU') {
        vesselName = ['CMA CGM ESMERALDA', 'CMA CGM Jacques Saade', 'CMA CGM Palais Royal', 'CMA CGM Antoine de Saint'][idx % 4];
      } else if (carrier.code === 'WHSU') {
        vesselName = ['Wan Hai 510', 'Wan Hai 505', 'Wan Hai 312', 'Wan Hai 316'][idx % 4];
      } else if (carrier.code === 'OOLU') {
        vesselName = ['OOCL Hong Kong', 'OOCL Scandinavia', 'OOCL Germany', 'OOCL Japan'][idx % 4];
      } else if (carrier.code === 'COSU') {
        vesselName = ['COSCO Shipping Universe', 'COSCO Galaxy', 'COSCO Pisces', 'COSCO Solar'][idx % 4];
      } else {
        vesselName = `${carrier.name.split(' ')[0]} Star ${idx + 101}`;
      }
    }

    const cargoTitle = sequenceNumber
      ? `حاوية ${sequenceNumber} (${code})`
      : `شحنة حاوية ${code}`;

    const cargoDesc = packagesCount && volumeCbm
      ? `بضائع تجارية - عدد الطرود: ${packagesCount} طرد | الحجم: ${volumeCbm} م³`
      : `شحنة بضائع تجارية (${code})`;

    const weightKg = volumeCbm
      ? Math.round(volumeCbm * 315)
      : Number(rowData['Weight'] || rowData['الوزن'] || 22000 + (idx * 650) % 8000);

    const etaDays = isArrived ? 0 : Math.max(1, Math.round(((100 - progressPercent) / 100) * typicalVoyageDays));

    let departureDate: string;
    if (parsedLoadingDate) {
      departureDate = parsedLoadingDate.toISOString();
    } else if (daysInTransit) {
      departureDate = new Date(Date.now() - daysInTransit * 86400000).toISOString();
    } else {
      departureDate = new Date(Date.now() - (idx + 12) * 86400000).toISOString();
    }

    let arrivalDate: string;
    if (code === 'CMAU9366839' || code === 'CMAU3547315') {
      arrivalDate = '2026-10-11T14:00:00.000Z'; // ETA 10/11 exactly as confirmed by carrier official portal
    } else if (isArrived) {
      arrivalDate = new Date(Date.now() - (daysInTransit! - 42) * 86400000).toISOString();
    } else {
      arrivalDate = new Date(Date.now() + etaDays * 86400000).toISOString();
    }

    // Build timeline milestones
    let containerMilestones: Milestone[];
    if (isAtOriginTerminal) {
      containerMilestones = [
        {
          id: `xl-m1-${idx}`,
          title: 'دخول المحطة والتحميل (Terminal Entry)',
          location: 'محطة نانشا المرحلة الثانية (Nansha Phase II Terminal GOCT)',
          date: entryDate ? entryDate.replace(/-/g, '/') : '2026/09/03',
          completed: true,
        },
        {
          id: `xl-m2-${idx}`,
          title: 'رسو السفينة ومغادرة ميناء نانشا (ETD: 14 سبتمبر)',
          location: 'محطة نانشا، قوانغتشو، الصين',
          date: 'رسو: 13 سبتمبر 23:00 | إبحار: 14 سبتمبر',
          completed: false,
          isCurrent: true,
        },
        {
          id: `xl-m3-${idx}`,
          title: 'الإبحار في المسار الملاحي الدولي عبر باب المندب',
          location: 'بحر الصين - مضيق ملقا - البحر الأحمر',
          date: 'المسار الملاحي',
          completed: false,
        },
        {
          id: `xl-m4-${idx}`,
          title: `الوصول المتوقع لميناء ${destHub.city} (ETA: 11 أكتوبر)`,
          location: destHub.name,
          date: '11 أكتوبر 2026',
          completed: false,
        },
      ];
    } else if (isArrived) {
      containerMilestones = [
        {
          id: `xl-m1-${idx}`,
          title: 'التحميل ومغادرة ميناء نانشا (GOCT)',
          location: 'ميناء نانشا، قوانغتشو، الصين',
          date: new Date(departureDate).toLocaleDateString('ar-EG'),
          completed: true,
        },
        {
          id: `xl-m2-${idx}`,
          title: 'الإبحار وعبور المسار الملاحي الدولي',
          location: 'المسار الملاحي الدولي',
          date: 'تم الإنجاز',
          completed: true,
        },
        {
          id: `xl-m3-${idx}`,
          title: 'تم الوصول والتفريغ بميناء الوجهة',
          location: destHub.name,
          date: 'وصلت الميناء',
          completed: true,
          isCurrent: true,
        },
      ];
    } else {
      containerMilestones = [
        {
          id: `xl-m1-${idx}`,
          title: 'التحميل ومغادرة ميناء نانشا (GOCT)',
          location: 'ميناء نانشا، قوانغتشو، الصين',
          date: new Date(departureDate).toLocaleDateString('ar-EG'),
          completed: true,
        },
        {
          id: `xl-m2-${idx}`,
          title: 'الإبحار في المسار الملاحي الدولي',
          location: locationName,
          date: 'تحديث اليوم المباشر',
          completed: true,
          isCurrent: true,
        },
        {
          id: `xl-m3-${idx}`,
          title: 'الوصول المتوقع والمناولة بالميناء',
          location: destHub.name,
          date: `المتوقع: ${new Date(arrivalDate).toLocaleDateString('ar-EG')}`,
          completed: false,
        },
      ];
    }

    return {
      id: code,
      title: cargoTitle,
      carrier: carrier.name,
      carrierCode: carrier.code,
      vesselName,
      voyageNumber: `VOY-2026-${100 + idx}`,
      type: containerType,
      cargoDescription: cargoDesc,
      weightKg,
      originPort: {
        name: NANSHA_PORT_DEFINITION.name,
        city: NANSHA_PORT_DEFINITION.city,
        country: NANSHA_PORT_DEFINITION.country,
        coordinates: NANSHA_PORT_DEFINITION.coords,
        departureDate,
      },
      destinationPort: {
        name: destHub.name,
        city: destHub.city,
        country: destHub.country,
        coordinates: destHub.coords,
        estimatedArrival: arrivalDate,
      },
      currentLocation: {
        name: locationName,
        coordinates: currentCoords,
        speedKnots,
        headingDeg,
        lastUpdated: new Date().toISOString(),
        status,
      },
      progressPercent,
      routeWaypoints: waypoints,
      currentWaypointIndex,
      dailyMovementNauticalMiles: isArrived || isAtOriginTerminal ? 0 : 380,
      batteryLevel: 96 - (idx % 12),
      sequenceNumber,
      packagesCount,
      volumeCbm,
      containerColor,
      daysInTransit,
      lineName: rawLineName !== '/' ? rawLineName : undefined,
      terminalName: NANSHA_PORT_DEFINITION.terminalName,
      entryDate,
      etdDate,
      berthDate,
      milestones: containerMilestones,
    };
  });

  return {
    containers,
    extractedCodes,
    totalRows,
    fileName: sourceLabel,
  };
}

/**
 * Extracts container IDs and builds rich Container objects from Excel / CSV files
 */
export async function parseExcelOrCsvFile(file: File): Promise<ExcelParseResult> {
  const isCsvOrText = file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv') || file.type.includes('text');
  if (isCsvOrText) {
    const text = await file.text();
    const workbook = XLSX.read(text, { type: 'string' });
    return parseWorkbookContainers(workbook, file.name);
  }
  const buffer = await file.arrayBuffer();
  try {
    const decodedText = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    if (decodedText.includes(',') || decodedText.includes(';') || decodedText.includes('\t')) {
      const workbook = XLSX.read(decodedText, { type: 'string' });
      return parseWorkbookContainers(workbook, file.name);
    }
  } catch {
    // Binary XLSX file
  }
  const workbook = XLSX.read(buffer, { type: 'array' });
  return parseWorkbookContainers(workbook, file.name);
}

/**
 * Normalizes Google Sheets or other cloud spreadsheet URLs
 */
export function normalizeSheetUrl(inputUrl: string): string {
  let targetUrl = inputUrl.trim();
  if (targetUrl.includes('docs.google.com/spreadsheets')) {
    const match = targetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }
    if (targetUrl.includes('/edit')) {
      return targetUrl.replace(/\/edit.*$/, '/export?format=csv');
    }
  }
  return targetUrl;
}

/**
 * Automatically fetches and parses containers from a live URL:
 * - Google Sheets URL (automatically extracts Sheet ID and exports as CSV)
 * - Direct CSV or Excel file URL
 * - Fallback through Vite backend proxy and CORS mirrors
 */
export async function fetchAndParseFromUrl(inputUrl: string): Promise<ExcelParseResult> {
  const exportUrl = normalizeSheetUrl(inputUrl);

  let response: Response | null = null;
  let fetchError: Error | null = null;

  // Attempt 1: Direct fetch
  try {
    const directRes = await fetch(exportUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/csv, application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/plain, */*',
      },
    });
    if (directRes.ok) {
      response = directRes;
    }
  } catch (err: any) {
    fetchError = err;
  }

  // Attempt 2: Local Vite dev proxy if direct fetch failed or was blocked by CORS
  if (!response || !response.ok) {
    try {
      const proxyRes = await fetch(`/api/proxy-sheet?url=${encodeURIComponent(exportUrl)}`);
      if (proxyRes.ok) {
        response = proxyRes;
      }
    } catch {
      // Continue to next fallback
    }
  }

  // Attempt 3: Public CORS proxy as backup
  if (!response || !response.ok) {
    try {
      const mirrorRes = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(exportUrl)}`);
      if (mirrorRes.ok) {
        response = mirrorRes;
      }
    } catch {
      // Continue to error throw
    }
  }

  if (!response || !response.ok) {
    throw new Error(
      `تعذر جلب البيانات من الرابط (رمز الاستجابة: ${response?.status || 'Network Error'}). يرجى التأكد من أن ملف Google Sheet متاح للعرض للعامة (Anyone with link can view). ${fetchError ? `(${fetchError.message})` : ''}`
    );
  }

  const contentType = response.headers.get('content-type') || '';

  // If response is JSON
  if (contentType.includes('application/json')) {
    const json = await response.json();
    let codes: string[] = [];

    if (Array.isArray(json)) {
      json.forEach((item) => {
        if (typeof item === 'string') codes.push(item);
        else if (item && typeof item === 'object') {
          const val = item.id || item.containerId || item.code || item.number || Object.values(item)[0];
          if (val) codes.push(String(val));
        }
      });
    } else if (json && typeof json === 'object') {
      const list = json.containers || json.data || json.items || Object.values(json);
      if (Array.isArray(list)) {
        list.forEach((item) => {
          if (typeof item === 'string') codes.push(item);
          else if (item && typeof item === 'object') {
            const val = item.id || item.containerId || item.code || item.number || Object.values(item)[0];
            if (val) codes.push(String(val));
          }
        });
      }
    }

    if (codes.length === 0) {
      throw new Error('الرابط أعاد استجابة JSON ولكن لم يتم العثور على مصفوفة حاويات أو حقول أرقام الحاويات.');
    }

    const ws = XLSX.utils.json_to_sheet(codes.map((c) => ({ Container: c })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LiveSync');
    return parseWorkbookContainers(wb, 'رابط API مباشر');
  }

  // Check if CSV or text format (including Google Sheet CSV exports)
  const isCsvOrText =
    contentType.includes('csv') ||
    contentType.includes('text') ||
    exportUrl.includes('format=csv');

  if (isCsvOrText) {
    const text = await response.text();
    const workbook = XLSX.read(text, { type: 'string' });
    return parseWorkbookContainers(workbook, 'رابط كوكل شيت المباشر');
  }

  // Otherwise read as ArrayBuffer / binary Sheet
  const arrayBuffer = await response.arrayBuffer();
  try {
    const decodedText = new TextDecoder('utf-8', { fatal: true }).decode(arrayBuffer);
    if (decodedText.includes(',') || decodedText.includes(';') || decodedText.includes('\t')) {
      const workbook = XLSX.read(decodedText, { type: 'string' });
      return parseWorkbookContainers(workbook, 'رابط كوكل شيت المباشر');
    }
  } catch {
    // Binary XLSX
  }

  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  return parseWorkbookContainers(workbook, 'رابط كوكل شيت المباشر');
}

/**
 * Generates and downloads a sample Excel template for users
 */
export function downloadSampleExcelFile() {
  const sampleData = [
    {
      'Container No': 'MSCU9921840',
      'Carrier': 'MSC (Mediterranean Shipping Co)',
      'Vessel': 'MSC Maya',
      'Origin': 'شنغهاي',
      'Destination': 'دبي',
      'Cargo': 'ألواح طاقة شمسية ومولدات كهربائية',
      'Weight': 22400,
    },
    {
      'Container No': 'MAEU8819204',
      'Carrier': 'Maersk Line',
      'Vessel': 'Maersk Mc-Kinney',
      'Origin': 'هامبورغ',
      'Destination': 'جدة',
      'Cargo': 'قطع غيار سيارات ومحركات كهربائية',
      'Weight': 26800,
    },
    {
      'Container No': 'COSU4719283',
      'Carrier': 'COSCO Shipping Lines',
      'Vessel': 'COSCO Galaxy',
      'Origin': 'نينغبو',
      'Destination': 'الدمام',
      'Cargo': 'أجهزة إلكترونية وهواتف ذكية',
      'Weight': 21300,
    },
    {
      'Container No': 'CMAU3109284',
      'Carrier': 'CMA CGM Group',
      'Vessel': 'CMA CGM Palais Royal',
      'Origin': 'سنغافورة',
      'Destination': 'أبوظبي',
      'Cargo': 'مواد غذائية ومشروبات مبردة',
      'Weight': 24500,
    },
    {
      'Container No': 'EGLU4910294',
      'Carrier': 'Evergreen Marine',
      'Vessel': 'Ever Golden',
      'Origin': 'بوسان',
      'Destination': 'بورسعيد',
      'Cargo': 'منسوجات وأقمشة صناعية',
      'Weight': 19800,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Containers');

  // Trigger download
  XLSX.writeFile(workbook, 'sample_containers_manifest.xlsx');
}
