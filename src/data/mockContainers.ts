import { Container, DailyUpdateLog } from '../types';

export const INITIAL_CONTAINERS: Container[] = [
  {
    id: 'MSCU7482910',
    title: 'شحنة أجهزة كهربائية وقطع غيار صناعية',
    carrier: 'MSC (Mediterranean Shipping Co)',
    carrierCode: 'MSCU',
    vesselName: 'MSC Gülsün (Ultra Large Container Vessel)',
    voyageNumber: 'AE2408W',
    type: '40ft High Cube',
    cargoDescription: 'معدات إلكترونية ومحولات طاقة',
    weightKg: 24500,
    originPort: {
      name: 'ميناء نانشا الدولي (Port of Nansha)',
      city: 'نانشا (قوانغتشو)',
      country: 'الصين',
      coordinates: { lat: 22.6450, lng: 113.6700 },
      departureDate: '2026-08-25T04:00:00Z',
    },
    destinationPort: {
      name: 'ميناء جبل علي (Jebel Ali)',
      city: 'دبي',
      country: 'الإمارات',
      coordinates: { lat: 25.0066, lng: 55.0617 },
      estimatedArrival: '2026-09-12T16:00:00Z',
    },
    currentLocation: {
      name: 'بحر العرب (Arabian Sea) متجهة نحو مضيق هرمز',
      coordinates: { lat: 20.4502, lng: 64.1205 },
      speedKnots: 18.4,
      headingDeg: 295,
      lastUpdated: '2026-09-06T06:00:00Z',
      status: 'At Sea',
    },
    progressPercent: 72,
    routeWaypoints: [
      { lat: 22.6450, lng: 113.6700 }, // Nansha
      { lat: 14.2, lng: 112.5 }, // South China Sea
      { lat: 1.29027, lng: 103.851959 }, // Singapore Strait
      { lat: 5.95, lng: 95.2 }, // Malacca exit
      { lat: 6.0, lng: 80.2 }, // Sri Lanka South
      { lat: 14.5, lng: 70.0 }, // Arabian Sea
      { lat: 20.4502, lng: 64.1205 }, // Current Position
      { lat: 24.5, lng: 58.5 }, // Gulf of Oman
      { lat: 26.2, lng: 56.4 }, // Strait of Hormuz
      { lat: 25.0066, lng: 55.0617 }, // Jebel Ali Port
    ],
    currentWaypointIndex: 6,
    dailyMovementNauticalMiles: 380,
    batteryLevel: 94,
    milestones: [
      {
        id: 'm1',
        title: 'استلام الحاوية وتحميلها بمحطة نانشا GOCT',
        location: 'ميناء نانشا، قوانغتشو، الصين',
        date: '25 أغسطس 2026',
        completed: true,
      },
      {
        id: 'm2',
        title: 'الإبحار وعبور مضيق ملقا وميناء سنغافورة',
        location: 'سنغافورة',
        date: '31 أغسطس 2026',
        completed: true,
      },
      {
        id: 'm3',
        title: 'عبور بحر العرب في طريقها للخليج العربي',
        location: 'بحر العرب',
        date: '06 سبتمبر 2026',
        completed: true,
        isCurrent: true,
      },
      {
        id: 'm4',
        title: 'الوصول المتوقع لميناء جبل علي وبدء التفريغ',
        location: 'دبي، الإمارات',
        date: '12 سبتمبر 2026',
        completed: false,
      },
      {
        id: 'm5',
        title: 'التخليص الجمركي والنقل البري للوجهة النهائية',
        location: 'المستودع الرئيسي',
        date: '14 سبتمبر 2026',
        completed: false,
      },
    ],
  },
  {
    id: 'COSU8391024',
    title: 'شحنة مواد بناء وتشطيبات رخامية وسيراميك',
    carrier: 'COSCO Shipping Lines',
    carrierCode: 'COSU',
    vesselName: 'COSCO Shipping Universe',
    voyageNumber: 'CS2026-ME',
    type: '20ft Standard',
    cargoDescription: 'ألواح جرانيت ورخام صناعي عالي الجودة',
    weightKg: 28100,
    originPort: {
      name: 'ميناء نانشا الدولي (Port of Nansha)',
      city: 'نانشا (قوانغتشو)',
      country: 'الصين',
      coordinates: { lat: 22.6450, lng: 113.6700 },
      departureDate: '2026-08-28T02:30:00Z',
    },
    destinationPort: {
      name: 'ميناء جدة الإسلامي (Jeddah Islamic Port)',
      city: 'جدة',
      country: 'المملكة العربية السعودية',
      coordinates: { lat: 21.4858, lng: 39.1925 },
      estimatedArrival: '2026-09-15T12:00:00Z',
    },
    currentLocation: {
      name: 'خليج عدن مقتربة من مضيق باب المندب',
      coordinates: { lat: 12.35, lng: 46.85 },
      speedKnots: 17.2,
      headingDeg: 302,
      lastUpdated: '2026-09-06T05:30:00Z',
      status: 'At Sea',
    },
    progressPercent: 64,
    routeWaypoints: [
      { lat: 22.6450, lng: 113.6700 }, // Nansha
      { lat: 14.2, lng: 112.5 },
      { lat: 1.25, lng: 103.85 }, // Singapore
      { lat: 5.8, lng: 80.5 }, // Sri Lanka
      { lat: 10.0, lng: 60.0 }, // Central Arabian Sea
      { lat: 12.35, lng: 46.85 }, // Current Position (Gulf of Aden)
      { lat: 12.58, lng: 43.34 }, // Bab-el-Mandeb
      { lat: 16.5, lng: 41.2 }, // Red Sea south
      { lat: 21.4858, lng: 39.1925 }, // Jeddah
    ],
    currentWaypointIndex: 5,
    dailyMovementNauticalMiles: 360,
    batteryLevel: 88,
    milestones: [
      {
        id: 'c1',
        title: 'مغادرة ميناء نانشا بالصين',
        location: 'ميناء نانشا، قوانغتشو، الصين',
        date: '28 أغسطس 2026',
        completed: true,
      },
      {
        id: 'c2',
        title: 'المرور بمضيق سنغافورة والتزود بالوقود',
        location: 'سنغافورة',
        date: '02 سبتمبر 2026',
        completed: true,
      },
      {
        id: 'c3',
        title: 'دخول خليج عدن متجهة نحو البحر الأحمر',
        location: 'خليج عدن',
        date: '06 سبتمبر 2026',
        completed: true,
        isCurrent: true,
      },
      {
        id: 'c4',
        title: 'الوصول إلى ميناء جدة الإسلامي',
        location: 'جدة، السعودية',
        date: '15 سبتمبر 2026',
        completed: false,
      },
    ],
  },
  {
    id: 'MAEU6192847',
    title: 'شحنة مواد غذائية مجمدة وحساسة للحرارة',
    carrier: 'Maersk Line',
    carrierCode: 'MAEU',
    vesselName: 'Madrid Maersk (Triple-E class)',
    voyageNumber: '2609A',
    type: '40ft Reefer (مبرد)',
    cargoDescription: 'شوكولاتة فاخرة ومشتقات ألبان معقمة',
    weightKg: 21400,
    temperatureCelsius: -18.4,
    originPort: {
      name: 'ميناء روتردام (Port of Rotterdam)',
      city: 'روتردام',
      country: 'هولندا',
      coordinates: { lat: 51.9244, lng: 4.4777 },
      departureDate: '2026-09-01T10:00:00Z',
    },
    destinationPort: {
      name: 'ميناء الإسكندرية الكبير (Alexandria Port)',
      city: 'الإسكندرية',
      country: 'مصر',
      coordinates: { lat: 31.2001, lng: 29.9187 },
      estimatedArrival: '2026-09-10T18:00:00Z',
    },
    currentLocation: {
      name: 'البحر الأبيض المتوسط جنوب صقلية',
      coordinates: { lat: 35.8, lng: 15.2 },
      speedKnots: 19.5,
      headingDeg: 118,
      lastUpdated: '2026-09-06T07:15:00Z',
      status: 'At Sea',
    },
    progressPercent: 58,
    routeWaypoints: [
      { lat: 51.9244, lng: 4.4777 }, // Rotterdam
      { lat: 49.5, lng: -4.0 }, // English Channel
      { lat: 43.5, lng: -9.5 }, // Bay of Biscay
      { lat: 36.14, lng: -5.35 }, // Strait of Gibraltar
      { lat: 37.0, lng: 3.0 }, // Mediterranean (Algiers)
      { lat: 35.8, lng: 15.2 }, // Current position (South of Sicily)
      { lat: 34.0, lng: 24.0 }, // South Crete
      { lat: 31.2001, lng: 29.9187 }, // Alexandria
    ],
    currentWaypointIndex: 5,
    dailyMovementNauticalMiles: 410,
    batteryLevel: 98,
    milestones: [
      {
        id: 'r1',
        title: 'الفحص المخبري وضبط درجة حرارة الحاوية (-18° م)',
        location: 'روتردام، هولندا',
        date: '01 سبتمبر 2026',
        completed: true,
      },
      {
        id: 'r2',
        title: 'عبور مضيق جبل طارق ودخول البحر المتوسط',
        location: 'مضيق جبل طارق',
        date: '04 سبتمبر 2026',
        completed: true,
      },
      {
        id: 'r3',
        title: 'الإبحار في البحر الأبيض المتوسط بسرعة 19.5 عقدة',
        location: 'البحر المتوسط',
        date: '06 سبتمبر 2026',
        completed: true,
        isCurrent: true,
      },
      {
        id: 'r4',
        title: 'الرسو في ميناء الإسكندرية والتفريغ السريع للمبردات',
        location: 'الإسكندرية، مصر',
        date: '10 سبتمبر 2026',
        completed: false,
      },
    ],
  },
  {
    id: 'CMAU9821035',
    title: 'شحنة ملابس وأنسجة قطنية وتجهيزات معارض',
    carrier: 'CMA CGM',
    carrierCode: 'CMAU',
    vesselName: 'CMA CGM Jacques Saadé (LNG Powered)',
    voyageNumber: 'FAL1-2026',
    type: '40ft Standard',
    cargoDescription: 'أقمشة مفروشة ومنسوجات مصنعة جاهزة',
    weightKg: 19800,
    originPort: {
      name: 'ميناء سنغافورة (Port of Singapore)',
      city: 'سنغافورة',
      country: 'سنغافورة',
      coordinates: { lat: 1.29027, lng: 103.851959 },
      departureDate: '2026-08-30T08:00:00Z',
    },
    destinationPort: {
      name: 'ميناء الملك عبد العزيز (Dammam Port)',
      city: 'الدمام',
      country: 'المملكة العربية السعودية',
      coordinates: { lat: 26.4344, lng: 50.1033 },
      estimatedArrival: '2026-09-14T08:00:00Z',
    },
    currentLocation: {
      name: 'بحر العرب قبالة الساحل العماني',
      coordinates: { lat: 18.2, lng: 58.8 },
      speedKnots: 18.0,
      headingDeg: 340,
      lastUpdated: '2026-09-06T06:45:00Z',
      status: 'At Sea',
    },
    progressPercent: 68,
    routeWaypoints: [
      { lat: 1.29027, lng: 103.851959 }, // Singapore
      { lat: 5.5, lng: 95.0 }, // Malacca North
      { lat: 6.0, lng: 80.0 }, // Sri Lanka
      { lat: 12.0, lng: 67.0 }, // Arabian Sea
      { lat: 18.2, lng: 58.8 }, // Current Position (Oman Coast)
      { lat: 23.6, lng: 58.6 }, // Muscat
      { lat: 26.1, lng: 56.5 }, // Hormuz
      { lat: 26.4344, lng: 50.1033 }, // Dammam
    ],
    currentWaypointIndex: 4,
    dailyMovementNauticalMiles: 395,
    batteryLevel: 91,
    milestones: [
      {
        id: 's1',
        title: 'التحميل بميناء سنغافورة ومغادرة المرفأ',
        location: 'سنغافورة',
        date: '30 أغسطس 2026',
        completed: true,
      },
      {
        id: 's2',
        title: 'عبور المحيط الهندي وبحر العرب',
        location: 'بحر العرب',
        date: '06 سبتمبر 2026',
        completed: true,
        isCurrent: true,
      },
      {
        id: 's3',
        title: 'عبور مضيق هرمز ودخول الخليج العربي',
        location: 'مضيق هرمز',
        date: '10 سبتمبر 2026',
        completed: false,
      },
      {
        id: 's4',
        title: 'الوصول لميناء الملك عبد العزيز بالدمام',
        location: 'الدمام، السعودية',
        date: '14 سبتمبر 2026',
        completed: false,
      },
    ],
  },
];

