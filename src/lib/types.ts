

export type ReservationOption = 'Siège bébé' | 'Rehausseur' | 'Animal de compagnie';

export const reservationOptions: ReservationOption[] = [
  'Siège bébé',
  'Rehausseur',
  'Animal de compagnie',
];

export type ReservationStatus =
  | 'Nouvelle demande'
  | 'Acceptée'
  | 'Chauffeur en route'
  | 'Chauffeur sur place'
  | 'Voyageur à bord'
  | 'Terminée'
  | 'Annulée par le chauffeur (sans frais)'
  | 'Annulée par le client (sans frais)'
  | 'Annulée par le chauffeur (avec frais)'
  | 'Annulée par le client (avec frais)'
  | 'No-show';

export const reservationStatuses: ReservationStatus[] = [
  'Nouvelle demande',
  'Acceptée',
  'Chauffeur en route',
  'Chauffeur sur place',
  'Voyageur à bord',
  'Terminée',
  'Annulée par le chauffeur (sans frais)',
  'Annulée par le client (sans frais)',
  'Annulée par le chauffeur (avec frais)',
  'Annulée par le client (avec frais)',
  'No-show',
];

export type PaymentMethod = 'Carte' | 'Espèces' | 'Paiement différé';

export const paymentMethods: PaymentMethod[] = [
  'Carte',
  'Espèces',
  'Paiement différé',
];

export interface StatusHistory {
  status: ReservationStatus;
  timestamp: string;
}

export interface Reservation {
  id: string;
  clientName: string;
  clientId: string;
  driverName: string;
  driverId: string;
  date: string;
  pickup: string;
  dropoff: string;
  stops: string[];
  status: ReservationStatus;
  statusHistory: StatusHistory[];
  amount: number;
  driverPayout: number;
  paymentMethod: PaymentMethod;
  serviceTierId: string;
  stripePaymentId?: string;
  passengers?: number;
  suitcases?: number;
  backpacks?: number;
  options?: ReservationOption[];
}

export type DocumentStatus = 'Pending' | 'Approved' | 'Rejected';

export interface DriverDocument {
  name: string;
  url: string;
  status: DocumentStatus;
}

export interface DriverProfile {
    company: {
      name?: string;
      address?: string;
      siret?: string;
      vatNumber?: string;
      isVatSubjected?: boolean;
      evtcAdsNumber?: string;
      commission?: number;
    };
    vehicle: {
      brand: string;
      model: string;
      licensePlate: string;
      registrationDate: string;
    };
    totalRides: number;
    totalEarnings: number;
    unpaidAmount: number;
    paymentDetails: {
      method: 'Bank Transfer' | 'PayPal';
      account: string;
    };
    documents: DriverDocument[];
}

export interface User {
  id: string;
  uid: string;
  role: 'client' | 'driver' | 'admin';
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  joinDate: string;
  status: 'Active' | 'Blocked' | 'Suspended';
  driverProfile?: DriverProfile;
}

export interface ServiceTier {
  id: string;
  name: string;
  reference: string;
  description: string;
  photoUrl: string;
  baseFare: number;
  perKm: number;
  perMinute: number;
  perStop: number;
  minimumPrice: number;
  availableZoneIds: string[];
  capacity: {
    passengers: number;
    suitcases: number;
    backpacks?: number;
  };
}

export interface Zone {
  id: string;
  name: string;
  region: string;
  activeDrivers: number;
  paymentMethods: PaymentMethod[];
  freeWaitingMinutes: number;
  minutesBeforeNoShow: number;
  polygon?: { lat: number; lng: number }[];
}
