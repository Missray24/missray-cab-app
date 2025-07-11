

'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter, notFound } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { CheckCircle2, MapPin, User as UserIcon, Briefcase, XCircle, ShieldCheck, Baby, Armchair, Dog } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import Image from 'next/image';

import { LandingHeader } from '@/components/landing-header';
import { LandingFooter } from '@/components/landing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { db, auth } from '@/lib/firebase';
import type { Reservation, ServiceTier, ReservationOption } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const optionIcons: Record<ReservationOption, React.ElementType> = {
    'Siège bébé': Baby,
    'Rehausseur': Armchair,
    'Animal de compagnie': Dog,
};

function ConfirmationComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reservationId = useMemo(() => searchParams.get('id'), [searchParams]);

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [tier, setTier] = useState<ServiceTier | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
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

  const getStatusDetails = () => {
    if (!reservation) return null;

    const status = reservation.status;
    if (status.startsWith('Annulée') || status === 'No-show') {
      return {
        Icon: XCircle,
        title: 'Réservation Annulée',
        description: 'Cette réservation a été annulée et n\'est plus active.',
        color: 'text-primary',
      };
    }
    if (status === 'Terminée') {
        return {
            Icon: ShieldCheck,
            title: 'Course Terminée',
            description: 'Cette course a été effectuée avec succès.',
            color: 'text-blue-500',
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
                        className={cn("capitalize", reservation.status === 'Nouvelle demande' && 'bg-gradient-to-r from-[#223aff] to-[#1697ff] text-primary-foreground')}
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
                                const Icon = optionIcons[option];
                                return (
                                    <Badge key={option} variant="outline" className="text-base py-1">
                                        <Icon className="h-4 w-4 mr-2" />
                                        {option}
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
