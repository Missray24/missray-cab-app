
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
  id: string; // Corresponds to the id from RequiredDriverDoc
  name: string;
  url: string;
  status: DocumentStatus;
  type: string;
}

export interface RequiredDriverDoc {
    id: string;
    name: string;
    description: string;
    type: 'personal' | 'vehicle';
}

export const requiredDriverDocs: RequiredDriverDoc[] = [
    { id: 'id_card', name: "Carte d'identité", description: 'Recto/verso, en cours de validité', type: 'personal' },
    { id: 'driving_license', name: 'Permis de conduire', description: 'Recto/verso, en cours de validité', type: 'personal' },
    { id: 'profile_photo', name: 'Photo de profil', description: 'Photo claire et professionnelle', type: 'personal' },
    { id: 'vtc_card', name: 'Carte VTC', description: 'Recto/verso, en cours de validité', type: 'personal' },
    { id: 'kbis', name: 'KBIS / SIREN / INSEE', description: 'Document de moins de 3 mois', type: 'personal' },
    { id: 'rc_pro', name: 'RC Professionnelle', description: 'Attestation en cours de validité', type: 'personal' },
    { id: 'vtc_registry', name: "Inscription au registre VTC", description: 'Attestation en cours de validité', type: 'personal' },
    { id: 'rib', name: 'RIB', description: 'Pour le versement de vos revenus', type: 'personal' },
];

export const requiredVehicleDocs: RequiredDriverDoc[] = [
    { id: 'carte_grise', name: 'Carte grise', description: 'Certificat d\'immatriculation du véhicule', type: 'vehicle' },
    { id: 'carte_verte', name: 'Carte verte', description: 'Attestation d\'assurance du véhicule', type: 'vehicle' },
    { id: 'assurance_onereux', name: 'Assurance à titre onéreux', description: 'Transport de personnes', type: 'vehicle' },
    { id: 'macaron_vtc', name: 'Macaron VTC', description: 'Vignette distinctive VTC', type: 'vehicle' },
];


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
