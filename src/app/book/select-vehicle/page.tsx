
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { collection, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowRight, Calendar, Clock, MapPin, Users, Briefcase, Info, Milestone, Timer } from 'lucide-react';

import { LandingHeader } from '@/components/landing-header';
import { LandingFooter } from '@/components/landing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import type { ServiceTier } from '@/lib/types';
import { RouteMap } from '@/components/route-map';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface RouteInfo {
    distance: string;
    duration: string;
}

function VehicleSelectionComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [serviceTiers, setServiceTiers] = useState<ServiceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  const pickup = searchParams.get('pickup');
  const dropoff = searchParams.get('dropoff');
  const stops = searchParams.getAll('stop');
  const scheduledTime = searchParams.get('scheduledTime');

  useEffect(() => {
    if (!pickup || !dropoff) {
      // Redirect back to home if essential params are missing
      router.replace('/');
      return;
    }
    
    const fetchTiers = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "serviceTiers"));
        const tiersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as ServiceTier[];
        setServiceTiers(tiersData);
      } catch (error) {
        console.error("Error fetching service tiers: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTiers();
  }, [pickup, dropoff, router]);

  const getSignupLink = (tierId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tierId', tierId);
    return `/signup?${params.toString()}`;
  }

  return (
    <div className="flex flex-col min-h-dvh bg-muted/40">
      <LandingHeader />
      <main className="flex-1 py-12 md:py-24">
        <div className="container">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline mb-2">Choisissez votre véhicule</h1>
            <p className="text-muted-foreground max-w-2xl">
                Sélectionnez la gamme de véhicule qui correspond le mieux à vos besoins pour le trajet que vous avez demandé.
            </p>
          </div>
          
          <div className="flex flex-col gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Résumé de votre course</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-2">
                     <div>
                       <div className="h-80 rounded-lg overflow-hidden border">
                         <RouteMap 
                            pickup={pickup || ''}
                            dropoff={dropoff || ''}
                            stops={stops}
                            onRouteInfoFetched={setRouteInfo}
                         />
                      </div>
                      <div className="pt-4">
                        {routeInfo ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <Milestone className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Distance</p>
                                    <p className="font-semibold">{routeInfo.distance}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Timer className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Durée</p>
                                    <p className="font-semibold">{routeInfo.duration}</p>
                                </div>
                            </div>
                        </div>
                        ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-5 w-5 rounded-full" />
                                <div className="space-y-1">
                                    <Skeleton className="h-3 w-12" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-5 w-5 rounded-full" />
                                <div className="space-y-1">
                                    <Skeleton className="h-3 w-12" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                            </div>
                        </div>
                        )}
                      </div>
                     </div>

                    <div className="space-y-4 text-sm">
                        {scheduledTime ? (
                            <div className="flex items-center gap-3 text-primary font-semibold bg-primary/10 p-3 rounded-lg">
                                <Calendar className="h-5 w-5" />
                                <div>
                                    <p>Course programmée</p>
                                    <p>{format(new Date(scheduledTime), "dd MMM yyyy 'à' HH:mm", { locale: fr })}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-primary font-semibold bg-primary/10 p-3 rounded-lg">
                                <Clock className="h-5 w-5" />
                                <p>Départ immédiat</p>
                            </div>
                        )}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 mt-0.5 text-green-500" />
                                <p className="font-medium">{pickup}</p>
                            </div>
                            {stops.map((stop, index) => (
                                stop && <div key={index} className="flex items-center gap-3 pl-1">
                                    <div className="flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground text-xs font-bold">
                                        {index + 1}
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground">{stop}</p>
                                </div>
                            ))}
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 mt-0.5 text-red-500" />
                                <p className="font-medium">{dropoff}</p>
                            </div>
                        </div>

                        <Separator />

                        <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
                            Modifier le trajet
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}><CardHeader><Skeleton className="aspect-video w-full" /></CardHeader><CardContent className="space-y-2"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-10 w-full mt-2" /></CardContent></Card>
                ))
              ) : (
                serviceTiers.map((tier) => (
                  <Card key={tier.id} className="flex flex-col md:flex-row md:items-center">
                    <div className="md:w-1/3">
                      <Image
                        src={tier.photoUrl}
                        alt={`Photo de ${tier.name}`}
                        data-ai-hint="luxury car"
                        width={400}
                        height={225}
                        className="h-full w-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-r-none"
                      />
                    </div>
                    <div className="flex-1 flex flex-col">
                       <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                              <CardTitle className="font-headline flex-grow">{tier.name}</CardTitle>
                               <TooltipProvider>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <span className="font-bold text-lg text-foreground whitespace-nowrap flex items-center gap-1.5 cursor-help">
                                              <Info className="h-4 w-4 text-muted-foreground" />
                                              Estimation: {tier.minimumPrice.toFixed(2)}€
                                          </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                          <p>Temps d'attente gratuit en ville: 3 minute, gare 10 minutes, aéroport 60 minutes</p>
                                      </TooltipContent>
                                  </Tooltip>
                               </TooltipProvider>
                          </div>
                       </CardHeader>
                       <CardContent className="flex-grow flex flex-col justify-between">
                          <p className="text-sm text-muted-foreground my-2">{tier.description}</p>
                          <div className="my-2" />
                          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                  <Users className="h-5 w-5 text-primary" />
                                  <span className="font-medium text-foreground">{tier.capacity?.passengers || 4} passagers</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <Briefcase className="h-5 w-5 text-primary" />
                                  <span className="font-medium text-foreground">{tier.capacity?.suitcases || 2} valises</span>
                              </div>
                          </div>
                          <Button className="w-full mt-4" asChild>
                             <Link href={getSignupLink(tier.id)}>Choisir {tier.name} <ArrowRight className="ml-2" /></Link>
                          </Button>
                       </CardContent>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

export default function SelectVehiclePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VehicleSelectionComponent />
    </Suspense>
  )
}
