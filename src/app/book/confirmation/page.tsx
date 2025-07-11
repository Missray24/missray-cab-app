
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter, notFound } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { CheckCircle2, MapPin, User as UserIcon, Briefcase, XCircle, ShieldCheck, Baby, Armchair, Dog, Hourglass } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import Image from 'next/image';
import { useLoadScript } from '@react-google-maps/api';

import { LandingHeader } from '@/components/landing-header';
import { LandingFooter } from '@/components/landing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { db, auth } from '@/lib/firebase';
import type { Reservation, ServiceTier, ReservationOption, ReservationStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RouteMap } from '@/components/route-map';
import { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import { sendEmail } from '@/ai/flows/send-email-flow';
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

const optionIcons: Record<ReservationOption, React.ElementType> = {
    'Siège bébé': Baby,
    'Rehausseur': Armchair,
    'Animal': Dog,
};

const libraries = ['places'] as any;

function ConfirmationComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const reservationId = useMemo(() => searchParams.get('id'), [searchParams]);

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [tier, setTier] = useState<ServiceTier | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [clientDetails, setClientDetails] = useState<{ id: string; name: string; email: string; } | null>(null);

  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        // Fetch client details once
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("uid", "==", currentUser.uid));
        const userSnapshot = await getDocs(userQuery);
        if (!userSnapshot.empty) {
          const clientDoc = userSnapshot.docs[0];
          setClientDetails({ id: clientDoc.id, ...clientDoc.data() } as { id: string; name: string; email: string; });
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!reservationId) {
      notFound();
      return;
    }
    
    const fetchReservation = async () => {
      setLoading(true);
      try {
        const resDocRef = doc(db, "reservations", reservationId);
        const resDocSnap = await getDoc(resDocRef);

        if (resDocSnap.exists()) {
          const resData = { id: resDocSnap.id, ...resDocSnap.data() } as Reservation;
          setReservation(resData);
          
          if (resData.serviceTierId) {
            const tierDocRef = doc(db, "serviceTiers", resData.serviceTierId);
            const tierDocSnap = await getDoc(tierDocRef);
            if (tierDocSnap.exists()) {
              setTier({ id: tierDocSnap.id, ...tierDocSnap.data() } as ServiceTier);
            }
          }
        } else {
          notFound();
        }
      } catch (error) {
        console.error("Error fetching reservation details: ", error);
        notFound();
      } finally {
        setLoading(false);
      }
    };
    
    fetchReservation();
  }, [reservationId]);

  const handleCancelReservation = async () => {
    if (!reservation || !clientDetails) return;

    try {
      const resRef = doc(db, "reservations", reservation.id);
      const newStatus: ReservationStatus = 'Annulée par le client (sans frais)';
      const statusHistoryEntry = { status: newStatus, timestamp: new Date().toLocaleString('fr-FR') };
      
      await updateDoc(resRef, {
        status: newStatus,
        statusHistory: [...reservation.statusHistory, statusHistoryEntry]
      });
      
      setReservation(prev => prev ? { ...prev, status: newStatus, statusHistory: [...prev.statusHistory, statusHistoryEntry] } : null);
      
      // Send client notification
      await sendEmail({
        type: 'reservation_cancelled_client',
        to: { name: clientDetails.name, email: clientDetails.email },
        params: {
          clientName: clientDetails.name,
          reservationId: reservation.id.substring(0, 8).toUpperCase(),
          status: newStatus,
        },
      });

      // Send admin notification
      await sendEmail({
        type: 'reservation_cancelled_admin',
        to: { name: 'Admin', email: 'admin@example.com' }, // to.email is ignored for this type, but required by schema
        params: {
            clientName: clientDetails.name,
            reservationId: reservation.id.substring(0, 8).toUpperCase(),
            status: newStatus,
        }
      });

      toast({ title: 'Réservation annulée', description: 'Votre course a bien été annulée.' });
      router.push('/my-bookings');
    } catch (error) {
      console.error('Error canceling reservation:', error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'annuler la réservation.' });
    }
  };

  const getStatusDetails = () => {
    if (!reservation) return null;

    const status = reservation.status;
    
    if (status === 'Recherche de chauffeur') {
      return {
        Icon: Hourglass,
        title: 'Recherche en cours...',
        description: 'Nous recherchons un chauffeur à proximité. Vous serez notifié dès qu\'un chauffeur accepte la course.',
        color: 'text-blue-500 animate-spin',
      };
    }
    if (status.startsWith('Annulée') || status === 'No-show') {
      return {
        Icon: XCircle,
        title: 'Réservation Annulée',
        description: 'Cette réservation a été annulée et n\'est plus active.',
        color: 'text-destructive',
      };
    }
    if (status === 'Terminée') {
        return {
            Icon: ShieldCheck,
            title: 'Course Terminée',
            description: 'Cette course a été effectuée avec succès.',
            color: 'text-primary',
        }
    }
    return {
      Icon: CheckCircle2,
      title: 'Réservation Confirmée !',
      description: 'Votre course est enregistrée. Vous recevrez des notifications sur son statut.',
      color: 'text-green-500',
    };
  };

  if (loading || !reservation || !tier) {
    return (
        <div className="flex flex-col min-h-dvh bg-muted/40">
            <LandingHeader />
            <main className="flex-1 flex items-center justify-center p-4"><div className="container max-w-2xl"><Skeleton className="h-96 w-full" /></div></main>
            <LandingFooter />
        </div>
    );
  }

  const reservationDate = new Date(reservation.date);
  const statusDetails = getStatusDetails();
  
  if (reservation.status === 'Recherche de chauffeur') {
    return (
        <div className="relative h-screen w-screen">
             <RouteMap 
                isLoaded={isLoaded}
                loadError={loadError}
                apiKey={NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
                pickup={reservation.pickup}
                dropoff={reservation.dropoff}
                stops={reservation.stops}
                isInteractive={false}
            />
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                         {statusDetails && <statusDetails.Icon className={cn("h-16 w-16 mb-4 mx-auto", statusDetails.color)} />}
                        <CardTitle className="text-3xl font-headline text-center">{statusDetails?.title}</CardTitle>
                        <CardDescription>
                            {statusDetails?.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="w-full" size="lg">Annuler</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Êtes-vous sûr d'annuler ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action arrêtera la recherche et annulera votre demande de course.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Retour</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelReservation}>Confirmer l'annulation</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
  }


  return (
    <div className="flex flex-col min-h-dvh bg-muted/40">
      <LandingHeader />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="container max-w-2xl">
          <Card>
            <CardHeader className="items-center text-center">
              {statusDetails && <statusDetails.Icon className={cn("h-16 w-16 mb-4", statusDetails.color)} />}
              <CardTitle className="text-3xl font-headline text-center">{statusDetails?.title}</CardTitle>
              <CardDescription>
                {statusDetails?.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="bg-muted p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ID de la réservation</span>
                    <Badge variant="secondary">{reservation.id.substring(0, 8).toUpperCase()}</Badge>
                  </div>
                   <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Statut</span>
                    <Badge
                        variant={
                            reservation.status === 'Terminée' ? 'default'
                            : reservation.status.startsWith('Annulée') || reservation.status === 'No-show' ? 'destructive'
                            : 'secondary'
                        }
                        className={cn("capitalize", 
                            (reservation.status === 'Nouvelle demande' || reservation.status === 'Recherche de chauffeur' || reservation.status === 'Acceptée') && 'bg-gradient-to-r from-[#223aff] to-[#1697ff] text-primary-foreground'
                        )}
                    >
                        {reservation.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Détails de la course</h3>
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground">Prise en charge le:</p>
                        <p>{format(reservationDate, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 mt-0.5 text-green-500" />
                        <p className="font-medium">
                           <span className="font-bold text-foreground">Départ: </span>{reservation.pickup}
                        </p>
                    </div>
                    {reservation.stops && reservation.stops.map((stop, index) => (
                      <div key={index} className="flex items-start gap-3 pl-1">
                          <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
                          <p className="font-medium">
                              <span className="font-bold text-foreground">Arrêt {index + 1}: </span>{stop}
                          </p>
                      </div>
                    ))}
                    <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 mt-0.5 text-primary" />
                        <p className="font-medium">
                           <span className="font-bold text-foreground">Arrivée: </span>{reservation.dropoff}
                        </p>
                    </div>
                </div>

                <Separator />
                
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Véhicule et Paiement</h3>
                     <div className="flex items-center gap-3">
                        <Image src={tier.photoUrl} alt={tier.name} width={64} height={40} className="rounded-md object-contain w-16 h-10" />
                        <p className="font-semibold">{tier.name}</p>
                    </div>
                    {tier.capacity?.passengers && (
                      <div className="flex items-center gap-3">
                         <UserIcon className="h-5 w-5 text-muted-foreground" />
                         <p>{tier.capacity.passengers} passagers</p>
                     </div>
                    )}
                    {tier.capacity?.suitcases && (
                      <div className="flex items-center gap-3">
                          <Briefcase className="h-5 w-5 text-muted-foreground" />
                          <p>{tier.capacity.suitcases} valises</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-foreground">Paiement:</span>
                        <p className="font-bold text-foreground">{reservation.amount.toFixed(2)}€ ({reservation.paymentMethod})</p>
                    </div>
                </div>
                
                {reservation.options && reservation.options.length > 0 && (
                  <>
                    <Separator />
                     <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Options sélectionnées</h3>
                        <div className="flex flex-wrap gap-2">
                           {reservation.options.map(option => {
                                const Icon = optionIcons[option.name];
                                return (
                                    <Badge key={option.name} variant="outline" className="text-base py-1">
                                        {Icon && <Icon className="h-4 w-4 mr-2" />}
                                        {option.name}
                                        {option.quantity > 1 && <span className="ml-2 font-bold">x{option.quantity}</span>}
                                    </Badge>
                                );
                           })}
                        </div>
                    </div>
                  </>
                )}


                <Separator />
                <Button asChild className="w-full" size="lg">
                    <Link href="/my-bookings">Retour à mes réservations</Link>
                </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

export default function ConfirmationPage() {
    return (
        <Suspense fallback={<div>Chargement de la confirmation...</div>}>
            <ConfirmationComponent />
        </Suspense>
    );
}
