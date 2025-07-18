
'use client';

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users, Briefcase, Backpack, MapPin, Baby, Armchair, Dog, Milestone, Timer, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { Reservation, ReservationOption, ServiceTier, User, Zone } from "@/lib/types";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const optionIcons: Record<ReservationOption, React.ElementType> = {
    'Siège bébé': Baby,
    'Rehausseur': Armchair,
    'Animal': Dog,
};

// Helper function to check if a point is inside a polygon
const isPointInPolygon = (point: google.maps.LatLng, polygon: google.maps.Polygon) => {
    return window.google.maps.geometry.spherical.containsLocation(point, polygon);
};


export default function NewRidesPage() {
  const [driver, setDriver] = useState<User | null>(null);
  const [availableRides, setAvailableRides] = useState<Reservation[]>([]);
  const [serviceTiers, setServiceTiers] = useState<ServiceTier[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);


  useEffect(() => {
    if (typeof window.google !== 'undefined') {
        setGeocoder(new window.google.maps.Geocoder());
    }
  }, []);

  const fetchDriverAndData = async (currentUser: FirebaseUser) => {
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const driverQuery = query(usersRef, where("uid", "==", currentUser.uid));
      const driverSnapshot = await getDocs(driverQuery);

      if (driverSnapshot.empty) {
        toast({ variant: 'destructive', title: "Erreur", description: "Profil chauffeur non trouvé." });
        setLoading(false);
        return;
      }
      const driverData = { id: driverSnapshot.docs[0].id, ...driverSnapshot.docs[0].data() } as User;
      setDriver(driverData);

      // Fetch service tiers and zones
      const [tiersSnapshot, zonesSnapshot] = await Promise.all([
        getDocs(collection(db, "serviceTiers")),
        getDocs(collection(db, "zones"))
      ]);
      const tiersData = tiersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceTier));
      const zonesData = zonesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Zone));
      setServiceTiers(tiersData);
      setZones(zonesData);
      
      const availableQuery = query(collection(db, "reservations"), where("status", "==", "Nouvelle demande"));
      
      const unsubscribe = onSnapshot(availableQuery, async (snapshot) => {
          const allRides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
          
          if (driverData.driverProfile?.activeZoneIds && driverData.driverProfile.activeZoneIds.length > 0 && geocoder && zonesData.length > 0) {
              const driverZones = zonesData.filter(z => driverData.driverProfile!.activeZoneIds.includes(z.id) && z.polygon);
              if (driverZones.length > 0) {
                  const filteredRides = [];
                  for (const ride of allRides) {
                      try {
                          const geocodeResult = await geocoder.geocode({ address: ride.pickup });
                          if (geocodeResult.results.length > 0) {
                              const rideLocation = geocodeResult.results[0].geometry.location;
                              const isInDriverZone = driverZones.some(zone => {
                                  const googlePolygon = new window.google.maps.Polygon({ paths: zone.polygon });
                                  return isPointInPolygon(rideLocation, googlePolygon);
                              });
                              if (isInDriverZone) {
                                  filteredRides.push(ride);
                              }
                          }
                      } catch (e) {
                          console.error("Geocoding failed for ride:", ride.id, e);
                          // By default, include ride if geocoding fails? Or exclude?
                          // Let's include it to not miss potential rides.
                          filteredRides.push(ride);
                      }
                  }
                  setAvailableRides(filteredRides);
              } else {
                 setAvailableRides([]); // Driver has zones selected, but none have polygons or exist
              }
          } else {
              // If driver has no zones selected, or geocoder/zones not ready, show all rides.
              setAvailableRides(allRides);
          }
          setLoading(false);
      });

      return () => unsubscribe();

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger les données." });
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        fetchDriverAndData(currentUser);
      } else {
        setLoading(false);
      }
    });
    // This effect should only run once, so we pass an empty dependency array.
    // The onSnapshot will handle updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geocoder]); // Re-run if geocoder becomes available.


  const handleAcceptRide = async (reservationId: string) => {
    if (!driver) return;
    
    const rideToUpdate = availableRides.find(r => r.id === reservationId);
    if (!rideToUpdate) return;
    
    try {
        const resRef = doc(db, "reservations", reservationId);
        const newStatus = 'Acceptée';
        const statusHistoryEntry = { status: newStatus, timestamp: new Date().toLocaleString('fr-FR') };

        await updateDoc(resRef, { 
            driverId: driver.id,
            driverName: driver.name,
            status: newStatus,
            statusHistory: [...rideToUpdate.statusHistory, statusHistoryEntry]
        });

        toast({ title: "Course acceptée!", description: "La course a été ajoutée à votre planning." });

    } catch (error) {
        console.error("Error accepting ride:", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible d'accepter la course." });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nouvelles Courses Disponibles" />
      <Card>
        <CardHeader>
          <CardTitle>Liste des demandes en attente</CardTitle>
          <CardDescription>Consultez les dernières demandes dans vos zones et acceptez celles qui vous intéressent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                ))
            ) : availableRides.length > 0 ? (
                availableRides.map((ride) => {
                    const tier = serviceTiers.find(t => t.id === ride.serviceTierId);
                    return (
                        <Card key={ride.id} className="p-4">
                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                                    <div className="space-y-3 flex-grow">
                                        <div className="font-semibold">{format(new Date(ride.date), "EEEE d MMM yyyy 'à' HH:mm", { locale: fr })}</div>
                                        {(ride.distance || ride.duration) && (
                                            <div className="flex items-center gap-2 text-sm">
                                                {ride.distance && <span className="flex items-center gap-1.5"><Milestone className="h-4 w-4 text-muted-foreground" />{ride.distance}</span>}
                                                {ride.duration && <span className="flex items-center gap-1.5"><Timer className="h-4 w-4 text-muted-foreground" />{ride.duration}</span>}
                                            </div>
                                        )}
                                        <div className="flex items-start gap-2">
                                            <MapPin className="h-5 w-5 mt-0.5 text-primary" />
                                            <div className="text-sm">
                                                <div className="font-medium">{ride.pickup}</div>
                                                <div className="text-muted-foreground">vers {ride.dropoff}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                            {tier && <Badge variant="outline">{tier.name}</Badge>}
                                            {ride.passengers && <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{ride.passengers}</span>}
                                            {ride.suitcases !== undefined && <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{ride.suitcases}</span>}
                                            {ride.backpacks !== undefined && <span className="flex items-center gap-1.5"><Backpack className="h-4 w-4" />{ride.backpacks}</span>}
                                            <Badge variant="secondary" className="capitalize flex items-center gap-1.5"><CreditCard className="h-4 w-4" />{ride.paymentMethod}</Badge>
                                        </div>
                                        {ride.options && ride.options.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {ride.options.map(option => {
                                                    const Icon = optionIcons[option.name];
                                                    return (<Badge key={option.name} variant="secondary" className="py-1"><Icon className="h-4 w-4 mr-2" />{option.name} {option.quantity > 1 && `x${option.quantity}`}</Badge>);
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0 flex flex-col items-end justify-between gap-2">
                                        <div className="text-lg font-bold text-primary">{ride.driverPayout.toFixed(2)}€</div>
                                        <Button size="sm" onClick={() => handleAcceptRide(ride.id)}>Accepter</Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )
                })
            ) : (
                <div className="text-center text-muted-foreground py-16">
                    Aucune nouvelle course pour le moment dans vos zones.
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
