
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { LandingHeader } from '@/components/landing-header';
import { LandingFooter } from '@/components/landing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { db, auth } from '@/lib/firebase';
import type { Reservation, ReservationStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { RouteMap } from '@/components/route-map';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function MyBookingsComponent() {
  const router = useRouter();
  const { toast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const fetchReservations = async (currentUser: User) => {
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("uid", "==", currentUser.uid));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const clientDocId = userSnapshot.docs[0].id;
        
        const reservationsRef = collection(db, "reservations");
        const q = query(
          reservationsRef, 
          where("clientId", "==", clientDocId)
        );
        const querySnapshot = await getDocs(q);
        
        let userReservations = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Reservation[];
        
        userReservations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setReservations(userReservations);
      }
    } catch (error) {
      console.error("Error fetching reservations: ", error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger vos réservations." });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        fetchReservations(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router, toast]);

  const handleCancelReservation = async (reservationId: string) => {
    try {
      const resRef = doc(db, "reservations", reservationId);
      const newStatus: ReservationStatus = 'Annulée par le client (sans frais)';
      const statusHistoryEntry = { status: newStatus, timestamp: new Date().toLocaleString('fr-FR') };
      
      await updateDoc(resRef, {
        status: newStatus,
        statusHistory: [...reservations.find(r => r.id === reservationId)!.statusHistory, statusHistoryEntry]
      });
      
      setReservations(prev => prev.map(res => 
        res.id === reservationId ? { ...res, status: newStatus } : res
      ));

      toast({ title: 'Réservation annulée', description: 'Votre course a bien été annulée.' });
    } catch (error) {
      console.error('Error canceling reservation:', error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'annuler la réservation.' });
    }
  };

  const isCancellable = (status: ReservationStatus) => {
    return !['Terminée', 'Annulée par le chauffeur (sans frais)', 'Annulée par le client (sans frais)', 'Annulée par le chauffeur (avec frais)', 'Annulée par le client (avec frais)', 'No-show'].includes(status);
  };

  if (loading || !user) {
    return (
        <div className="flex flex-col min-h-dvh bg-muted/40">
            <LandingHeader />
            <main className="flex-1 container py-12">
              <PageHeader title="Mes Courses" />
              <div className="mt-8 grid gap-4 md:grid-cols-1">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            </main>
            <LandingFooter />
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-muted/40">
      <LandingHeader />
      <main className="flex-1 container py-12">
        <PageHeader title="Mes Courses" />
        {reservations.length > 0 ? (
           <div className="mt-8 grid gap-4 md:grid-cols-1">
            {reservations.map((res) => (
              <Card key={res.id}>
                <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-6">
                   <div className="w-full md:w-48 lg:w-64 flex-shrink-0">
                      <div className="aspect-video rounded-md overflow-hidden border">
                          <RouteMap 
                            pickup={res.pickup}
                            dropoff={res.dropoff}
                            stops={res.stops}
                            isInteractive={false}
                          />
                      </div>
                    </div>
                  <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm w-full">
                    <div className="flex flex-col">
                        <p className="font-semibold text-base">{format(new Date(res.date), "d MMMM yyyy", { locale: fr })}</p>
                        <p className="text-xs text-muted-foreground">ID: {res.id.substring(0,8)}...</p>
                    </div>
                    <div className="flex flex-col sm:items-center text-left sm:text-center">
                       <p className="font-semibold truncate w-full">{res.pickup}</p>
                       <p className="font-semibold text-muted-foreground truncate w-full">vers {res.dropoff}</p>
                    </div>
                    <div className="flex flex-col sm:items-end text-left sm:text-right">
                       <p className="font-bold text-lg">{res.amount.toFixed(2)}€</p>
                       <p className="text-xs text-muted-foreground">{res.paymentMethod}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto flex-shrink-0">
                    <Badge
                      variant={
                        res.status === 'Terminée' ? 'default'
                        : res.status.startsWith('Annulée') || res.status === 'No-show' ? 'destructive'
                        : 'secondary'
                      }
                      className="capitalize whitespace-nowrap"
                    >
                      {res.status}
                    </Badge>
                     <Button asChild variant="default" size="sm">
                       <Link href={`/book/confirmation?id=${res.id}`}>
                         Détails <ArrowRight className="ml-2 h-4 w-4"/>
                       </Link>
                     </Button>
                     {isCancellable(res.status) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm">Annuler</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr d'annuler ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action ne peut pas être annulée. Votre réservation sera définitivement annulée.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Retour</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancelReservation(res.id)}>Confirmer l'annulation</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                     )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mt-8 text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">Aucune course pour le moment</h3>
            <p className="text-muted-foreground mt-2">Lorsque vous réserverez une course, elle apparaîtra ici.</p>
            <Button asChild className="mt-4">
              <Link href="/">Réserver ma première course</Link>
            </Button>
          </div>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}

export default function MyBookingsPage() {
    return (
        <Suspense fallback={<div>Chargement de vos courses...</div>}>
            <MyBookingsComponent />
        </Suspense>
    );
}
