
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { ArrowRight, PlusCircle, X, AppWindow } from 'lucide-react';
import { useLoadScript } from '@react-google-maps/api';

import { LandingHeader } from '@/components/landing-header';
import { LandingFooter } from '@/components/landing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { BookingForm, type BookingDetails } from '@/components/booking-form';
import { sendEmail } from '@/ai/flows/send-email-flow';
import { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY } from '@/lib/config';

const libraries = ['places'] as any;

function MyBookingsComponent() {
  const router = useRouter();
  const { toast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [clientDetails, setClientDetails] = useState<{ id: string; name: string; email: string; } | null>(null);
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });


  const fetchReservations = async (currentUser: User) => {
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("uid", "==", currentUser.uid));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const clientDoc = userSnapshot.docs[0];
        setClientDetails({ id: clientDoc.id, ...clientDoc.data() } as { id: string; name: string; email: string; });
        
        const reservationsRef = collection(db, "reservations");
        const q = query(
          reservationsRef, 
          where("clientId", "==", clientDoc.id)
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
    const currentReservation = reservations.find(r => r.id === reservationId);
    if (!currentReservation || !clientDetails) return;

    try {
      const resRef = doc(db, "reservations", reservationId);
      const newStatus: ReservationStatus = 'Annulée par le client (sans frais)';
      const statusHistoryEntry = { status: newStatus, timestamp: new Date().toLocaleString('fr-FR') };
      
      await updateDoc(resRef, {
        status: newStatus,
        statusHistory: [...currentReservation.statusHistory, statusHistoryEntry]
      });
      
      setReservations(prev => prev.map(res => 
        res.id === reservationId ? { ...res, status: newStatus, statusHistory: [...res.statusHistory, statusHistoryEntry] } : res
      ));
      
      // Send client notification
      await sendEmail({
        type: 'reservation_cancelled_client',
        to: { name: clientDetails.name, email: clientDetails.email },
        params: {
          clientName: clientDetails.name,
          reservationId: reservationId.substring(0, 8).toUpperCase(),
          status: newStatus,
        },
      });

      // Send admin notification
      await sendEmail({
        type: 'reservation_cancelled_admin',
        to: { name: 'Admin', email: 'admin@example.com' }, // to.email is ignored for this type, but required by schema
        params: {
            clientName: clientDetails.name,
            reservationId: reservationId.substring(0, 8).toUpperCase(),
            status: newStatus,
        }
      });

      toast({ title: 'Réservation annulée', description: 'Votre course a bien été annulée.' });
    } catch (error) {
      console.error('Error canceling reservation:', error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'annuler la réservation.' });
    }
  };

  const handleBookingSubmit = (details: BookingDetails) => {
    const queryParams = new URLSearchParams();
    queryParams.set('pickup', details.pickup);
    queryParams.set('dropoff', details.dropoff);
    details.stops.forEach(stop => stop.address && queryParams.append('stop', stop.address));
    if (details.scheduledTime) {
      queryParams.set('scheduledTime', details.scheduledTime.toISOString());
    }
    if (details.passengers) queryParams.set('passengers', String(details.passengers));
    if (details.suitcases) queryParams.set('suitcases', String(details.suitcases));
    if (details.backpacks) queryParams.set('backpacks', String(details.backpacks));
    router.push(`/book/select-vehicle?${queryParams.toString()}`);
  }

  const isCancellable = (status: ReservationStatus) => {
    return !['Terminée', 'Annulée par le chauffeur (sans frais)', 'Annulée par le client (sans frais)', 'Annulée par le chauffeur (avec frais)', 'Annulée par le client (avec frais)', 'No-show'].includes(status);
  };

  if (loading || !user) {
    return (
        <div className="flex flex-col min-h-dvh bg-muted/40">
            <LandingHeader />
            <main className="flex-1 container py-12">
              <PageHeader title="Mes Courses" action={<Skeleton className="h-10 w-36" />} />
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
        {showBookingForm ? (
           <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Nouvelle course</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowBookingForm(false)}>
                  <X className="h-5 w-5" />
                  <span className="sr-only">Fermer</span>
                </Button>
              </div>
              <CardDescription>Renseignez les informations de votre trajet.</CardDescription>
            </CardHeader>
            <CardContent>
              <BookingForm onSubmit={handleBookingSubmit} />
            </CardContent>
           </Card>
        ) : (
          <>
            <PageHeader 
              title="Mes Courses" 
              action={
                <div className="flex items-center gap-2">
                   <Button onClick={() => setShowBookingForm(true)} variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nouvelle course
                  </Button>
                  <Button asChild>
                    <Link href="/app">
                      <AppWindow className="mr-2 h-4 w-4" />
                      Lancer l'application
                    </Link>
                  </Button>
                </div>
              }
            />
            {reservations.length > 0 ? (
              <div className="mt-8 grid gap-4 md:grid-cols-1">
                {reservations.map((res) => (
                  <Card key={res.id}>
                    <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="w-full md:w-48 lg:w-64 flex-shrink-0">
                          <div className="aspect-video rounded-md overflow-hidden border">
                              <RouteMap 
                                isLoaded={isLoaded}
                                loadError={loadError}
                                apiKey={NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
                                pickup={res.pickup}
                                dropoff={res.dropoff}
                                stops={res.stops || []}
                                isInteractive={false}
                              />
                          </div>
                        </div>
                      <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm w-full">
                        <div className="flex flex-col gap-2">
                           <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  res.status === 'Terminée' ? 'default'
                                  : res.status.startsWith('Annulée') || res.status === 'No-show' ? 'destructive'
                                  : 'secondary'
                                }
                                className={cn("capitalize whitespace-nowrap", res.status === 'Nouvelle demande' && 'bg-gradient-to-r from-[#223aff] to-[#1697ff] text-primary-foreground')}
                              >
                                {res.status}
                              </Badge>
                            </div>
                            <div>
                              <p className="font-semibold text-base">{format(new Date(res.date), "d MMMM yyyy", { locale: fr })}</p>
                              <p className="text-xs text-muted-foreground">ID: {res.id.substring(0,8)}...</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:items-center text-left sm:text-center justify-center">
                          <p className="font-semibold truncate w-full">{res.pickup}</p>
                          <p className="font-semibold text-muted-foreground truncate w-full">vers {res.dropoff}</p>
                        </div>
                        <div className="flex flex-col sm:items-end text-left sm:text-right justify-center">
                          <p className="font-bold text-lg">{res.totalAmount.toFixed(2)}€</p>
                          <p className="text-xs text-muted-foreground">{res.paymentMethod}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto flex-shrink-0">
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
                <Button className="mt-4" onClick={() => setShowBookingForm(true)}>
                  Réserver ma première course
                </Button>
              </div>
            )}
          </>
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
