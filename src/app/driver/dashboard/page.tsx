
'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, getDocs, query, where, doc, updateDoc, writeBatch, Timestamp } from "firebase/firestore";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { Reservation, ReservationOption, ServiceTier, User } from "@/lib/types";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CalendarCheck, Car, CheckCircle, DollarSign, Users, Briefcase, Backpack, MapPin, Milestone, Timer, Baby, Armchair, Dog, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RouteMap } from "@/components/route-map";

const optionIcons: Record<ReservationOption, React.ElementType> = {
    'Siège bébé': Baby,
    'Rehausseur': Armchair,
    'Animal': Dog,
};

export default function DriverDashboardPage() {
  const [driver, setDriver] = useState<User | null>(null);
  const [availableRides, setAvailableRides] = useState<Reservation[]>([]);
  const [upcomingRides, setUpcomingRides] = useState<Reservation[]>([]);
  const [serviceTiers, setServiceTiers] = useState<ServiceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDriverAndRides = async (currentUser: FirebaseUser) => {
    setLoading(true);
    try {
      // 1. Fetch driver details
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

      // 2. Fetch service tiers
      const tiersSnapshot = await getDocs(collection(db, "serviceTiers"));
      setServiceTiers(tiersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceTier)));


      // 3. Fetch available rides (new requests)
      const availableQuery = query(collection(db, "reservations"), where("status", "==", "Nouvelle demande"));
      const availableSnapshot = await getDocs(availableQuery);
      setAvailableRides(availableSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation)));
      
      // 4. Fetch upcoming rides for this driver
      const upcomingQuery = query(collection(db, "reservations"), 
        where("driverId", "==", driverData.id),
        where("status", "in", ["Acceptée", "Chauffeur en route", "Chauffeur sur place", "Voyageur à bord"])
      );
      const upcomingSnapshot = await getDocs(upcomingQuery);
      setUpcomingRides(upcomingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation)));

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger les données." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        fetchDriverAndRides(currentUser);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        // Refresh data
        if (auth.currentUser) {
            fetchDriverAndRides(auth.currentUser);
        }

    } catch (error) {
        console.error("Error accepting ride:", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible d'accepter la course." });
    }
  };

  const ridesThisMonth = driver?.driverProfile?.totalRides || 0;
  const earningsThisMonth = driver?.driverProfile?.totalEarnings || 0;


  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Bienvenue, ${driver?.firstName || 'Chauffeur'}`} />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus (ce mois)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{earningsThisMonth.toFixed(2)}€</div>}
            <p className="text-xs text-muted-foreground">Après commission</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses (ce mois)</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{ridesThisMonth}</div>}
            <p className="text-xs text-muted-foreground">Total des courses terminées</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses à venir</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{upcomingRides.length}</div>}
             <p className="text-xs text-muted-foreground">Courses que vous avez acceptées</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Statut</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{driver?.status}</div>}
            <p className="text-xs text-muted-foreground">Votre statut actuel sur la plateforme</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Nouvelles courses disponibles</CardTitle>
                <CardDescription>
                Consultez les dernières demandes et acceptez celles qui vous intéressent.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {loading ? (
                    Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
                ) : availableRides.length > 0 ? (
                    availableRides.map((ride) => {
                         const tier = serviceTiers.find(t => t.id === ride.serviceTierId);
                         return (
                            <Card key={ride.id} className="p-4">
                                <div className="space-y-3">
                                    <div className="aspect-video w-full rounded-md overflow-hidden border">
                                        <RouteMap pickup={ride.pickup} dropoff={ride.dropoff} stops={ride.stops} isInteractive={false} />
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                                        <div className="space-y-3 flex-grow">
                                            <div className="font-semibold">{format(new Date(ride.date), "EEEE d MMM yyyy 'à' HH:mm", { locale: fr })}</div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Milestone className="h-4 w-4 text-muted-foreground" />
                                                <span>{ride.distance}</span>
                                                <Timer className="h-4 w-4 text-muted-foreground ml-2" />
                                                <span>{ride.duration}</span>
                                            </div>
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
                                                <Badge variant="secondary" className="capitalize">{ride.paymentMethod}</Badge>
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
                    <div className="text-center text-muted-foreground py-10">
                        Aucune nouvelle course pour le moment.
                    </div>
                )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Mes prochaines courses</CardTitle>
                <CardDescription>
                    Voici les courses que vous avez acceptées.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Course</TableHead>
                            <TableHead className="text-right">Client</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-9 w-9 rounded-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : upcomingRides.length > 0 ? (
                            upcomingRides.map((ride) => (
                            <TableRow key={ride.id}>
                                <TableCell>
                                    <div className="font-medium">{ride.pickup}</div>
                                    <div className="text-sm text-muted-foreground">vers {ride.dropoff}</div>
                                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                        {format(new Date(ride.date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                                        <Badge variant="secondary" className="capitalize">{ride.status}</Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{ride.clientName}</TableCell>
                                <TableCell>
                                    <Button asChild size="icon" variant="ghost">
                                        <Link href={`/driver/reservations`}>
                                            <ArrowRight />
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    Vous n'avez aucune course à venir.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
