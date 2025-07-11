
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { reservationStatuses, type Reservation, type ReservationStatus, type User } from '@/lib/types';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DriverReservationsPage() {
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setLoading(true);
        try {
          const usersRef = collection(db, "users");
          const userQuery = query(usersRef, where("uid", "==", currentUser.uid));
          const userSnapshot = await getDocs(userQuery);

          if (!userSnapshot.empty) {
            const driverId = userSnapshot.docs[0].id;
            const reservationsRef = collection(db, "reservations");
            const q = query(reservationsRef, where("driverId", "==", driverId));
            const querySnapshot = await getDocs(q);
            
            const reservationsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Reservation[];
            reservationsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setAllReservations(reservationsData);
          }
        } catch (error) {
          console.error("Error fetching reservations: ", error);
          toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger les courses." });
        } finally {
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, [toast]);

  const handleStatusChange = async (reservationId: string, newStatus: ReservationStatus) => {
    const reservation = allReservations.find(r => r.id === reservationId);
    if (!reservation) return;

    try {
      const resRef = doc(db, "reservations", reservationId);
      const statusHistoryEntry = { status: newStatus, timestamp: new Date().toLocaleString('fr-FR') };
      
      await updateDoc(resRef, { 
        status: newStatus,
        statusHistory: [...reservation.statusHistory, statusHistoryEntry]
      });

      setAllReservations(prev => prev.map(res => 
        res.id === reservationId ? { ...res, status: newStatus, statusHistory: [...res.statusHistory, statusHistoryEntry] } : res
      ));

      toast({ title: "Statut mis à jour", description: `La course est maintenant: ${newStatus}` });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour le statut." });
    }
  };

  const activeRides = allReservations.filter(r => !['Terminée', 'Annulée par le chauffeur (sans frais)', 'Annulée par le client (sans frais)', 'Annulée par le chauffeur (avec frais)', 'Annulée par le client (avec frais)', 'No-show'].includes(r.status));
  const pastRides = allReservations.filter(r => ['Terminée', 'Annulée par le chauffeur (sans frais)', 'Annulée par le client (sans frais)', 'Annulée par le chauffeur (avec frais)', 'Annulée par le client (avec frais)', 'No-show'].includes(r.status));

  const renderTable = (rides: Reservation[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Course</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="text-right">Gains</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
              <TableCell><Skeleton className="h-6 w-[120px] rounded-md" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
            </TableRow>
          ))
        ) : rides.length === 0 ? (
            <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                    Aucune course dans cette catégorie.
                </TableCell>
            </TableRow>
        ) : (
          rides.map((reservation) => (
            <TableRow key={reservation.id}>
              <TableCell>{reservation.clientName}</TableCell>
              <TableCell>
                <div className="font-medium truncate max-w-xs">{reservation.pickup}</div>
                <div className="text-sm text-muted-foreground truncate max-w-xs">vers {reservation.dropoff}</div>
              </TableCell>
              <TableCell>{format(new Date(reservation.date), "d MMM yyyy, HH:mm", { locale: fr })}</TableCell>
              <TableCell>
                 <Select value={reservation.status} onValueChange={(value: ReservationStatus) => handleStatusChange(reservation.id, value)}>
                    <SelectTrigger className={cn("w-[180px] text-xs h-8",
                        reservation.status === 'Terminée' ? 'border-green-500' :
                        reservation.status.startsWith('Annulée') || reservation.status === 'No-show' ? 'border-red-500' :
                        'border-blue-500'
                    )}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {reservationStatuses.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                    </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right font-medium">{reservation.driverPayout.toFixed(2)}€</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mes Courses" />
      <Card>
        <Tabs defaultValue="active">
            <CardHeader>
                <CardTitle>Historique des courses</CardTitle>
                <CardDescription>Consultez vos courses actives et passées.</CardDescription>
                <TabsList className="grid w-full grid-cols-2 max-w-sm mt-4">
                    <TabsTrigger value="active">Courses Actives ({activeRides.length})</TabsTrigger>
                    <TabsTrigger value="past">Historique ({pastRides.length})</TabsTrigger>
                </TabsList>
            </CardHeader>
            <CardContent>
                <TabsContent value="active">
                    {renderTable(activeRides)}
                </TabsContent>
                <TabsContent value="past">
                    {renderTable(pastRides)}
                </TabsContent>
            </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
