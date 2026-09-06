export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Milestone {
  id: string;
  title: string;
  location: string;
  date: string;
  completed: boolean;
  isCurrent?: boolean;
  notes?: string;
}

export interface Container {
  id: string; // e.g. MSCU7849201 (ISO 6346)
  title: string; // e.g. شحنة إلكترونيات وأجهزة منزلية
  carrier: string; // Maersk, MSC, CMA CGM, COSCO, Hapag-Lloyd, Evergreen
  carrierCode: string;
  vesselName: string;
  voyageNumber: string;
  type: '40ft Standard' | '20ft Standard' | '40ft High Cube' | '40ft Reefer (مبرد)';
  cargoDescription: string;
  weightKg: number;
  originPort: {
    name: string;
    city: string;
    country: string;
    coordinates: Coordinate;
    departureDate: string;
  };
  destinationPort: {
    name: string;
    city: string;
    country: string;
    coordinates: Coordinate;
    estimatedArrival: string;
  };
  currentLocation: {
    name: string;
    coordinates: Coordinate;
    speedKnots: number;
    headingDeg: number;
    lastUpdated: string;
    status: 'In Transit' | 'At Sea' | 'In Port' | 'Customs' | 'Out for Delivery' | 'Delivered';
  };
  progressPercent: number; // 0 to 100
  routeWaypoints: Coordinate[]; // full journey waypoints
  currentWaypointIndex: number;
  milestones: Milestone[];
  dailyMovementNauticalMiles: number;
  temperatureCelsius?: number; // for reefers
  batteryLevel?: number; // for IoT smart trackers
  sequenceNumber?: string; // e.g. RQ6038
  packagesCount?: number; // e.g. 334 طرد
  volumeCbm?: number; // e.g. 72.153 CBM
  containerColor?: string; // Blue, red, white
  daysInTransit?: number; // e.g. 73 يوم
  lineName?: string;
  terminalName?: string; // e.g. محطة نانشا المرحلة الثانية (GOCT)
  entryDate?: string; // e.g. 2026-09-03
  etdDate?: string; // e.g. 2026-09-14
  berthDate?: string; // e.g. 2026-09-13 23:00
}

export interface DailyUpdateLog {
  id: string;
  timestamp: string;
  containerId: string;
  vesselName: string;
  previousCoordinates: Coordinate;
  newCoordinates: Coordinate;
  distanceTraveledNm: number;
  status: string;
  automated: boolean;
  details: string;
}

export interface AutoUpdateConfig {
  enabled: boolean;
  updateHourUtc: number; // e.g. 6 (06:00 UTC)
  frequencyHours: number; // 24 = every day
  lastSyncTimestamp: string;
  nextSyncTimestamp: string;
  simulationStep: number; // percent advance on simulated sync
}
