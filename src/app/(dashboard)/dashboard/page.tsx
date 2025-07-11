
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  DollarSign,
  Users,
  CalendarCheck,
  Car,
  MoreVertical,
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, where } from "firebase/firestore";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { reservationStatuses, paymentMethods, type Reservation, type ReservationStatus, type PaymentMethod, type User, type ServiceTier } from '@/lib/types';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const chartData = [
  { month: 'Jan', reservations: 186, revenue: 4230 },
  { month: 'Feb', reservations: 305, revenue: 7890 },
  { month: 'Mar', reservations: 237, revenue: 6210 },
  { month: 'Apr', reservations: 273, revenue: 7150 },
  { month: 'May', reservations: 209, revenue: 5490 },
  { month: 'Jun', reservations: 214, revenue: 5670 },
];

const chartConfig = {
  reservations: {
    label: 'Réservations',
    color: 'hsl(var(--chart-1))',
  },
  revenue: {
    label: 'Revenu',
    color: 'hsl(var(--chart-2))',
  },
};

const initialFormData = {
  clientId: '',
  driverId: '',
  pickup: '',
  dropoff: '',
  serviceTierId: '',
  amount: '',
  driverPayout: '',
  status: 'Nouvelle demande' as ReservationStatus,
  paymentMethod: 'Carte' as PaymentMethod,
};


