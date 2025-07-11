

'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { collection, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowRight, Calendar, Clock, MapPin, Users, Briefcase, Info, Milestone, Timer, Edit, Backpack, AlertCircle } from 'lucide-react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useLoadScript } from '@react-google-maps/api';

import { LandingHeader } from '@/components/landing-header';
import { LandingFooter } from '@/components/landing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { db, auth } from '@/lib/firebase';
import { type ServiceTier, type ReservationOption, reservationOptions, type SelectedOption } from '@/lib/types';
import { RouteMap } from '@/components/route-map';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookingForm, type BookingDetails } from '@/components/booking-form';
import { AuthDialog } from '@/components/auth-dialog';
import { calculatePrice } from '@/lib/pricing';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY } from '@/lib/config';


interface RouteInfo {
    distance: string;
    duration: string;
}

const libraries = ['places'] as any;

const NumberSelect = ({
    value,
    onValueChange,
    max,
    min = 0,
    icon,
    label,
    disabled = false,
}: {
    value: number | undefined;
    onValueChange: (value: number) => void;
    max: number;
    min?: number;
    icon: React.ReactNode;
    label: string;
    disabled?: boolean;
}) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(disabled && "cursor-not-allowed")}>
            <Select
                value={value !== undefined ? String(value) : ""}
                onValueChange={(val) => onValueChange(Number(val))}
                disabled={disabled}
            >
                <SelectTrigger className="h-9 bg-white w-full" aria-label={label}>
                     <div className="flex items-center gap-2 truncate">
                        <div className="text-primary flex-shrink-0">{icon}</div>
                        <span className="truncate">{label}</span>
                        {value !== undefined && value > 0 && <span className="ml-auto font-bold text-primary pl-1">{value}</span>}
                    </div>
                </SelectTrigger>
                <SelectContent>
                    {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(num => (
                        <SelectItem key={num} value={String(num)}>
                            {num}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        {disabled && (
          <TooltipContent>
            <p>La limite d'options a été atteinte pour le nombre de passagers.</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
);

function VehicleSelectionComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [allServiceTiers, setAllServiceTiers] = useState<ServiceTier[]>([]);
  const [filteredTiers, setFilteredTiers] = useState<ServiceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formattedScheduledTime, setFormattedScheduledTime] = useState<string | null>(null);
  
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Memoize booking details to prevent re-parsing on every render
  const bookingDetails = useMemo(() => {
    const pickup = searchParams.get('pickup');
    const dropoff = searchParams.get('dropoff');
    const stops = searchParams.getAll('stop');
    const scheduledTime = searchParams.get('scheduledTime');
    const passengers = searchParams.get('passengers');
    const suitcases = searchParams.get('suitcases');
    const backpacks = searchParams.get('backpacks');
    
    if (!pickup || !dropoff) return null;

    return {
      pickup,
      dropoff,
      stops: stops.map(s => ({ id: Date.now() + Math.random(), address: s})),
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      passengers: passengers ? parseInt(passengers) : 1, // Default to 1 passenger if not specified
      suitcases: suitcases ? parseInt(suitcases) : 0,
      backpacks: backpacks ? parseInt(backpacks) : 0,
    };
  }, [searchParams]);
  
  const { maxChildSeats, totalChildSeatsSelected } = useMemo(() => {
    const passengers = bookingDetails?.passengers || 1;
    let maxSeats = 0;
    if (passengers >= 4) maxSeats = 3;
    else if (passengers === 3) maxSeats = 2;
    else if (passengers === 2) maxSeats = 1;

    const childSeats = selectedOptions.filter(opt => opt.name === 'Siège bébé' || opt.name === 'Rehausseur');
    const totalSelected = childSeats.reduce((sum, opt) => sum + opt.quantity, 0);

    return { maxChildSeats: maxSeats, totalChildSeatsSelected: totalSelected };
  }, [bookingDetails?.passengers, selectedOptions]);

  const isChildSeatLimitReached = totalChildSeatsSelected >= maxChildSeats;
  const isChildSeatLimitExceeded = totalChildSeatsSelected > maxChildSeats;
  
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
        setAllServiceTiers(tiersData);
      } catch (error) {
        console.error("Error fetching service tiers: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTiers();
  }, [bookingDetails, router]);
  
  useEffect(() => {
    if (!bookingDetails || allServiceTiers.length === 0) return;

    const { passengers, suitcases, backpacks } = bookingDetails;
    if (passengers !== undefined || suitcases !== undefined || backpacks !== undefined) {
        const suitableTiers = allServiceTiers.filter(tier => {
            const passengerCheck = passengers === undefined || tier.capacity.passengers >= passengers;
            const suitcaseCheck = suitcases === undefined || tier.capacity.suitcases >= suitcases;
            const backpackCheck = backpacks === undefined || tier.capacity.backpacks === undefined || tier.capacity.backpacks >= backpacks;
            return passengerCheck && suitcaseCheck && backpackCheck;
        });
        setFilteredTiers(suitableTiers);
    } else {
        setFilteredTiers(allServiceTiers);
    }
  }, [bookingDetails, allServiceTiers]);
  
  const sortedAndPricedTiers = useMemo(() => {
    if (!routeInfo) return [];
    
    const activeOptions = selectedOptions.filter(opt => opt.quantity > 0);

    return filteredTiers
      .map(tier => {
        const estimatedPrice = calculatePrice(
          tier,
          routeInfo.distance,
          routeInfo.duration,
          bookingDetails?.stops.length || 0,
          activeOptions
        );
        return { ...tier, estimatedPrice };
      })
      .sort((a, b) => a.estimatedPrice - b.estimatedPrice);
  }, [filteredTiers, routeInfo, bookingDetails?.stops.length, selectedOptions]);

  const handleUpdateTrip = (newDetails: BookingDetails) => {
    const queryParams = new URLSearchParams();
    queryParams.set('pickup', newDetails.pickup);
    queryParams.set('dropoff', newDetails.dropoff);
    newDetails.stops.forEach(stop => stop.address && queryParams.append('stop', stop.address));
    if (newDetails.scheduledTime) {
      queryParams.set('scheduledTime', newDetails.scheduledTime.toISOString());
    }
    if (newDetails.passengers) queryParams.set('passengers', String(newDetails.passengers));
    if (newDetails.suitcases) queryParams.set('suitcases', String(newDetails.suitcases));
    if (newDetails.backpacks) queryParams.set('backpacks', String(newDetails.backpacks));
    
    router.replace(`/book/select-vehicle?${queryParams.toString()}`);
    setRouteInfo(null);
    setIsEditing(false);
  }

  const handleChooseTier = (tierId: string) => {
    if (isChildSeatLimitExceeded) {
        // This is a safety check, the UI should prevent this state.
        return;
    }
    const optionsToPass = selectedOptions.filter(opt => opt.quantity > 0);

    if (currentUser) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tierId', tierId);
        if (routeInfo) {
            params.set('distance', routeInfo.distance);
            params.set('duration', routeInfo.duration);
        }
        if (optionsToPass.length > 0) {
            params.set('options', JSON.stringify(optionsToPass));
        }
        
        router.push(`/book/payment?${params.toString()}`);
    } else {
        setSelectedTierId(tierId);
        setIsAuthDialogOpen(true);
    }
  };
  
  const handleOptionQuantityChange = (optionName: ReservationOption, newQuantity: number) => {
    setSelectedOptions(prev => {
        const existingOptionIndex = prev.findIndex(o => o.name === optionName);
        if (newQuantity > 0) {
            if (existingOptionIndex > -1) {
                const newOptions = [...prev];
                newOptions[existingOptionIndex] = { ...newOptions[existingOptionIndex], quantity: newQuantity };
                return newOptions;
            } else {
                return [...prev, { name: optionName, quantity: newQuantity }];
            }
        } else {
            return prev.filter(o => o.name !== optionName);
        }
    });
  };

  if (!bookingDetails) {
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
                                stops: bookingDetails.stops,
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
                               <Button size="sm" onClick={() => setIsEditing(true)}>
                                   <Edit className="mr-2 h-4 w-4" />
                                   Modifier le trajet
                               </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                             <div className="h-64 rounded-lg overflow-hidden">
                               <RouteMap 
                                  isLoaded={isLoaded}
                                  loadError={loadError}
                                  apiKey={NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
                                  pickup={bookingDetails.pickup}
                                  dropoff={bookingDetails.dropoff}
                                  stops={bookingDetails.stops.map(s => s.address)}
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
                                        stop.address && <div key={index} className="flex items-center gap-3 pl-1">
                                            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground text-xs font-bold">
                                                {index + 1}
                                            </div>
                                            <p className="text-sm font-medium text-muted-foreground">{stop.address}</p>
                                        </div>
                                    ))}
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-5 w-5 mt-0.5 text-primary" />
                                        <p className="font-medium">{bookingDetails.dropoff}</p>
                                    </div>
                                </div>
                                {(bookingDetails.passengers || bookingDetails.suitcases || bookingDetails.backpacks) && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
                                            {bookingDetails.passengers && <Badge variant="secondary" className="text-base">
                                                <Users className="h-4 w-4 mr-2" /> {bookingDetails.passengers}
                                            </Badge>}
                                            {bookingDetails.suitcases && <Badge variant="secondary" className="text-base">
                                                <Briefcase className="h-4 w-4 mr-2" /> {bookingDetails.suitcases}
                                            </Badge>}
                                            {bookingDetails.backpacks && <Badge variant="secondary" className="text-base">
                                                <Backpack className="h-4 w-4 mr-2" /> {bookingDetails.backpacks}
                                            </Badge>}
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Options de la course</CardTitle>
                            <CardDescription>
                                {maxChildSeats > 0 
                                    ? `Pour ${bookingDetails.passengers} passagers, vous pouvez ajouter jusqu'à ${maxChildSeats} sièges enfants. Total sélectionné: ${totalChildSeatsSelected}.`
                                    : `Le nombre de passagers ne permet pas d'ajouter de siège enfant.`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {reservationOptions.map((option) => {
                                    const selected = selectedOptions.find(o => o.name === option.name);
                                    const quantity = selected ? selected.quantity : 0;
                                    const isChildSeat = option.name === 'Siège bébé' || option.name === 'Rehausseur';
                                    const isDisabled = (isChildSeat && isChildSeatLimitReached && quantity === 0) || (maxChildSeats === 0 && isChildSeat);

                                    return (
                                        <NumberSelect
                                            key={option.name}
                                            icon={<option.icon className="h-4 w-4" />}
                                            value={quantity}
                                            onValueChange={(val) => handleOptionQuantityChange(option.name, val)}
                                            min={0}
                                            max={2}
                                            label={option.name}
                                            disabled={isDisabled}
                                        />
                                    );
                                })}
                            </div>
                            {isChildSeatLimitExceeded && (
                                <Alert className="mt-4" variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Trop d'options sélectionnées</AlertTitle>
                                    <AlertDescription>
                                        Vous avez dépassé le nombre de sièges enfants autorisés pour {bookingDetails.passengers} passagers. Veuillez en retirer.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
        
                    <div className="flex flex-col gap-6">
                        <h2 className="text-2xl font-bold tracking-tighter font-headline">Choisissez votre véhicule</h2>
                      {loading || !routeInfo || authLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <Card key={i}><CardHeader><Skeleton className="aspect-video w-full" /></CardHeader><CardContent className="space-y-2"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full" /><Button disabled className="w-full mt-2"><Skeleton className="h-5 w-24" /></Button></CardContent></Card>
                        ))
                      ) : sortedAndPricedTiers.length > 0 ? (
                        sortedAndPricedTiers.map((tier) => {
                          return (
                            <div key={tier.id} className="bg-card rounded-lg shadow-sm flex flex-col md:flex-row md:items-center overflow-hidden">
                              <div className="md:w-1/4">
                                <Image
                                  src={tier.photoUrl}
                                  alt={`Photo de ${tier.name}`}
                                  data-ai-hint="luxury car"
                                  width={400}
                                  height={225}
                                  className="h-full w-full object-contain"
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
                                                  Estimation: {tier.estimatedPrice.toFixed(2)}€
                                              </span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                              <p>Le prix final peut varier en fonction du trafic et des arrêts.</p>
                                          </TooltipContent>
                                      </Tooltip>
                                  </TooltipProvider>
                                    <Button className="w-full md:w-auto mt-2" onClick={() => handleChooseTier(tier.id)} disabled={isChildSeatLimitExceeded}>
                                       Choisir <ArrowRight className="ml-2" />
                                    </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Aucune gamme disponible</AlertTitle>
                            <AlertDescription>
                                Aucun de nos véhicules ne correspond à votre demande pour {bookingDetails.passengers} passager(s) et {bookingDetails.suitcases} valise(s). Veuillez modifier votre demande ou nous contacter.
                            </AlertDescription>
                        </Alert>
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
                stops: bookingDetails.stops.map(s => s.address),
                routeInfo: routeInfo,
                options: selectedOptions.filter(o => o.quantity > 0),
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
