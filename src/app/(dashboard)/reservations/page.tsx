
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from "lucide-react";
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { reservationStatuses, paymentMethods, type Reservation, type ReservationStatus, type PaymentMethod, type Client, type ServiceTier, type Driver } from '@/lib/types';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

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

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [serviceTiers, setServiceTiers] = useState<ServiceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addFormData, setAddFormData] = useState(initialFormData);

  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [editFormData, setEditFormData] = useState(initialFormData);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [reservationsSnap, clientsSnap, tiersSnap, driversSnap] = await Promise.all([
          getDocs(collection(db, "reservations")),
          getDocs(collection(db, "clients")),
          getDocs(collection(db, "serviceTiers")),
          getDocs(collection(db, "drivers")),
        ]);
        
        setReservations(reservationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reservation[]);
        setClients(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[]);
        setServiceTiers(tiersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ServiceTier[]);
        setDrivers(driversSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Driver[]);

      } catch (error) {
        console.error("Error fetching data: ", error);
        toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger les données." });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  useEffect(() => {
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

  const handleAddReservation = async () => {
    const selectedClient = clients.find(c => c.id === addFormData.clientId);
    const selectedDriver = drivers.find(d => d.id === addFormData.driverId);
    if (!selectedClient || !selectedDriver) {
      toast({ variant: 'destructive', title: "Erreur", description: "Client ou chauffeur invalide." });
      return;
    }
    
    try {
      const newReservationData = {
        ...addFormData,
        clientName: selectedClient.name,
        driverName: `${selectedDriver.firstName} ${selectedDriver.lastName}`,
        amount: parseFloat(addFormData.amount) || 0,
        driverPayout: parseFloat(addFormData.driverPayout) || 0,
        date: new Date().toLocaleDateString('fr-CA'),
        statusHistory: [{ status: addFormData.status, timestamp: new Date().toLocaleString('fr-FR') }],
      };
      const docRef = await addDoc(collection(db, "reservations"), newReservationData);
      setReservations(prev => [...prev, { id: docRef.id, ...newReservationData }]);
      setIsAddDialogOpen(false);
      setAddFormData(initialFormData);
      toast({ title: "Succès", description: "Réservation ajoutée." });
    } catch(error) {
      console.error("Error adding reservation: ", error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible d'ajouter la réservation." });
    }
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
          driverName: `${selectedDriver.firstName} ${selectedDriver.lastName}`,
          amount: parseFloat(editFormData.amount) || 0,
          driverPayout: parseFloat(editFormData.driverPayout) || 0,
        };
        
        const resRef = doc(db, "reservations", editingReservation.id);
        await updateDoc(resRef, updatedData);

        setReservations(prev => prev.map(res => res.id === editingReservation.id ? updatedData : res));
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
            <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.firstName} {d.lastName}</SelectItem>)}</SelectContent>
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
        <PageHeader title="Réservations">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild><Button>Add Reservation</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Ajouter une réservation</DialogTitle>
                <DialogDescription>Remplissez les détails ci-dessous.</DialogDescription>
              </DialogHeader>
              {reservationForm(addFormData, handleFormChange(setAddFormData), handleSelectChange(setAddFormData))}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleAddReservation}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>All Reservations</CardTitle>
            <CardDescription>Manage all customer reservations.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium">{reservation.id.substring(0, 8)}...</TableCell>
                      <TableCell>{reservation.clientName}</TableCell>
                      <TableCell>{reservation.driverName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            reservation.status === 'Terminée' ? 'default'
                            : reservation.status.startsWith('Annulée') || reservation.status === 'No-show' ? 'destructive'
                            : 'secondary'
                          }
                          className="capitalize"
                        >{reservation.status}</Badge>
                      </TableCell>
                      <TableCell>{reservation.date}</TableCell>
                      <TableCell>{reservation.paymentMethod}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/reservations/${reservation.id}`}>Voir les détails</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setEditingReservation(reservation)}>
                              Modifier
                            </DropdownMenuItem>
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
