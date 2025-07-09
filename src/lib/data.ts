import type { Reservation, Client, Driver, ServiceTier, Zone } from './types';
import { Car, CarTaxiFront, Rocket } from "lucide-react";

export const reservations: Reservation[] = [
  { id: 'RES-001', clientName: 'Alice Johnson', driverName: 'Bob Williams', date: '2023-10-26', pickup: '123 Main St', dropoff: '456 Oak Ave', status: 'Terminée', amount: 25.50, paymentMethod: 'Carte',
    statusHistory: [
      { status: 'Nouvelle demande', timestamp: '26/10/2023 10:00' },
      { status: 'Acceptée', timestamp: '26/10/2023 10:02' },
      { status: 'Chauffeur en route', timestamp: '26/10/2023 10:05' },
      { status: 'Chauffeur sur place', timestamp: '26/10/2023 10:15' },
      { status: 'Voyageur à bord', timestamp: '26/10/2023 10:18' },
      { status: 'Terminée', timestamp: '26/10/2023 10:30' },
    ]
  },
  { id: 'RES-002', clientName: 'Charlie Brown', driverName: 'Diana Prince', date: '2023-10-26', pickup: '789 Pine Ln', dropoff: '101 Maple Dr', status: 'Nouvelle demande', amount: 18.75, paymentMethod: 'Espèces',
    statusHistory: [
      { status: 'Nouvelle demande', timestamp: '26/10/2023 11:00' },
    ]
  },
  { id: 'RES-003', clientName: 'Eve Adams', driverName: 'Frank White', date: '2023-10-25', pickup: '212 Birch Rd', dropoff: '333 Cedar Blvd', status: 'Terminée', amount: 32.00, paymentMethod: 'Paiement différé',
    statusHistory: [
      { status: 'Nouvelle demande', timestamp: '25/10/2023 14:00' },
      { status: 'Acceptée', timestamp: '25/10/2023 14:01' },
      { status: 'Chauffeur en route', timestamp: '25/10/2023 14:03' },
      { status: 'Chauffeur sur place', timestamp: '25/10/2023 14:10' },
      { status: 'Voyageur à bord', timestamp: '25/10/2023 14:12' },
      { status: 'Terminée', timestamp: '25/10/2023 14:25' },
    ]
  },
  { id: 'RES-004', clientName: 'Grace Lee', driverName: 'Henry Green', date: '2023-10-27', pickup: '444 Elm Ct', dropoff: '555 Spruce Way', status: 'Annulée par le client (sans frais)', amount: 22.10, paymentMethod: 'Carte',
    statusHistory: [
      { status: 'Nouvelle demande', timestamp: '27/10/2023 09:00' },
      { status: 'Acceptée', timestamp: '27/10/2023 09:02' },
      { status: 'Annulée par le client (sans frais)', timestamp: '27/10/2023 09:05' },
    ]
  },
  { id: 'RES-005', clientName: 'Ivy Chen', driverName: 'Jack Black', date: '2023-10-28', pickup: '666 Willow Ave', dropoff: '777 Redwood Pkwy', status: 'Nouvelle demande', amount: 45.30, paymentMethod: 'Espèces',
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
  { id: 'DRV-001', name: 'Bob Williams', email: 'bob@example.com', phone: '555-0201', vehicle: 'Toyota Camry', licensePlate: 'DRV-123', status: 'Active', totalRides: 120, totalEarnings: 3250.50, unpaidAmount: 450.00, paymentDetails: { method: 'Bank Transfer', account: 'FR76...XX' } },
  { id: 'DRV-002', name: 'Diana Prince', email: 'diana@example.com', phone: '555-0202', vehicle: 'Honda Accord', licensePlate: 'DRV-456', status: 'Active', totalRides: 95, totalEarnings: 2890.75, unpaidAmount: 210.50, paymentDetails: { method: 'PayPal', account: 'diana.p@email.com' } },
  { id: 'DRV-003', name: 'Frank White', email: 'frank@example.com', phone: '555-0203', vehicle: 'Ford Fusion', licensePlate: 'DRV-789', status: 'Suspended', totalRides: 50, totalEarnings: 1500.00, unpaidAmount: 0, paymentDetails: { method: 'Bank Transfer', account: 'FR76...YY' } },
  { id: 'DRV-004', name: 'Henry Green', email: 'henry@example.com', phone: '555-0204', vehicle: 'Chevrolet Malibu', licensePlate: 'DRV-101', status: 'Active', totalRides: 150, totalEarnings: 4100.20, unpaidAmount: 850.70, paymentDetails: { method: 'Bank Transfer', account: 'FR76...ZZ' } },
  { id: 'DRV-005', name: 'Jack Black', email: 'jack@example.com', phone: '555-0205', vehicle: 'Tesla Model 3', licensePlate: 'DRV-212', status: 'Active', totalRides: 200, totalEarnings: 5500.00, unpaidAmount: 1200.00, paymentDetails: { method: 'PayPal', account: 'jack.b@email.com' } },
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
