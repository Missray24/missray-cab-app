import type { Reservation, Client, Driver, ServiceTier, Zone } from './types';
import { Car, CarTaxiFront, Rocket } from "lucide-react";

export const reservations: Reservation[] = [
  { id: 'RES-001', clientName: 'Alice Johnson', clientId: 'CLI-001', driverName: 'Bob Williams', driverId: 'DRV-001', date: '2023-10-26', pickup: '123 Main St', dropoff: '456 Oak Ave', status: 'Terminée', amount: 25.50, driverPayout: 20.40, paymentMethod: 'Carte', serviceTierId: 'tier-1',
    statusHistory: [
      { status: 'Nouvelle demande', timestamp: '26/10/2023 10:00' },
      { status: 'Acceptée', timestamp: '26/10/2023 10:02' },
      { status: 'Chauffeur en route', timestamp: '26/10/2023 10:05' },
      { status: 'Chauffeur sur place', timestamp: '26/10/2023 10:15' },
      { status: 'Voyageur à bord', timestamp: '26/10/2023 10:18' },
      { status: 'Terminée', timestamp: '26/10/2023 10:30' },
    ]
  },
  { id: 'RES-002', clientName: 'Charlie Brown', clientId: 'CLI-002', driverName: 'Diana Prince', driverId: 'DRV-002', date: '2023-10-26', pickup: '789 Pine Ln', dropoff: '101 Maple Dr', status: 'Nouvelle demande', amount: 18.75, driverPayout: 15.00, paymentMethod: 'Espèces', serviceTierId: 'tier-1',
    statusHistory: [
      { status: 'Nouvelle demande', timestamp: '26/10/2023 11:00' },
    ]
  },
  { id: 'RES-003', clientName: 'Eve Adams', clientId: 'CLI-003', driverName: 'Frank White', driverId: 'DRV-003', date: '2023-10-25', pickup: '212 Birch Rd', dropoff: '333 Cedar Blvd', status: 'Terminée', amount: 32.00, driverPayout: 25.60, paymentMethod: 'Paiement différé', serviceTierId: 'tier-2',
    statusHistory: [
      { status: 'Nouvelle demande', timestamp: '25/10/2023 14:00' },
      { status: 'Acceptée', timestamp: '25/10/2023 14:01' },
      { status: 'Chauffeur en route', timestamp: '25/10/2023 14:03' },
      { status: 'Chauffeur sur place', timestamp: '25/10/2023 14:10' },
      { status: 'Voyageur à bord', timestamp: '25/10/2023 14:12' },
      { status: 'Terminée', timestamp: '25/10/2023 14:25' },
    ]
  },
  { id: 'RES-004', clientName: 'Grace Lee', clientId: 'CLI-004', driverName: 'Henry Green', driverId: 'DRV-004', date: '2023-10-27', pickup: '444 Elm Ct', dropoff: '555 Spruce Way', status: 'Annulée par le client (sans frais)', amount: 22.10, driverPayout: 17.68, paymentMethod: 'Carte', serviceTierId: 'tier-1',
    statusHistory: [
      { status: 'Nouvelle demande', timestamp: '27/10/2023 09:00' },
      { status: 'Acceptée', timestamp: '27/10/2023 09:02' },
      { status: 'Annulée par le client (sans frais)', timestamp: '27/10/2023 09:05' },
    ]
  },
  { id: 'RES-005', clientName: 'Ivy Chen', clientId: 'CLI-005', driverName: 'Jack Black', driverId: 'DRV-005', date: '2023-10-28', pickup: '666 Willow Ave', dropoff: '777 Redwood Pkwy', status: 'Nouvelle demande', amount: 45.30, driverPayout: 36.24, paymentMethod: 'Espèces', serviceTierId: 'tier-3',
    statusHistory: [
        { status: 'Nouvelle demande', timestamp: '28/10/2023 18:00' },
    ]
  },
];

export const clients: Client[] = [
  { id: 'CLI-001', name: 'Alice Johnson', email: 'alice@example.com', phone: '555-0101', joinDate: '2023-01-15', status: 'Active' },
  { id: 'CLI-002', name: 'Charlie Brown', email: 'charlie@example.com', phone: '555-0102', joinDate: '2023-02-20', status: 'Active' },
  { id: 'CLI-003', name: 'Eve Adams', email: 'eve@example.com', phone: '555-0103', joinDate: '2023-03-10', status: 'Blocked' },
  { id: 'CLI-004', name: 'Grace Lee', email: 'grace@example.com', phone: '555-0104', joinDate: '2023-04-05', status: 'Active' },
  { id: 'CLI-005', name: 'Ivy Chen', email: 'ivy@example.com', phone: '555-0105', joinDate: '2023-05-21', status: 'Active' },
];

