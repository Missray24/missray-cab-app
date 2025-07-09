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
  driverName: string;
  date: string;
  pickup: string;
  dropoff: string;
  status: ReservationStatus;
  statusHistory: StatusHistory[];
  amount: number;
  paymentMethod: PaymentMethod;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  status: 'Active' | 'Blocked';
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  licensePlate: string;
  status: 'Active' | 'Suspended';
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
}