export default function DashboardPage() {
  const [recentReservations, setRecentReservations] = React.useState<Reservation[]>([]);
  const [clients, setClients] = React.useState<User[]>([]);
  const [drivers, setDrivers] = React.useState<User[]>([]);
  const [serviceTiers, setServiceTiers] = React.useState<ServiceTier[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingReservation, setEditingReservation] = React.useState<Reservation | null>(null);
  const [editFormData, setEditFormData] = React.useState(initialFormData);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
        setLoading(true);
        const reservationsRef = collection(db, "reservations");
        const q = query(reservationsRef, orderBy("date", "desc"), limit(5));

        const clientsQuery = query(collection(db, "users"), where("role", "==", "client"));
        const driversQuery = query(collection(db, "users"), where("role", "==", "driver"));
        
        const [reservationsSnap, clientsSnap, tiersSnap, driversSnap] = await Promise.all([
          getDocs(q),
          getDocs(clientsQuery),
          getDocs(collection(db, "serviceTiers")),
          getDocs(driversQuery),
        ]);
        
        setRecentReservations(reservationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reservation[]);
        setClients(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[]);
        setServiceTiers(tiersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ServiceTier[]);
        setDrivers(driversSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[]);

      } catch (error) {
        console.error("Error fetching recent reservations: ", error);
        toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger les données." });
      } finally {
        setLoading(false);
      }
  };
  
  React.useEffect(() => {
    fetchData();
  }, []);

  React.useEffect(() => {
    if (editingReservation) {
      setEditFormData({
        clientId: editingReservation.clientId,
        driverId: editingReservation.driverId,
        pickup: editingReservation.pickup,
        dropoff: editingReservation.dropoff,
        serviceTierId: editingReservation.serviceTierId,
        amount: String(editingReservation.amount),
        driverPayout: String(editingReservation.driverPayout),
        status: editingReservation.status,
        paymentMethod: editingReservation.paymentMethod,
      });
    }
  }, [editingReservation]);
  
  const handleFormChange = (setter: React.Dispatch<React.SetStateAction<typeof initialFormData>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSelectChange = (setter: React.Dispatch<React.SetStateAction<typeof initialFormData>>) => (id: string, value: string) => {
    setter(prev => ({ ...prev, [id]: value }));
  }

  const handleSaveChanges = async () => {
    if (!editingReservation) return;

    const selectedClient = clients.find(c => c.id === editFormData.clientId);
    const selectedDriver = drivers.find(d => d.id === editFormData.driverId);
    if (!selectedClient || !selectedDriver) {
        toast({ variant: 'destructive', title: "Erreur", description: "Client ou chauffeur invalide." });
        return;
    }
    
    try {
        const updatedData = {
          ...editingReservation,
          ...editFormData,
          clientName: selectedClient.name,
          driverName: selectedDriver.name,
          amount: parseFloat(editFormData.amount) || 0,
          driverPayout: parseFloat(editFormData.driverPayout) || 0,
        };
        
        const resRef = doc(db, "reservations", editingReservation.id);
        await updateDoc(resRef, updatedData);

        setRecentReservations(prev => prev.map(res => res.id === editingReservation.id ? updatedData : res));
        setEditingReservation(null);
        toast({ title: "Succès", description: "Réservation mise à jour." });
    } catch(error) {
        console.error("Error updating reservation: ", error);
        toast({ variant: 'destructive', title: "Erreur", description: "Impossible de mettre à jour la réservation." });
    }
  };

  const reservationForm = (formData: typeof initialFormData, formChangeHandler: any, selectChangeHandler: any) => (
    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="clientId">Client</Label>
          <Select value={formData.clientId} onValueChange={(value) => selectChangeHandler('clientId', value)}>
            <SelectTrigger id="clientId"><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
            <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="driverId">Chauffeur</Label>
          <Select value={formData.driverId} onValueChange={(value) => selectChangeHandler('driverId', value)}>
            <SelectTrigger id="driverId"><SelectValue placeholder="Sélectionner un chauffeur" /></SelectTrigger>
            <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pickup">Adresse de départ</Label>
        <Input id="pickup" value={formData.pickup} onChange={formChangeHandler} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dropoff">Adresse d'arrivée</Label>
        <Input id="dropoff" value={formData.dropoff} onChange={formChangeHandler} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="serviceTierId">Gamme</Label>
        <Select value={formData.serviceTierId} onValueChange={(value) => selectChangeHandler('serviceTierId', value)}>
          <SelectTrigger id="serviceTierId"><SelectValue placeholder="Sélectionner une gamme" /></SelectTrigger>
          <SelectContent>{serviceTiers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Statut</Label>
          <Select value={formData.status} onValueChange={(value) => selectChangeHandler('status', value)}>
            <SelectTrigger id="status"><SelectValue placeholder="Sélectionner un statut" /></SelectTrigger>
            <SelectContent>{reservationStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Moyen de paiement</Label>
          <Select value={formData.paymentMethod} onValueChange={(value) => selectChangeHandler('paymentMethod', value)}>
            <SelectTrigger id="paymentMethod"><SelectValue placeholder="Sélectionner un moyen de paiement" /></SelectTrigger>
            <SelectContent>{paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Prix Total (€)</Label>
          <Input id="amount" type="number" value={formData.amount} onChange={formChangeHandler} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="driverPayout">Prix Chauffeur (€)</Label>
          <Input id="driverPayout" type="number" value={formData.driverPayout} onChange={formChangeHandler} />
        </div>
      </div>
    </div>
  );

  return (
    <>
    <div className="flex flex-col gap-6">
      <PageHeader title="Tableau de bord">
        <Button>Nouvelle Réservation</Button>
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenu Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45,231.89€</div>
            <p className="text-xs text-muted-foreground">
              +20.1% depuis le mois dernier
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réservations</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2350</div>
            <p className="text-xs text-muted-foreground">
              +180.1% depuis le mois dernier
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-xs text-muted-foreground">
              +19% depuis le mois dernier
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chauffeurs Actifs</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">
              +20 depuis la dernière heure
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Réservations récentes</CardTitle>
          <CardDescription>
            Une liste des réservations les plus récentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : (
                recentReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>
                      <div className="font-medium">{reservation.clientName}</div>
                    </TableCell>
                    <TableCell>{reservation.driverName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          reservation.status === 'Terminée'
                            ? 'default'
                            : reservation.status.startsWith('Annulée') || reservation.status === 'No-show'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="capitalize"
                      >
                        {reservation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{reservation.date}</TableCell>
                    <TableCell>{reservation.paymentMethod}</TableCell>
                    <TableCell className="text-right">
                      {(reservation.totalAmount || reservation.amount || 0).toFixed(2)}€
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem asChild>
                            <Link href={`/reservations/${reservation.id}`}>Voir les détails</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setEditingReservation(reservation)}>Modifier</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aperçu des revenus</CardTitle>
            <CardDescription>Évolution des revenus mensuels.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Line
                  dataKey="revenue"
                  type="monotone"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Réservations de l'année</CardTitle>
            <CardDescription>Un résumé des réservations par mois.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis />
                <Tooltip content={<ChartTooltipContent hideLabel />} />
                <Bar
                  dataKey="reservations"
                  fill="hsl(var(--chart-1))"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>

    <Dialog open={!!editingReservation} onOpenChange={(isOpen) => !isOpen && setEditingReservation(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier la réservation</DialogTitle>
            <DialogDescription>Mettez à jour les détails de la réservation ci-dessous.</DialogDescription>
          </DialogHeader>
          {reservationForm(editFormData, handleFormChange(setEditFormData), handleSelectChange(setEditFormData))}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReservation(null)}>Annuler</Button>
            <Button onClick={handleSaveChanges}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
