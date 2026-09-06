import React, { useState, useRef } from 'react';
import { Container, Coordinate } from '../types';
import {
  Code,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Copy,
  X,
  ArrowLeft,
  FileSpreadsheet,
  UploadCloud,
  Download,
  Loader2,
  FileUp,
  Trash2,
  Link2,
  Globe,
  RefreshCw,
  Check,
} from 'lucide-react';
import {
  parseExcelOrCsvFile,
  downloadSampleExcelFile,
  fetchAndParseFromUrl,
  inferCarrier,
  DEFAULT_USER_SHEET_URL,
} from '../utils/excelParser';

interface CodeImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newContainers: Container[]) => void;
  activeLiveUrl?: string;
  onSaveLiveUrl?: (url: string) => void;
}

export const CodeImporterModal: React.FC<CodeImporterModalProps> = ({
  isOpen,
  onClose,
  onImport,
  activeLiveUrl = '',
  onSaveLiveUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'excel' | 'live_link' | 'code'>('live_link');
  const [codeInput, setCodeInput] = useState<string>('');
  const [parsedContainers, setParsedContainers] = useState<Container[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<'json' | 'codes' | 'api'>('json');

  // Excel / CSV File state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    name: string;
    size: string;
    count: number;
    totalRows: number;
  } | null>(null);

  // Live URL link state (defaults to the user Google Sheet URL)
  const [liveUrlInput, setLiveUrlInput] = useState<string>(activeLiveUrl || DEFAULT_USER_SHEET_URL);
  const [isConnectingUrl, setIsConnectingUrl] = useState(false);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    const validExts = ['.xlsx', '.xls', '.csv'];
    const fileNameLower = file.name.toLowerCase();
    const isValid = validExts.some((ext) => fileNameLower.endsWith(ext));

    if (!isValid) {
      setParseError('صيغة الملف غير مدعومة. يرجى اختيار ملف Excel (.xlsx, .xls) أو CSV (.csv).');
      return;
    }

    setIsProcessingFile(true);
    setParseError(null);
    setSuccessMessage(null);

    try {
      const result = await parseExcelOrCsvFile(file);
      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          : `${(file.size / 1024).toFixed(1)} KB`;

      setUploadedFileInfo({
        name: result.fileName,
        size: sizeStr,
        count: result.containers.length,
        totalRows: result.totalRows,
      });

      setParsedContainers(result.containers);

      // Instantly import to map so user sees immediate results without confusion
      onImport(result.containers);
      setSuccessMessage(
        `✓ تم بنجاح قراءة واستيراد (${result.containers.length}) حاوية وإضافتها مباشرة للخريطة التفاعلية وتحديثها فورياً!`
      );

      // Populate editor with clear structured preview
      const summaryCode = `// تم استيراد وقراءة ${result.containers.length} حاوية بنجاح من ملف: ${result.fileName}\n// تم تطبيق الحاويات فورياً على الخريطة التفاعلية\n${JSON.stringify(
        result.containers.map((c) => ({
          id: c.id,
          carrier: c.carrier,
          vessel: c.vesselName,
          origin: c.originPort.city,
          destination: c.destinationPort.city,
          currentLocation: c.currentLocation.name,
          eta: c.destinationPort.estimatedArrival,
        })),
        null,
        2
      )}`;
      setCodeInput(summaryCode);
    } catch (err: any) {
      setParseError(err.message || 'حدث خطأ أثناء قراءة وفحص ملف Excel.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleResetFile = () => {
    setUploadedFileInfo(null);
    setParsedContainers([]);
    setCodeInput('');
    setParseError(null);
    setSuccessMessage(null);
  };

  // Handle Connecting to Live Definition Link (Google Sheets / API / CSV URL)
  const handleConnectLiveUrl = async () => {
    if (!liveUrlInput.trim()) {
      setParseError('يرجى كتابة أو لصق رابط التعريف (Google Sheets أو رابط API أو CSV).');
      return;
    }

    setIsConnectingUrl(true);
    setParseError(null);
    setSuccessMessage(null);

    try {
      const result = await fetchAndParseFromUrl(liveUrlInput.trim());
      setParsedContainers(result.containers);

      // Immediately import to map
      onImport(result.containers);

      if (onSaveLiveUrl) {
        onSaveLiveUrl(liveUrlInput.trim());
      }
      try {
        localStorage.setItem('live_container_tracking_url', liveUrlInput.trim());
      } catch (e) {
        // ignore storage error
      }

      setSuccessMessage(
        `✓ تم الربط الأوتوماتيكي بنجاح وجلب (${result.containers.length}) حاوية مباشرة من الرابط وتطبيقها على الخريطة!`
      );
    } catch (err: any) {
      setParseError(
        err.message ||
          'تعذر جلب البيانات من الرابط. تأكد من أن الرابط متاح للعامة (Public) أو يدعم CORS.'
      );
    } finally {
      setIsConnectingUrl(false);
    }
  };

  const sampleJsonTemplate = `[
  {
    "id": "MSCU9921840",
    "title": "حاوية ألواح طاقة شمسية ومولدات كهربائية",
    "carrier": "MSC (Mediterranean Shipping Co)",
    "vesselName": "MSC Maya",
    "voyageNumber": "26W09",
    "cargoDescription": "ألواح شمسية كهروضوئية ومحولات عاكسة",
    "weightKg": 22400,
    "originCity": "نانشا (قوانغتشو)",
    "originCountry": "الصين",
    "originCoords": [22.6450, 113.6700],
    "destCity": "دبي (جبل علي)",
    "destCountry": "الإمارات",
    "destCoords": [25.0066, 55.0617],
    "currentCoords": [15.24, 66.85],
    "currentLocationName": "بحر العرب متجهة لمضيق هرمز",
    "speedKnots": 19.1,
    "progressPercent": 69,
    "eta": "2026-09-14T10:00:00Z"
  },
  {
    "id": "MAEU8819204",
    "title": "حاوية قطع غيار سيارات ومحركات",
    "carrier": "Maersk Line",
    "vesselName": "Maersk Mc-Kinney Moller",
    "voyageNumber": "2609-EU",
    "cargoDescription": "مكابح وفلاتر ومحركات كهربائية",
    "weightKg": 26800,
    "originCity": "هامبورغ",
    "originCountry": "ألمانيا",
    "originCoords": [53.5511, 9.9937],
    "destCity": "جدة الإسلامي",
    "destCountry": "السعودية",
    "destCoords": [21.4858, 39.1925],
    "currentCoords": [27.42, 34.61],
    "currentLocationName": "شمال البحر الأحمر جنوب السويس",
    "speedKnots": 18.5,
    "progressPercent": 82,
    "eta": "2026-09-09T18:00:00Z"
  }
]`;

  const sampleCodesTemplate = `// يمكنك كتابة أو لصق مصفوفة من أكواد الحاويات بصيغة JSON أو قائمة نصية:
[
  "MSCU9921840",
  "MAEU8819204",
  "COSU4719283",
  "CMAU3109284"
]`;

  const sampleApiTemplate = `{
  "status": "success",
  "timestamp": "2026-09-06T08:00:00Z",
  "shipment": {
    "manifestNumber": "MFT-2026-991",
    "containers": [
      {
        "container_number": "EGLU4910294",
        "shipping_line": "Evergreen Marine",
        "vessel": "Ever Given",
        "origin_port": "Yantian, Shenzhen",
        "destination_port": "Port of Dammam, KSA",
        "latitude": 13.82,
        "longitude": 50.14,
        "status": "In Transit",
        "current_zone": "Gulf of Aden"
      }
    ]
  }
}`;

  const handleApplyTemplate = (type: 'json' | 'codes' | 'api') => {
    setActiveTemplate(type);
    if (type === 'json') setCodeInput(sampleJsonTemplate);
    if (type === 'codes') setCodeInput(sampleCodesTemplate);
    if (type === 'api') setCodeInput(sampleApiTemplate);
    setParseError(null);
  };

  const handleParseCode = () => {
    setParseError(null);
    if (!codeInput.trim()) {
      setParseError('يرجى لصق الكود أو البيانات أولاً.');
      return;
    }

    try {
      // Try to clean potential JS comments
      const cleaned = codeInput.replace(/\/\/.*$/gm, '').trim();
      const parsed = JSON.parse(cleaned);

      const extractedContainers: Container[] = [];

      // Case 1: Array of full container objects
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        parsed.forEach((item: any, idx: number) => {
          const id = item.id || item.container_number || item.containerId || `CTNU${Math.floor(1000000 + Math.random() * 9000000)}`;
          const carrierInfo = inferCarrier(id);
          const origCoords: Coordinate = item.originCoords
            ? { lat: item.originCoords[0], lng: item.originCoords[1] }
            : { lat: 31.23, lng: 121.47 };
          const destCoords: Coordinate = item.destCoords
            ? { lat: item.destCoords[0], lng: item.destCoords[1] }
            : { lat: 25.0, lng: 55.0 };
          const currentCoords: Coordinate = item.currentCoords
            ? { lat: item.currentCoords[0], lng: item.currentCoords[1] }
            : {
                lat: origCoords.lat + (destCoords.lat - origCoords.lat) * 0.6,
                lng: origCoords.lng + (destCoords.lng - origCoords.lng) * 0.6,
              };

          extractedContainers.push({
            id,
            title: item.title || item.cargo_name || `شحنة بضائع تجارية (${id})`,
            carrier: item.carrier || carrierInfo.name,
            carrierCode: carrierInfo.code,
            vesselName: item.vesselName || item.vessel || 'Navis Express',
            voyageNumber: item.voyageNumber || 'VY-2026',
            type: item.type || '40ft Standard',
            cargoDescription: item.cargoDescription || 'بضائع ومعدات عامة',
            weightKg: item.weightKg || 22000,
            originPort: {
              name: item.originCity ? `ميناء ${item.originCity}` : 'ميناء نانشا الدولي (Port of Nansha)',
              city: item.originCity || 'نانشا (قوانغتشو)',
              country: item.originCountry || 'الصين',
              coordinates: origCoords,
              departureDate: item.departureDate || new Date(Date.now() - 7 * 86400000).toISOString(),
            },
            destinationPort: {
              name: item.destCity ? `ميناء ${item.destCity}` : 'ميناء الوصول',
              city: item.destCity || 'دبي',
              country: item.destCountry || 'الإمارات',
              coordinates: destCoords,
              estimatedArrival: item.eta || new Date(Date.now() + 6 * 86400000).toISOString(),
            },
            currentLocation: {
              name: item.currentLocationName || item.current_zone || 'في المسار البحري الملاحي',
              coordinates: currentCoords,
              speedKnots: item.speedKnots || 18.2,
              headingDeg: item.headingDeg || 280,
              lastUpdated: new Date().toISOString(),
              status: 'At Sea',
            },
            progressPercent: item.progressPercent || 65,
            routeWaypoints: [
              origCoords,
              { lat: (origCoords.lat + currentCoords.lat) / 2, lng: (origCoords.lng + currentCoords.lng) / 2 },
              currentCoords,
              { lat: (currentCoords.lat + destCoords.lat) / 2, lng: (currentCoords.lng + destCoords.lng) / 2 },
              destCoords,
            ],
            currentWaypointIndex: 2,
            dailyMovementNauticalMiles: 370,
            batteryLevel: 92,
            milestones: [
              {
                id: `m-init-${idx}`,
                title: 'مغادرة ميناء الشحن',
                location: item.originCity || 'ميناء الشحن',
                date: 'تاريخ المغادرة المسجل',
                completed: true,
              },
              {
                id: `m-curr-${idx}`,
                title: 'الإبحار نحو الوجهة',
                location: item.currentLocationName || 'المياه الدولية',
                date: 'تحديث اليوم',
                completed: true,
                isCurrent: true,
              },
              {
                id: `m-dest-${idx}`,
                title: 'الوصول المتوقع والتفريغ',
                location: item.destCity || 'ميناء الوصول',
                date: 'الموعد المجدول',
                completed: false,
              },
            ],
          });
        });
      }
      // Case 2: Array of simple strings (Container IDs)
      else if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
        parsed.forEach((rawId: string, idx: number) => {
          const id = rawId.trim().toUpperCase();
          const carrier = inferCarrier(id);
          
          // Generate route between global hubs
          const originPort = {
            name: 'ميناء نينغبو الدولي',
            city: 'نينغبو',
            country: 'الصين',
            coordinates: { lat: 29.8683, lng: 121.544 },
            departureDate: new Date(Date.now() - (idx + 4) * 86400000).toISOString(),
          };
          const destPort = {
            name: 'ميناء جبل علي',
            city: 'دبي',
            country: 'الإمارات',
            coordinates: { lat: 25.0066, lng: 55.0617 },
            estimatedArrival: new Date(Date.now() + (idx + 5) * 86400000).toISOString(),
          };
          const currentPos: Coordinate = {
            lat: 16.5 + (idx * 1.8),
            lng: 62.0 + (idx * 2.2),
          };

          extractedContainers.push({
            id,
            title: `شحنة تم استيرادها عبر كود التتبع (${id})`,
            carrier: carrier.name,
            carrierCode: carrier.code,
            vesselName: `${carrier.name.split(' ')[0]} Voyager ${idx + 1}`,
            voyageNumber: `VOY-2026-${idx + 10}`,
            type: '40ft Standard',
            cargoDescription: 'بضائع تجارية متنوعة مسجلة في البيان الجمركي',
            weightKg: 23500 + idx * 800,
            originPort,
            destinationPort: destPort,
            currentLocation: {
              name: 'بحر العرب قبالة مضيق هرمز',
              coordinates: currentPos,
              speedKnots: 17.8,
              headingDeg: 290,
              lastUpdated: new Date().toISOString(),
              status: 'At Sea',
            },
            progressPercent: 62 + idx * 5,
            routeWaypoints: [
              originPort.coordinates,
              { lat: 10.0, lng: 105.0 },
              { lat: 1.25, lng: 103.85 },
              { lat: 6.0, lng: 80.0 },
              currentPos,
              destPort.coordinates,
            ],
            currentWaypointIndex: 4,
            dailyMovementNauticalMiles: 380,
            batteryLevel: 95,
            milestones: [
              { id: `ms-${idx}-1`, title: 'التحميل بميناء المغادرة', location: originPort.city, date: 'تمت المعالجة', completed: true },
              { id: `ms-${idx}-2`, title: 'الإبحار في المسار البحري', location: 'بحر العرب', date: 'اليوم', completed: true, isCurrent: true },
              { id: `ms-${idx}-3`, title: 'الوصول المتوقع لميناء الوجهة', location: destPort.city, date: 'مجدول', completed: false },
            ],
          });
        });
      }
      // Case 3: Nested API object (e.g. shipment.containers)
      else if (parsed.shipment && Array.isArray(parsed.shipment.containers)) {
        parsed.shipment.containers.forEach((item: any, idx: number) => {
          const id = item.container_number || `CNTR${idx}`;
          const carrier = inferCarrier(id);
          extractedContainers.push({
            id,
            title: item.cargo || `حاوية من نظام الربط البرمجي (${id})`,
            carrier: item.shipping_line || carrier.name,
            carrierCode: carrier.code,
            vesselName: item.vessel || 'Carrier Express',
            voyageNumber: 'API-SYNC-26',
            type: '40ft High Cube',
            cargoDescription: 'شحنة مسجلة عبر واجهة برمجة التطبيقات API',
            weightKg: 24000,
            originPort: {
              name: item.origin_port || 'ميناء الشحن الدولي',
              city: item.origin_port?.split(',')[0] || 'الميناء المصدر',
              country: item.origin_port?.split(',')[1] || 'بلد المنشأ',
              coordinates: { lat: 22.54, lng: 114.05 },
              departureDate: new Date(Date.now() - 5 * 86400000).toISOString(),
            },
            destinationPort: {
              name: item.destination_port || 'ميناء الوجهة',
              city: item.destination_port?.split(',')[0] || 'الدمام',
              country: 'المملكة العربية السعودية',
              coordinates: { lat: 26.43, lng: 50.1 },
              estimatedArrival: new Date(Date.now() + 7 * 86400000).toISOString(),
            },
            currentLocation: {
              name: item.current_zone || 'في الطريق البحري',
              coordinates: {
                lat: Number(item.latitude) || 15.0,
                lng: Number(item.longitude) || 55.0,
              },
              speedKnots: 18.0,
              headingDeg: 310,
              lastUpdated: new Date().toISOString(),
              status: 'At Sea',
            },
            progressPercent: 70,
            routeWaypoints: [
              { lat: 22.54, lng: 114.05 },
              { lat: 1.25, lng: 103.85 },
              { lat: Number(item.latitude) || 15.0, lng: Number(item.longitude) || 55.0 },
              { lat: 26.43, lng: 50.1 },
            ],
            currentWaypointIndex: 2,
            dailyMovementNauticalMiles: 390,
            milestones: [
              { id: 'api-m1', title: 'تم التحميل والمغادرة', location: 'الميناء المصدر', date: 'تمت', completed: true },
              { id: 'api-m2', title: 'في المسار الملاحي المباشر', location: item.current_zone || 'البحر', date: 'اليوم', completed: true, isCurrent: true },
              { id: 'api-m3', title: 'وصول الشحنة والتسليم النهائي', location: 'ميناء الوجهة', date: 'مجدول', completed: false },
            ],
          });
        });
      } else {
        throw new Error('لم نتمكن من العثور على مصفوفة حاويات صالحة. يرجى استخدام أحد النماذج الموضحة بالأعلى.');
      }

      if (extractedContainers.length === 0) {
        throw new Error('لم يتم العثور على أي حاويات داخل الكود المدخل.');
      }

      setParsedContainers(extractedContainers);
    } catch (err: any) {
      setParseError(`خطأ في فك ترميز الكود: ${err.message}`);
      setParsedContainers([]);
    }
  };

  const handleConfirmImport = () => {
    if (parsedContainers.length > 0) {
      onImport(parsedContainers);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                استيراد أرقام الحاويات (ملفات Excel / CSV أو كود برمجـي)
              </h3>
              <p className="text-xs text-slate-500">
                ارفع كشف Excel أو CSV لقراءة الحاويات فورياً بنقرة واحدة، أو الصق كود التتبع البرمجي
              </p>
            </div>
          </div>

          <button
            id="btn-close-code-importer"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center border-b border-slate-200 bg-slate-100/70 px-6 pt-2 gap-2">
          <button
            type="button"
            id="tab-btn-excel"
            onClick={() => {
              setActiveTab('excel');
              setParseError(null);
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'excel'
                ? 'bg-white border-emerald-600 text-emerald-800 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>رفع كشف Excel أو CSV</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
              تطبيق فوري
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-live-link"
            onClick={() => {
              setActiveTab('live_link');
              setParseError(null);
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'live_link'
                ? 'bg-white border-blue-600 text-blue-800 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <Link2 className="w-4 h-4 text-blue-600" />
            <span>رابط التعريف / ربط أوتوماتيكي مباشر</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">
              بدون رفع ملفات
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-code"
            onClick={() => {
              setActiveTab('code');
              setParseError(null);
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'code'
                ? 'bg-white border-slate-700 text-slate-800 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <Code className="w-4 h-4 text-slate-600" />
            <span>إدخال كود برمجي (JSON / مصفوفة)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Success Notification Banner */}
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 font-bold">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <span>الانتقال للخريطة وعرض الحاويات</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: EXCEL / CSV UPLOAD ZONE */}
          {activeTab === 'excel' && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-5 rounded-xl border-2 transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/80 shadow-md'
                    : 'border-dashed border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload-excel-input"
                />

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 shadow-sm">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-800">
                          رفع واستيراد كشف Excel أو CSV للحاويات
                        </h4>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                          قراءة وتطبيق فوري
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        اسحب وأفلت الملف هنا أو انقر للرفع (.xlsx, .xls, .csv). يتعرف النظام تلقائياً على أرقام الحاويات في كافة أوراق العمل (All Sheets) ويطبقها مباشرة على الخريطة التفاعلية.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      id="btn-upload-excel-file"
                      type="button"
                      disabled={isProcessingFile}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow cursor-pointer"
                    >
                      {isProcessingFile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جارٍ قراءة وفحص الملف فورياً...</span>
                        </>
                      ) : (
                        <>
                          <FileUp className="w-4 h-4" />
                          <span>اختيار ملف Excel / CSV</span>
                        </>
                      )}
                    </button>

                    <button
                      id="btn-download-sample-template"
                      type="button"
                      onClick={downloadSampleExcelFile}
                      title="تحميل كشف حاويات تجريبي كنموذج جاهز"
                      className="px-3 py-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                      <span>تحميل نموذج تجريبي</span>
                    </button>
                  </div>
                </div>

                {/* Uploaded File Info Banner */}
                {uploadedFileInfo && (
                  <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="font-bold text-slate-800 font-mono">{uploadedFileInfo.name}</span>
                      <span className="text-slate-400 font-mono">({uploadedFileInfo.size} • {uploadedFileInfo.totalRows} صف)</span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-md font-bold">
                        ✓ تم قراءة {uploadedFileInfo.count} حاوية بنجاح وإضافتها فوراً للخريطة
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetFile}
                      title="إلغاء الملف والبدء من جديد"
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Instructions note */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ملاحظات التوافق الذكي:</span>
                </div>
                <p>
                  • يتعرف النظام تلقائياً على صيغ أرقام الحاويات القياسية (مثل MSCU9921840 أو CMAU 123456-7) حتى لو كانت بدون ترويسة أو تحتوي على فواصل أو مسافات.
                </p>
                <p>
                  • إذا كان لديك رابط دائم لجداول جوجل أو واجهة برمجة، يمكنك التبديل إلى تبويب <strong>"رابط التعريف / ربط أوتوماتيكي مباشر"</strong> بالأعلى.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE DEFINITION LINK & AUTO-SYNC */}
          {activeTab === 'live_link' && (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border border-blue-200 rounded-xl space-y-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200 shadow-sm">
                    <Link2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      الربط الأوتوماتيكي المباشر (رابط التعريف / Google Sheets / API)
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      الصق رابط التعريف (رابط Google Sheets مباشر، أو رابط CSV سحابي، أو رابط API / Webhook). سيقوم النظام بجلب ومزامنة الحاويات أوتوماتيكياً دون الحاجة لإعادة رفع أي ملفات!
                    </p>
                  </div>
                </div>

                {/* Direct Google Sheet Quick Connection Card */}
                <div className="bg-white border-2 border-emerald-500/40 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">
                          رابط جدول Google Sheet الخاص بك (39 حاوية)
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                          جاهز للضبط الآلي
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 font-mono mt-0.5" dir="ltr">
                        {DEFAULT_USER_SHEET_URL}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-quick-sync-user-sheet"
                    disabled={isConnectingUrl}
                    onClick={() => {
                      setLiveUrlInput(DEFAULT_USER_SHEET_URL);
                      setTimeout(() => {
                        handleConnectLiveUrl();
                      }, 50);
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer shrink-0"
                  >
                    {isConnectingUrl ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جارٍ الضبط...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>الضبط الآلي والمزامنة الآن</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    أدخل رابط التعريف أو رابط Google Sheets المباشر:
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <Globe className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="input-live-link-url"
                        type="url"
                        value={liveUrlInput}
                        onChange={(e) => {
                          setLiveUrlInput(e.target.value);
                          setParseError(null);
                        }}
                        placeholder="https://docs.google.com/spreadsheets/d/... أو رابط API / CSV"
                        className="w-full pl-3 pr-9 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                        dir="ltr"
                      />
                    </div>
                    <button
                      id="btn-sync-live-link"
                      type="button"
                      disabled={isConnectingUrl || !liveUrlInput.trim()}
                      onClick={handleConnectLiveUrl}
                      className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow cursor-pointer shrink-0 ${
                        liveUrlInput.trim() && !isConnectingUrl
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isConnectingUrl ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جارٍ الاتصال والجلب...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          <span>بدء الربط الأوتوماتيكي والمزامنة</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Compatibility Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-blue-200/60 text-[11px]">
                  <div className="bg-white/80 border border-blue-100 rounded-lg p-2.5">
                    <div className="font-bold text-slate-800 flex items-center gap-1 mb-1">
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                      <span>جداول Google Sheets</span>
                    </div>
                    <p className="text-slate-500 leading-normal">
                      انسخ رابط جدول Google من المتصفح مباشرة وتأكد من صلاحية المشاركة (Anyone with link).
                    </p>
                  </div>

                  <div className="bg-white/80 border border-blue-100 rounded-lg p-2.5">
                    <div className="font-bold text-slate-800 flex items-center gap-1 mb-1">
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                      <span>رابط Webhook / API</span>
                    </div>
                    <p className="text-slate-500 leading-normal">
                      يدعم روابط JSON endpoints أو webhooks لشركات الملاحة ومحطات التتبع.
                    </p>
                  </div>

                  <div className="bg-white/80 border border-blue-100 rounded-lg p-2.5">
                    <div className="font-bold text-slate-800 flex items-center gap-1 mb-1">
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                      <span>رابط سحابي مباشر</span>
                    </div>
                    <p className="text-slate-500 leading-normal">
                      روابط ملفات CSV أو Excel المباشرة على Dropbox أو OneDrive أو خادمك الخاص.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CODE PASTE */}
          {activeTab === 'code' && (
            <div className="space-y-4">

          {/* Preset Template Selectors */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                اختر نموذج جاهز للتجربة أو الصق كودك الخاص:
              </label>
              <span className="text-[11px] text-slate-400 font-mono">يدعم JSON / Array / REST APIs</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyTemplate('json')}
                className={`p-2.5 rounded-lg border text-xs font-semibold text-right transition-all flex flex-col gap-1 ${
                  activeTemplate === 'json'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>📦 نموذج JSON كامل</span>
                <span className="text-[10px] opacity-75 font-normal">حاويات بإحداثيات وموانئ كاملة</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('codes')}
                className={`p-2.5 rounded-lg border text-xs font-semibold text-right transition-all flex flex-col gap-1 ${
                  activeTemplate === 'codes'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>🏷️ مصفوفة أرقام الحاويات</span>
                <span className="text-[10px] opacity-75 font-normal">قائمة بأكواد ISO 6346 القياسية</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('api')}
                className={`p-2.5 rounded-lg border text-xs font-semibold text-right transition-all flex flex-col gap-1 ${
                  activeTemplate === 'api'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>🌐 استجابة API الخط الملاحي</span>
                <span className="text-[10px] opacity-75 font-normal">صيغة Webhook وشركات الشحن</span>
              </button>
            </div>
          </div>

          {/* Code Editor Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>محرر الكود البرمجي (Editor):</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(codeInput)}
                className="hover:text-blue-600 flex items-center gap-1 font-sans"
              >
                <Copy className="w-3 h-3" />
                نسخ الكود
              </button>
            </div>

            <textarea
              id="textarea-code-input"
              rows={9}
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value);
                setParseError(null);
              }}
              placeholder="// الصق هنا الكود المبرمج الذي يحتوي على الحاويات..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-left shadow-inner"
              dir="ltr"
            />
          </div>
        </div>
      )}

          {/* Error Message */}
          {parseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Parsed Preview Section */}
          {parsedContainers.length > 0 && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  تم استخراج {parsedContainers.length} حاوية بنجاح:
                </span>
                <span className="text-[11px] text-slate-500 font-mono">جاهزة للرسم على الخريطة التفاعلية</span>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {parsedContainers.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg bg-white border border-emerald-100 text-xs flex flex-col gap-1 shadow-sm"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-blue-600">{c.id}</span>
                      <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-medium">{c.carrierCode}</span>
                    </div>
                    <div className="text-[11px] text-slate-700 truncate">{c.title}</div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>من: {c.originPort.city}</span>
                      <span>إلى: {c.destinationPort.city}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
          >
            إلغاء
          </button>

          <div className="flex items-center gap-2">
            <button
              id="btn-parse-code"
              type="button"
              onClick={handleParseCode}
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all border border-slate-200 flex items-center gap-1.5 shadow-sm"
            >
              <Code className="w-4 h-4 text-blue-600" />
              فحص وتحليل الكود
            </button>

            <button
              id="btn-confirm-import"
              type="button"
              disabled={parsedContainers.length === 0}
              onClick={handleConfirmImport}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                parsedContainers.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>
                {parsedContainers.length > 0
                  ? `إضافة (${parsedContainers.length}) حاويات للخريطة والمتابعة`
                  : 'إضافة الحاويات للخريطة والمتابعة'}
              </span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
