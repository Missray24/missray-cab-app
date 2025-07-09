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
  status: ReservationStatus;
  statusHistory: StatusHistory[];
  amount: number;
  driverPayout: number;
  paymentMethod: PaymentMethod;
  serviceTierId: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  status: 'Active' | 'Blocked';
}

export type DocumentStatus = 'Pending' | 'Approved' | 'Rejected';

export interface DriverDocument {
  name: string;
  url: string;
  status: DocumentStatus;
}

export interface Driver {
  id: string;
  // Personal
  firstName: string;
  lastName: string;
  email: string;
  phone: {
    countryCode: string;
    number: string;
  };
  // Company
  company: {
    name?: string;
    address?: string;
    siret?: string;
    vatNumber?: string;
    isVatSubjected?: boolean;
    evtcAdsNumber?: string;
  };
  // Vehicle
  vehicle: {
    brand: string;
    model: string;
    licensePlate: string;
    registrationDate: string;
  };
  status: 'Active' | 'Suspended';
  totalRides: number;
  totalEarnings: number;
  unpaidAmount: number;
  paymentDetails: {
    method: 'Bank Transfer' | 'PayPal';
    account: string;
  };
  documents: DriverDocument[];
}


export interface ServiceTier {
  id: string;
  name: string;
  description: string;
  baseFare: number;
  perKm: number;
  icon: any;
}

export interface Zone {
  id: string;
  name: string;
  region: string;
  activeDrivers: number;
  paymentMethods: PaymentMethod[];
  freeWaitingMinutes: number;
  minutesBeforeNoShow: number;
}
