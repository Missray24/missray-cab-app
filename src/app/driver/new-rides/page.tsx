
'use client';

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { Reservation, User } from "@/lib/types";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function NewRidesPage() {
  const [driver, setDriver] = useState<User | null>(null);
  const [availableRides, setAvailableRides] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDriverAndRides = async (currentUser: FirebaseUser) => {
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const driverQuery = query(usersRef, where("uid", "==", currentUser.uid));
      const driverSnapshot = await getDocs(driverQuery);

      if (driverSnapshot.empty) {
        toast({ variant: 'destructive', title: "Erreur", description: "Profil chauffeur non trouvé." });
        setLoading(false);
        return;
      }
      const driverData = { id: driverSnapshot.docs[0].id, ...driverSnapshot.docs[0].data() } as User;
      setDriver(driverData);

      const availableQuery = query(collection(db, "reservations"), where("status", "==", "Nouvelle demande"));
      const availableSnapshot = await getDocs(availableQuery);
      setAvailableRides(availableSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation)));
    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger les données." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        fetchDriverAndRides(currentUser);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAcceptRide = async (reservationId: string) => {
    if (!driver) return;
    
    const rideToUpdate = availableRides.find(r => r.id === reservationId);
    if (!rideToUpdate) return;
    
    try {
        const resRef = doc(db, "reservations", reservationId);
        const newStatus = 'Acceptée';
        const statusHistoryEntry = { status: newStatus, timestamp: new Date().toLocaleString('fr-FR') };

        await updateDoc(resRef, { 
            driverId: driver.id,
            driverName: driver.name,
            status: newStatus,
            statusHistory: [...rideToUpdate.statusHistory, statusHistoryEntry]
        });

        toast({ title: "Course acceptée!", description: "La course a été ajoutée à votre planning." });

        if (auth.currentUser) {
            fetchDriverAndRides(auth.currentUser);
        }

    } catch (error) {
        console.error("Error accepting ride:", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible d'accepter la course." });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nouvelles Courses Disponibles" />
      <Card>
        <CardHeader>
          <CardTitle>Liste des demandes en attente</CardTitle>
          <CardDescription>Consultez les dernières demandes et acceptez celles qui vous intéressent.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Vos Gains Estimés</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-9 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : availableRides.length > 0 ? (
                availableRides.map((ride) => (
                  <TableRow key={ride.id}>
                    <TableCell>
                      <div className="font-medium">{ride.pickup}</div>
                      <div className="text-sm text-muted-foreground">vers {ride.dropoff}</div>
                      <div className="text-xs text-muted-foreground mt-1">{format(new Date(ride.date), "d MMM yyyy 'à' HH:mm", { locale: fr })}</div>
                    </TableCell>
                    <TableCell>{ride.clientName}</TableCell>
                    <TableCell className="text-right font-semibold">{(ride.amount * 0.8).toFixed(2)}€</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => handleAcceptRide(ride.id)}>Accepter</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Aucune nouvelle course pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
