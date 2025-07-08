export interface Reservation {
  id: string;
  clientName: string;
  driverName: string;
  date: string;
  pickup: string;
  dropoff: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
  amount: number;
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
