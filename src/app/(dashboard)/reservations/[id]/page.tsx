
'use client';

import { useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import { CheckCircle2, Car, MapPin, User, Star, Clock, Baby, Armchair, Dog } from 'lucide-react';
import { doc, getDoc } from "firebase/firestore";

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { Reservation, ReservationStatus, ServiceTier, ReservationOption } from '@/lib/types';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { RouteMap } from '@/components/route-map';

const getStatusIndex = (status: ReservationStatus) => {
  const normalFlow: ReservationStatus[] = [
    'Nouvelle demande',
    'Acceptée',
    'Chauffeur en route',
    'Chauffeur sur place',
    'Voyageur à bord',
    'Terminée',
  ];
  const index = normalFlow.indexOf(status);
  return index === -1 ? 99 : index;
};

const timelineSteps = [
  { status: 'Nouvelle demande', icon: Clock },
  { status: 'Acceptée', icon: CheckCircle2 },
  { status: 'Chauffeur en route', icon: Car },
  { status: 'Chauffeur sur place', icon: MapPin },
  { status: 'Voyageur à bord', icon: User },
  { status: 'Terminée', icon: Star },
];

const optionIcons: Record<ReservationOption, React.ElementType> = {
    'Siège bébé': Baby,
    'Rehausseur': Armchair,
    'Animal de compagnie': Dog,
};

export default function ReservationDetailsPage() {
  const params = useParams<{ id: string }>();
  const [reservation, setReservation] = useState<Reservation | null | undefined>(undefined);
  const [tier, setTier] = useState<ServiceTier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    const fetchReservation = async () => {
      try {
        const resDocRef = doc(db, "reservations", params.id);
        const resDocSnap = await getDoc(resDocRef);

        if (resDocSnap.exists()) {
          const resData = { id: resDocSnap.id, ...resDocSnap.data() } as Reservation;
          setReservation(resData);
          
          if(resData.serviceTierId) {
            const tierDocRef = doc(db, "serviceTiers", resData.serviceTierId);
            const tierDocSnap = await getDoc(tierDocRef);
            if (tierDocSnap.exists()) {
              setTier({ id: tierDocSnap.id, ...tierDocSnap.data() } as ServiceTier);
            }
          }
        } else {
          setReservation(null); // Not found
        }
      } catch (error) {
        console.error("Error fetching reservation details: ", error);
        setReservation(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Réservation..."><Skeleton className="h-6 w-24 rounded-full" /></PageHeader>
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
                <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
            </div>
            <div className="lg:col-span-1">
                <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent className="h-[400px] p-0"><Skeleton className="h-full w-full" /></CardContent></Card>
            </div>
        </div>
      </div>
    );
  }

  if (!reservation) {
    notFound();
  }
  
  const currentStatusIdx = getStatusIndex(reservation.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Réservation ${reservation.id.substring(0, 8).toUpperCase()}`}>
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
      </PageHeader>
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 grid auto-rows-min gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Timeline de la course</CardTitle>
              <CardDescription>Suivi de la progression de la réservation.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                {timelineSteps.map((step, index) => {
                  const isCompleted = currentStatusIdx >= index;
                  const isCurrent = currentStatusIdx === index;
                  const isLastStep = index === timelineSteps.length - 1;
                  const historyEntry = reservation.statusHistory.find(h => h.status === step.status);

                  return (
                    <div key={step.status} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full",
                            isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                          <step.icon className="h-4 w-4" />
                        </div>
                        {!isLastStep && (
                          <div className="w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className={cn("pb-8 pt-1", isLastStep && "pb-0")}>
                        <p className={cn("font-medium", isCurrent ? "text-primary" : "text-foreground")}>
                          {step.status}
                        </p>
                        {historyEntry && (
                          <p className="text-xs text-muted-foreground">
                            {historyEntry.timestamp}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Détails de la réservation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
               <div className="grid md:grid-cols-2 gap-4">
                 <div>
                   <p className="font-medium text-muted-foreground">Client</p>
                   <p className="font-medium">{reservation.clientName}</p>
                 </div>
                 <div>
                   <p className="font-medium text-muted-foreground">Chauffeur</p>
                   <p className="font-medium">{reservation.driverName}</p>
                 </div>
               </div>
               <Separator />
               <div className="grid md:grid-cols-2 gap-4">
                 <div>
                   <p className="font-medium text-muted-foreground">Départ</p>
                   <p className="font-medium">{reservation.pickup}</p>
                 </div>
                 <div>
                   <p className="font-medium text-muted-foreground">Arrivée</p>
                   <p className="font-medium">{reservation.dropoff}</p>
                 </div>
               </div>
               <Separator />
               <div className="grid md:grid-cols-2 gap-4">
                 <div>
                   <p className="font-medium text-muted-foreground">Date</p>
                   <p className="font-medium">{reservation.date}</p>
                 </div>
                 <div>
                   <p className="font-medium text-muted-foreground">Gamme</p>
                   <p className="font-medium">{tier?.name || 'N/A'}</p>
                 </div>
               </div>
               <Separator />
               <div className="grid md:grid-cols-2 gap-4">
                 <div>
                   <p className="font-medium text-muted-foreground">Montant Total</p>
                   <p className="font-medium">{reservation.amount.toFixed(2)}€ ({reservation.paymentMethod})</p>
                 </div>
                 <div>
                   <p className="font-medium text-muted-foreground">Paiement Chauffeur</p>
                   <p className="font-medium">{reservation.driverPayout.toFixed(2)}€</p>
                 </div>
               </div>
                {reservation.options && reservation.options.length > 0 && (
                    <>
                    <Separator />
                    <div>
                        <p className="font-medium text-muted-foreground mb-2">Options</p>
                        <div className="flex flex-wrap gap-2">
                           {reservation.options.map(option => {
                                const Icon = optionIcons[option.name as ReservationOption];
                                return (
                                    <Badge key={option.name} variant="secondary" className="text-base py-1">
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
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Itinéraire</CardTitle>
              <CardDescription>Aperçu de l'itinéraire de la course.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] md:h-full md:min-h-[300px] p-0 rounded-b-lg overflow-hidden">
               <RouteMap 
                  pickup={reservation.pickup}
                  dropoff={reservation.dropoff}
                  stops={reservation.stops}
               />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
