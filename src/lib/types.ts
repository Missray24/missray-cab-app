
import { Baby, Armchair, Dog, type LucideIcon } from "lucide-react";

export type ReservationOption = 'Siège bébé' | 'Rehausseur' | 'Animal';

export const reservationOptions: { name: ReservationOption, icon: LucideIcon, price: number }[] = [
  { name: 'Siège bébé', icon: Baby, price: 5 },
  { name: 'Rehausseur', icon: Armchair, price: 5 },
  { name: 'Animal', icon: Dog, price: 10 },
];

export interface SelectedOption {
    name: ReservationOption;
    quantity: number;
}

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
  passengers: number | null;
  suitcases: number | null;
  backpacks: number | null;
  options?: SelectedOption[];
  distance?: string;
  duration?: string;
}

export type DocumentStatus = 'Pending' | 'Approved' | 'Rejected';

export interface DriverDocument {
  name: string;
  url: string;
  status: DocumentStatus;
  type: string;
}

export interface Vehicle {
    id: string;
    brand: string;
    model: string;
    licensePlate: string;
    registrationDate: string;
}

export interface DriverProfile {
    activeZoneIds: string[];
    company: {
      name?: string;
      address?: string;
      siret?: string;
      vatNumber?: string;
      isVatSubjected?: boolean;
      evtcAdsNumber?: string;
      commission?: number;
    };
    vehicles: Vehicle[];
    totalRides: number;
    totalEarnings: number;
    unpaidAmount: number;
    paymentDetails: {
      method: 'Bank Transfer' | 'PayPal';
      account: string;
    };
    documents: DriverDocument[];
}

export type UserStatus = 'Active' | 'Blocked' | 'Suspended' | 'Pending';

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
  status: UserStatus;
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
  registrationDate: string;
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
