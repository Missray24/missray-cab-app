
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { collection, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowRight, Calendar, Clock, MapPin, Users, Briefcase, Info, Milestone, Timer, Edit } from 'lucide-react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

import { LandingHeader } from '@/components/landing-header';
import { LandingFooter } from '@/components/landing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { db, auth } from '@/lib/firebase';
import type { ServiceTier } from '@/lib/types';
import { RouteMap } from '@/components/route-map';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookingForm, type BookingDetails } from '@/components/booking-form';
import { AuthDialog } from '@/components/auth-dialog';
import { calculatePrice } from '@/lib/pricing';

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
  const [isEditing, setIsEditing] = useState(false);
  const [formattedScheduledTime, setFormattedScheduledTime] = useState<string | null>(null);
  
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

  // Memoize booking details to prevent re-parsing on every render
  const bookingDetails = useMemo(() => {
    const pickup = searchParams.get('pickup');
    const dropoff = searchParams.get('dropoff');
    const stops = searchParams.getAll('stop');
    const scheduledTime = searchParams.get('scheduledTime');
    
    if (!pickup || !dropoff) return null;

    return {
      pickup,
      dropoff,
      stops: stops.map(s => s), // Ensure it's an array of strings
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
    };
  }, [searchParams]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (bookingDetails?.scheduledTime) {
      setFormattedScheduledTime(
        format(bookingDetails.scheduledTime, "dd MMM yyyy 'à' HH:mm", { locale: fr })
      );
    } else {
      setFormattedScheduledTime(null);
    }
  }, [bookingDetails?.scheduledTime]);

  useEffect(() => {
    if (!bookingDetails) {
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
  }, [bookingDetails, router]);
  
  const handleUpdateTrip = (newDetails: BookingDetails) => {
    const queryParams = new URLSearchParams();
    queryParams.set('pickup', newDetails.pickup);
    queryParams.set('dropoff', newDetails.dropoff);
    newDetails.stops.forEach(stop => stop.address && queryParams.append('stop', stop.address));
    if (newDetails.scheduledTime) {
      queryParams.set('scheduledTime', newDetails.scheduledTime.toISOString());
    }
    // Use router.replace to update URL without adding to history
    router.replace(`/book/select-vehicle?${queryParams.toString()}`);
    setRouteInfo(null); // Reset route info to trigger recalculation
    setIsEditing(false);
  }

  const handleChooseTier = (tierId: string) => {
    if (currentUser) {
        // If user is logged in, proceed to payment
        const params = new URLSearchParams();
        if (bookingDetails) {
            params.set('pickup', bookingDetails.pickup);
            params.set('dropoff', bookingDetails.dropoff);
            bookingDetails.stops.forEach(s => params.append('stop', s));
            if (bookingDetails.scheduledTime) {
                params.set('scheduledTime', bookingDetails.scheduledTime.toISOString());
            }
        }
        params.set('tierId', tierId);
        if (routeInfo) {
            params.set('distance', routeInfo.distance);
            params.set('duration', routeInfo.duration);
        }
        router.push(`/book/payment?${params.toString()}`);
    } else {
        // If user is not logged in, open auth dialog
        setSelectedTierId(tierId);
        setIsAuthDialogOpen(true);
    }
  };

  if (!bookingDetails) {
    // Render loading or null while redirecting
    return <div className="flex flex-col min-h-dvh bg-muted/40"><LandingHeader /><main className="flex-1"></main><LandingFooter /></div>;
  }

  return (
    <div className="flex flex-col min-h-dvh bg-muted/40">
      <LandingHeader />
      <main className="flex-1 py-12 md:py-24">
        <div className="container">
            {isEditing ? (
              <div>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline mb-2">Modifier votre trajet</h1>
                    <p className="text-muted-foreground max-w-2xl">
                        Mettez à jour les détails de votre course ci-dessous.
                    </p>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <BookingForm 
                            initialDetails={{
                                ...bookingDetails,
                                stops: bookingDetails.stops.map(s => ({id: Date.now() + Math.random(), address: s})),
                            }} 
                            onSubmit={handleUpdateTrip}
                            submitButtonText="Mettre à jour le trajet"
                        />
                        <Button variant="ghost" className="w-full mt-4" onClick={() => setIsEditing(false)}>Annuler les modifications</Button>
                    </CardContent>
                </Card>
              </div>
            ) : (
                <div className="flex flex-col gap-8">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                               <CardTitle>Résumé de votre course</CardTitle>
                               <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                   <Edit className="mr-2 h-4 w-4" />
                                   Modifier le trajet
                               </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                             <div className="h-64 rounded-lg overflow-hidden border">
                               <RouteMap 
                                  pickup={bookingDetails.pickup}
                                  dropoff={bookingDetails.dropoff}
                                  stops={bookingDetails.stops}
                                  onRouteInfoFetched={setRouteInfo}
                               />
                            </div>
        
                            <div className="space-y-4 text-sm">
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
                                <Separator />
                                {bookingDetails.scheduledTime ? (
                                    <div className="flex items-center gap-3 text-primary font-semibold bg-primary/10 p-3 rounded-lg">
                                        <Calendar className="h-5 w-5" />
                                        <div>
                                            <p>Course programmée</p>
                                            <p>{formattedScheduledTime || 'Calcul...'}</p>
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
                                        <p className="font-medium">{bookingDetails.pickup}</p>
                                    </div>
                                    {bookingDetails.stops.map((stop, index) => (
                                        stop && <div key={index} className="flex items-center gap-3 pl-1">
                                            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground text-xs font-bold">
                                                {index + 1}
                                            </div>
                                            <p className="text-sm font-medium text-muted-foreground">{stop}</p>
                                        </div>
                                    ))}
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-5 w-5 mt-0.5 text-red-500" />
                                        <p className="font-medium">{bookingDetails.dropoff}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
        
                    <div className="flex flex-col gap-6">
                        <h2 className="text-2xl font-bold tracking-tighter font-headline">Choisissez votre véhicule</h2>
                      {loading || !routeInfo || authLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <Card key={i}><CardHeader><Skeleton className="aspect-video w-full" /></CardHeader><CardContent className="space-y-2"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full" /><Button disabled className="w-full mt-2"><Skeleton className="h-5 w-24" /></Button></CardContent></Card>
                        ))
                      ) : (
                        serviceTiers.map((tier) => {
                          const estimatedPrice = calculatePrice(
                              tier,
                              routeInfo.distance,
                              routeInfo.duration,
                              bookingDetails.stops.length
                          );
                          return (
                            <Card key={tier.id} className="flex flex-col md:flex-row md:items-center">
                              <div className="md:w-1/4">
                                <Image
                                  src={tier.photoUrl}
                                  alt={`Photo de ${tier.name}`}
                                  data-ai-hint="luxury car"
                                  width={400}
                                  height={225}
                                  className="h-full w-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-r-none"
                                />
                              </div>
                              <div className="flex-1 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className='flex-grow'>
                                  <p className="font-bold text-lg text-foreground">{tier.name}</p>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                    <div className="flex items-center gap-1.5"><Users className="h-4 w-4" />{tier.capacity?.passengers || 4}</div>
                                    <div className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{tier.capacity?.suitcases || 2}</div>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-2">{tier.description}</p>
                                </div>
                                <div className='flex-shrink-0 text-right'>
                                  <TooltipProvider>
                                      <Tooltip>
                                          <TooltipTrigger asChild>
                                              <span className="font-bold text-lg text-foreground whitespace-nowrap flex items-center justify-end gap-1.5 cursor-help">
                                                  <Info className="h-4 w-4 text-muted-foreground" />
                                                  Estimation: {estimatedPrice.toFixed(2)}€
                                              </span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                              <p>Le prix final peut varier en fonction du trafic et des arrêts.</p>
                                          </TooltipContent>
                                      </Tooltip>
                                  </TooltipProvider>
                                    <Button className="w-full md:w-auto mt-2" onClick={() => handleChooseTier(tier.id)}>
                                       Choisir <ArrowRight className="ml-2" />
                                    </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })
                      )}
                    </div>
                </div>
            )}
        </div>
      </main>
      <LandingFooter />
      {bookingDetails && (
        <AuthDialog
            open={isAuthDialogOpen}
            onOpenChange={setIsAuthDialogOpen}
            bookingDetails={{
                ...bookingDetails, 
                tierId: selectedTierId!, 
                routeInfo: routeInfo,
            }}
        />
      )}
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