export const INITIAL_LOGS: DailyUpdateLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-09-06T06:00:00Z',
    containerId: 'MSCU7482910',
    vesselName: 'MSC Gülsün',
    previousCoordinates: { lat: 17.6, lng: 67.8 },
    newCoordinates: { lat: 20.4502, lng: 64.1205 },
    distanceTraveledNm: 380,
    status: 'At Sea (18.4 kts)',
    automated: true,
    details: 'تم التحديث التلقائي اليومي بنجاح عبر نظام AIS ونظام تتبع الخط الملاحي MSC API. السفينة في مسارها المحدد.',
  },
  {
    id: 'log-2',
    timestamp: '2026-09-06T05:30:00Z',
    containerId: 'COSU8391024',
    vesselName: 'COSCO Shipping Universe',
    previousCoordinates: { lat: 10.8, lng: 52.1 },
    newCoordinates: { lat: 12.35, lng: 46.85 },
    distanceTraveledNm: 360,
    status: 'At Sea (17.2 kts)',
    automated: true,
    details: 'تحديث أوتوماتيكي مجدول: الحاوية اقتربت من مضيق باب المندب قبالة خليج عدن. لا توجد تأخيرات ملاحية.',
  },
  {
    id: 'log-3',
    timestamp: '2026-09-06T07:15:00Z',
    containerId: 'MAEU6192847',
    vesselName: 'Madrid Maersk',
    previousCoordinates: { lat: 36.5, lng: 7.9 },
    newCoordinates: { lat: 35.8, lng: 15.2 },
    distanceTraveledNm: 410,
    status: 'At Sea (19.5 kts)',
    automated: true,
    details: 'مزامنة قياسات الحاوية الذكية IoT: درجة حرارة وحدة التبريد مستقرة عند -18.4° مئوية، ومستوى البطارية 98%.',
  },
  {
    id: 'log-4',
    timestamp: '2026-09-05T06:00:00Z',
    containerId: 'MSCU7482910',
    vesselName: 'MSC Gülsün',
    previousCoordinates: { lat: 14.5, lng: 71.3 },
    newCoordinates: { lat: 17.6, lng: 67.8 },
    distanceTraveledNm: 375,
    status: 'At Sea (18.1 kts)',
    automated: true,
    details: 'التحديث اليومي الصباحي المجدول. مسار بحري صافٍ وظروف جوية مواتية في شمال المحيط الهندي.',
  },
];
