
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";

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
import { reservationStatuses, paymentMethods, type Reservation, type ReservationStatus, type PaymentMethod, type Client, type ServiceTier } from '@/lib/types';
import { db } from '@/lib/firebase';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceTiers, setServiceTiers] = useState<ServiceTier[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [editFormData, setEditFormData] = useState({
    clientId: '',
    pickup: '',
    dropoff: '',
    serviceTierId: '',
    amount: '',
    driverPayout: '',
    status: '' as ReservationStatus,
    paymentMethod: '' as PaymentMethod,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reservationsSnap, clientsSnap, tiersSnap] = await Promise.all([
          getDocs(collection(db, "reservations")),
          getDocs(collection(db, "clients")),
          getDocs(collection(db, "serviceTiers")),
        ]);
        
        const reservationsData = reservationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reservation[];
        const clientsData = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[];
        const tiersData = tiersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ServiceTier[];

        setReservations(reservationsData);
        setClients(clientsData);
        setServiceTiers(tiersData);

      } catch (error) {
        console.error("Error fetching data: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (editingReservation) {
      setEditFormData({
        clientId: editingReservation.clientId,
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

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    setEditFormData(prev => ({ ...prev, [id]: value }));
  }

  const handleSaveChanges = () => {
    if (!editingReservation) return;

    setReservations(prevReservations =>
      prevReservations.map(res => {
        if (res.id === editingReservation.id) {
          const selectedClient = clients.find(c => c.id === editFormData.clientId);
          return {
            ...res,
            clientId: editFormData.clientId,
            clientName: selectedClient ? selectedClient.name : res.clientName,
            pickup: editFormData.pickup,
            dropoff: editFormData.dropoff,
            serviceTierId: editFormData.serviceTierId,
            amount: parseFloat(editFormData.amount) || 0,
            driverPayout: parseFloat(editFormData.driverPayout) || 0,
            status: editFormData.status as ReservationStatus,
            paymentMethod: editFormData.paymentMethod as PaymentMethod,
          };
        }
        return res;
      })
    );
    setEditingReservation(null);
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader title="Réservations">
          <Button>Add Reservation</Button>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>All Reservations</CardTitle>
            <CardDescription>
              Manage all customer reservations.
            </CardDescription>
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
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
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
                      <TableCell className="font-medium">{reservation.id}</TableCell>
                      <TableCell>{reservation.clientName}</TableCell>
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
            <DialogTitle>Modifier la réservation {editingReservation?.id}</DialogTitle>
            <DialogDescription>
              Mettez à jour les détails de la réservation ci-dessous.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client</Label>
              <Select value={editFormData.clientId} onValueChange={(value) => handleSelectChange('clientId', value)}>
                <SelectTrigger id="clientId">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup">Adresse de départ</Label>
              <Input id="pickup" value={editFormData.pickup} onChange={handleEditFormChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dropoff">Adresse d'arrivée</Label>
              <Input id="dropoff" value={editFormData.dropoff} onChange={handleEditFormChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceTierId">Gamme</Label>
              <Select value={editFormData.serviceTierId} onValueChange={(value) => handleSelectChange('serviceTierId', value)}>
                <SelectTrigger id="serviceTierId">
                  <SelectValue placeholder="Sélectionner une gamme" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTiers.map(tier => (
                    <SelectItem key={tier.id} value={tier.id}>{tier.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select value={editFormData.status} onValueChange={(value) => handleSelectChange('status', value as ReservationStatus)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  {reservationStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Moyen de paiement</Label>
              <Select value={editFormData.paymentMethod} onValueChange={(value) => handleSelectChange('paymentMethod', value as PaymentMethod)}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Sélectionner un moyen de paiement" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Prix Total (€)</Label>
                <Input id="amount" type="number" value={editFormData.amount} onChange={handleEditFormChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driverPayout">Prix Chauffeur (€)</Label>
                <Input id="driverPayout" type="number" value={editFormData.driverPayout} onChange={handleEditFormChange} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReservation(null)}>Annuler</Button>
            <Button onClick={handleSaveChanges}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
