
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { collection, getDocs } from 'firebase/firestore';
import { Users, Briefcase, Backpack, Milestone, Timer, MapPin, ChevronDown } from 'lucide-react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useLoadScript } from '@react-google-maps/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { db, auth } from '@/lib/firebase';
import { type ServiceTier, type ReservationOption, reservationOptions, type SelectedOption } from '@/lib/types';
import { RouteMap } from '@/components/route-map';
import { AuthDialog } from '@/components/auth-dialog';
import { calculatePrice } from '@/lib/pricing';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY } from '@/lib/config';

interface RouteInfo {
    distance: string;
    duration: string;
}

const libraries = ['places'] as any;

function VehicleSelectionComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [allServiceTiers, setAllServiceTiers] = useState<ServiceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

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
      stops: stops,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      passengers: passengers ? parseInt(passengers) : 1,
      suitcases: suitcases ? parseInt(suitcases) : 0,
      backpacks: backpacks ? parseInt(backpacks) : 0,
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
    if (!bookingDetails) {
      router.replace('/app');
      return;
    }
    
    const fetchTiers = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "serviceTiers"));
        const tiersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ServiceTier[];
        setAllServiceTiers(tiersData);
      } catch (error) {
        console.error("Error fetching service tiers: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTiers();
  }, [bookingDetails, router]);
  
  const sortedAndPricedTiers = useMemo(() => {
    if (!routeInfo || !bookingDetails) return [];
    
    const activeOptions = selectedOptions.filter(opt => opt.quantity > 0);
    
    const suitableTiers = allServiceTiers.filter(tier => 
        (tier.capacity.passengers >= (bookingDetails.passengers || 1)) &&
        (tier.capacity.suitcases >= (bookingDetails.suitcases || 0)) &&
        ((tier.capacity.backpacks ?? 0) >= (bookingDetails.backpacks || 0))
    );

    return suitableTiers
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
  }, [allServiceTiers, routeInfo, bookingDetails, selectedOptions]);

  const handleChooseTier = (tierId: string) => {
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
    return null; // Redirecting in effect
  }

  return (
    <div className="relative h-full w-full flex flex-col">
        {/* Map takes up all available space */}
        <div className="absolute inset-0">
            <RouteMap 
                isLoaded={isLoaded}
                loadError={loadError}
                apiKey={NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
                pickup={bookingDetails.pickup}
                dropoff={bookingDetails.dropoff}
                stops={bookingDetails.stops}
                onRouteInfoFetched={setRouteInfo}
                isInteractive={false}
            />
        </div>

        {/* Top Itinerary Card - flex-shrink: 0 so it doesn't get squashed */}
        <div className="relative p-2 flex-shrink-0">
            <Card className="shadow-lg max-w-lg mx-auto">
                <CardContent className="p-3 text-sm">
                    {routeInfo ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <span className="flex items-center gap-1.5"><Milestone className="h-4 w-4" /> {routeInfo.distance}</span>
                                <span className="flex items-center gap-1.5"><Timer className="h-4 w-4" /> {routeInfo.duration}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-5">
                            <Skeleton className="h-4 w-32" />
                        </div>
                    )}
                    <div className="flex items-start gap-2 mt-2">
                        <MapPin className="h-5 w-5 mt-0.5 text-primary" />
                        <div className="w-full">
                            <p className="font-medium truncate">{bookingDetails.pickup}</p>
                            <p className="font-medium truncate text-muted-foreground">vers {bookingDetails.dropoff}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Spacer to push bottom panel down */}
        <div className="flex-grow"></div>

        {/* Bottom Selection Panel - flex-shrink: 0 and contains its own scrolling */}
        <div className="relative flex-shrink-0">
             <Card className="m-2 max-w-2xl mx-auto rounded-xl shadow-2xl">
                 <CardHeader>
                     <CardTitle>Choisissez votre véhicule</CardTitle>
                 </CardHeader>
                <CardContent className="space-y-4">
                    <Collapsible>
                        <CollapsibleTrigger asChild>
                           <Button variant="outline" className="w-full justify-between">
                                Ajouter des options
                                <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180" />
                           </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {reservationOptions.map((option) => {
                                    const selected = selectedOptions.find(o => o.name === option.name);
                                    const quantity = selected ? selected.quantity : 0;
                                    return (
                                        <Select
                                            key={option.name}
                                            value={String(quantity)}
                                            onValueChange={(val) => handleOptionQuantityChange(option.name, Number(val))}
                                        >
                                            <SelectTrigger className="h-9 bg-background w-full">
                                                <div className="flex items-center gap-2 truncate">
                                                    <div className="text-primary flex-shrink-0"><option.icon className="h-4 w-4"/></div>
                                                    <span className="truncate">{option.name}</span>
                                                    {quantity > 0 && <span className="ml-auto font-bold text-primary pl-1">{quantity}</span>}
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Array.from({ length: 3 }, (_, i) => i).map(num => (
                                                    <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    );
                                })}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                    <div className="max-h-[30vh] overflow-y-auto pr-2 space-y-2">
                     {loading || !routeInfo || authLoading ? (
                        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
                      ) : (
                        sortedAndPricedTiers.map((tier) => (
                            <button key={tier.id} onClick={() => handleChooseTier(tier.id)} className="w-full text-left">
                                <div className="bg-muted/50 hover:bg-muted p-2 rounded-lg flex items-center gap-4 transition-colors">
                                    <Image
                                        src={tier.photoUrl}
                                        alt={tier.name}
                                        data-ai-hint="luxury car"
                                        width={100}
                                        height={60}
                                        className="h-14 w-24 object-contain"
                                    />
                                    <div className='flex-grow'>
                                        <p className="font-bold text-foreground">{tier.name}</p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                            <div className="flex items-center gap-1"><Users className="h-3 w-3" />{tier.capacity.passengers}</div>
                                            <div className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{tier.capacity.suitcases}</div>
                                            <div className="flex items-center gap-1"><Backpack className="h-3 w-3" />{tier.capacity.backpacks || 0}</div>
                                        </div>
                                    </div>
                                    <div className="font-bold text-lg text-foreground whitespace-nowrap">
                                        {tier.estimatedPrice.toFixed(2)}€
                                    </div>
                                </div>
                            </button>
                        ))
                      )}
                      </div>
                </CardContent>
             </Card>
        </div>
      {bookingDetails && selectedTierId && (
        <AuthDialog
            open={isAuthDialogOpen}
            onOpenChange={setIsAuthDialogOpen}
            bookingDetails={{
                ...bookingDetails, 
                tierId: selectedTierId!, 
                stops: bookingDetails.stops,
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
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center"><p>Chargement...</p></div>}>
      <VehicleSelectionComponent />
    </Suspense>
  )
}