export const drivers: Driver[] = [
  { id: 'DRV-001', firstName: 'Bob', lastName: 'Williams', email: 'bob@example.com', phone: { countryCode: '+33', number: '601020301' }, company: { name: 'Bob Transports', address: '1 rue de la Paix, Paris', siret: '12345678901234', vatNumber: 'FR123456789', isVatSubjected: true, evtcAdsNumber: 'EVTC12345' }, vehicle: { brand: 'Toyota', model: 'Camry', licensePlate: 'DRV-123', registrationDate: '2022-01-15' }, status: 'Active', totalRides: 120, totalEarnings: 3250.50, unpaidAmount: 450.00, paymentDetails: { method: 'Bank Transfer', account: 'FR76...XX' }, documents: [{ name: "Permis de conduire", url: "https://placehold.co/600x400.png", status: 'Approved' }, { name: 'Carte grise', url: 'https://placehold.co/600x400.png', status: 'Approved' }] },
  { id: 'DRV-002', firstName: 'Diana', lastName: 'Prince', email: 'diana@example.com', phone: { countryCode: '+33', number: '601020302' }, company: { name: 'Prince VTC', address: '2 avenue des Champs, Paris', siret: '23456789012345', vatNumber: 'FR234567890', isVatSubjected: true, evtcAdsNumber: 'EVTC23456' }, vehicle: { brand: 'Honda', model: 'Accord', licensePlate: 'DRV-456', registrationDate: '2021-11-20' }, status: 'Active', totalRides: 95, totalEarnings: 2890.75, unpaidAmount: 210.50, paymentDetails: { method: 'PayPal', account: 'diana.p@email.com' }, documents: [{ name: "Permis de conduire", url: "https://placehold.co/600x400.png", status: 'Pending' }] },
  { id: 'DRV-003', firstName: 'Frank', lastName: 'White', email: 'frank@example.com', phone: { countryCode: '+33', number: '601020303' }, company: { name: 'White Cars', address: '3 place de la Concorde, Paris', siret: '34567890123456', vatNumber: 'FR345678901', isVatSubjected: false, evtcAdsNumber: 'ADS78910' }, vehicle: { brand: 'Ford', model: 'Fusion', licensePlate: 'DRV-789', registrationDate: '2023-02-10' }, status: 'Suspended', totalRides: 50, totalEarnings: 1500.00, unpaidAmount: 0, paymentDetails: { method: 'Bank Transfer', account: 'FR76...YY' }, documents: [] },
  { id: 'DRV-004', firstName: 'Henry', lastName: 'Green', email: 'henry@example.com', phone: { countryCode: '+33', number: '601020304' }, company: { name: 'Green Drive', address: '4 rue du Faubourg, Paris', siret: '45678901234567', vatNumber: 'FR456789012', isVatSubjected: true, evtcAdsNumber: 'EVTC45678' }, vehicle: { brand: 'Chevrolet', model: 'Malibu', licensePlate: 'DRV-101', registrationDate: '2020-07-30' }, status: 'Active', totalRides: 150, totalEarnings: 4100.20, unpaidAmount: 850.70, paymentDetails: { method: 'Bank Transfer', account: 'FR76...ZZ' }, documents: [{ name: "Permis de conduire", url: "https://placehold.co/600x400.png", status: 'Approved' }, { name: 'Carte grise', url: 'https://placehold.co/600x400.png', status: 'Rejected' }] },
  { id: 'DRV-005', firstName: 'Jack', lastName: 'Black', email: 'jack@example.com', phone: { countryCode: '+33', number: '601020305' }, company: { name: 'JB Transport', address: '5 boulevard Haussmann, Paris', siret: '56789012345678', vatNumber: 'FR567890123', isVatSubjected: false, evtcAdsNumber: 'ADS89012' }, vehicle: { brand: 'Tesla', model: 'Model 3', licensePlate: 'DRV-212', registrationDate: '2023-05-20' }, status: 'Active', totalRides: 200, totalEarnings: 5500.00, unpaidAmount: 1200.00, paymentDetails: { method: 'PayPal', account: 'jack.b@email.com' }, documents: [{ name: "Permis de conduire", url: "https://placehold.co/600x400.png", status: 'Pending' }] },
];

export const serviceTiers: ServiceTier[] = [
    { id: 'tier-1', name: 'Economy', description: 'Affordable and efficient rides.', baseFare: 2.50, perKm: 0.90, icon: Car },
    { id: 'tier-2', name: 'Premium', description: 'Comfort and luxury combined.', baseFare: 5.00, perKm: 1.50, icon: CarTaxiFront },
    { id: 'tier-3', name: 'XL', description: 'More space for more passengers.', baseFare: 7.00, perKm: 2.00, icon: Rocket },
];

export const zones: Zone[] = [
    { id: 'zone-1', name: 'Downtown Core', region: 'Metropolis Central', activeDrivers: 45, paymentMethods: ['Carte', 'Espèces'], freeWaitingMinutes: 5, minutesBeforeNoShow: 10 },
    { id: 'zone-2', name: 'North Suburbs', region: 'Metropolis North', activeDrivers: 23, paymentMethods: ['Carte', 'Espèces', 'Paiement différé'], freeWaitingMinutes: 3, minutesBeforeNoShow: 8 },
    { id: 'zone-3', name: 'Airport District', region: 'Metropolis South', activeDrivers: 67, paymentMethods: ['Carte'], freeWaitingMinutes: 2, minutesBeforeNoShow: 5 },
    { id: 'zone-4', name: 'Western Industrial', region: 'Metropolis West', activeDrivers: 12, paymentMethods: ['Espèces', 'Paiement différé'], freeWaitingMinutes: 7, minutesBeforeNoShow: 12 },
]
