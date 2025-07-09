import { notFound } from 'next/navigation';
import Image from 'next/image';
import { CheckCircle2, Car, MapPin, User, Star, Clock } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { reservations } from '@/lib/data';
import type { ReservationStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

// Helper to determine the progress of the reservation
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
  // Return a high index for statuses not in the normal flow so they don't mess up the timeline
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

export default function ReservationDetailsPage({ params }: { params: { id: string } }) {
  const reservation = reservations.find(res => res.id === params.id);

  if (!reservation) {
    notFound();
  }
  
  const currentStatusIdx = getStatusIndex(reservation.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Réservation ${reservation.id}`}>
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
                   <p className="font-medium text-muted-foreground">Montant</p>
                   <p className="font-medium">${reservation.amount.toFixed(2)} ({reservation.paymentMethod})</p>
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Position du chauffeur</CardTitle>
              <CardDescription>Vue en direct de la position du véhicule.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] md:h-full md:min-h-[300px] p-0 rounded-b-lg overflow-hidden">
               <Image
                 src="https://placehold.co/600x800.png"
                 alt="Map showing driver location"
                 data-ai-hint="street map"
                 width={600}
                 height={800}
                 className="h-full w-full object-cover"
               />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
