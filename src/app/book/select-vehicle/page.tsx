
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { collection, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowRight, Calendar, Clock, MapPin, Users, Briefcase } from 'lucide-react';

import { LandingHeader } from '@/components/landing-header';
import { LandingFooter } from '@/components/landing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import type { ServiceTier } from '@/lib/types';
import { RouteMap } from '@/components/route-map';
import { Separator } from '@/components/ui/separator';

function VehicleSelectionComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [serviceTiers, setServiceTiers] = useState<ServiceTier[]>([]);
  const [loading, setLoading] = useState(true);

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
          
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Résumé de votre course</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                         <div className="h-80 rounded-lg overflow-hidden border">
                           <RouteMap 
                              pickup={pickup || ''}
                              dropoff={dropoff || ''}
                              stops={stops}
                           />
                        </div>
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
                        <div className="flex flex-col gap-1">
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 mt-0.5 text-green-500" />
                                <p className="font-medium">{pickup}</p>
                            </div>
                             {stops.map((stop, index) => (
                                stop && <div key={index} className="flex items-start gap-3 pl-[2.2rem] relative">
                                     <div className="absolute left-[0.55rem] top-2 w-px h-full bg-border -z-10" />
                                    <p className="text-xs text-muted-foreground before:content-['•'] before:mr-2 before:text-lg before:-ml-1">{stop}</p>
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
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
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
                      <div className="flex-1">
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <CardTitle className="font-headline">{tier.name}</CardTitle>
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Users className="h-4 w-4" />
                                        <span className="font-medium text-foreground">{tier.capacity?.passengers || 4}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Briefcase className="h-4 w-4" />
                                        <span className="font-medium text-foreground">{tier.capacity?.suitcases || 2}</span>
                                    </div>
                                    <span className="font-bold text-lg text-foreground">€{tier.minimumPrice.toFixed(2)}</span>
                                </div>
                            </div>
                            <CardDescription>{tier.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Button className="w-full" asChild>
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
