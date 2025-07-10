
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, getDoc, query, where, getDocs, addDoc } from 'firebase/firestore';
import { CreditCard, Landmark, Car, MapPin, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { LandingHeader } from '@/components/landing-header';
import { LandingFooter } from '@/components/landing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { db, auth } from '@/lib/firebase';
import type { ServiceTier, PaymentMethod } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function PaymentComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [tier, setTier] = useState<ServiceTier | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Carte');

  const bookingDetails = useMemo(() => {
    const pickup = searchParams.get('pickup');
    const dropoff = searchParams.get('dropoff');
    const stops = searchParams.getAll('stop');
    const scheduledTime = searchParams.get('scheduledTime');
    const tierId = searchParams.get('tierId');

    if (!pickup || !dropoff || !tierId) return null;

    return {
      pickup,
      dropoff,
      stops,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      tierId,
    };
  }, [searchParams]);

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
    if (!bookingDetails) {
      router.replace('/');
      return;
    }

    const fetchTier = async () => {
      setLoading(true);
      try {
        const tierDocRef = doc(db, "serviceTiers", bookingDetails.tierId);
        const tierDocSnap = await getDoc(tierDocRef);
        if (tierDocSnap.exists()) {
          setTier({ id: tierDocSnap.id, ...tierDocSnap.data() } as ServiceTier);
        } else {
          toast({ variant: 'destructive', title: 'Erreur', description: 'Gamme de service non trouvée.' });
          router.replace('/');
        }
      } catch (error) {
        console.error("Error fetching service tier: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTier();
  }, [bookingDetails, router, toast]);
  
  const handleConfirmBooking = async () => {
    if (!bookingDetails || !tier || !user) return;
    setIsSubmitting(true);
    
    try {
        // Fetch user details from Firestore
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) throw new Error("Client details not found.");
        const clientDoc = querySnapshot.docs[0];
        const clientData = clientDoc.data();

        // In a real app, find an available driver. For now, we'll leave it unassigned.
        const reservationData = {
            clientId: clientDoc.id,
            clientName: clientData.name,
            driverId: '', // Unassigned initially
            driverName: 'Non assigné',
            date: bookingDetails.scheduledTime ? bookingDetails.scheduledTime.toISOString() : new Date().toISOString(),
            pickup: bookingDetails.pickup,
            dropoff: bookingDetails.dropoff,
            stops: bookingDetails.stops,
            status: 'Nouvelle demande' as const,
            statusHistory: [{ status: 'Nouvelle demande' as const, timestamp: new Date().toLocaleString('fr-FR') }],
            amount: tier.minimumPrice, // Use minimum price as an estimate for now
            driverPayout: tier.minimumPrice * 0.8, // Example payout
            paymentMethod,
            serviceTierId: tier.id,
        };

        const docRef = await addDoc(collection(db, "reservations"), reservationData);
        
        toast({ title: 'Réservation confirmée!', description: 'Votre course a été enregistrée.' });
        router.push(`/book/confirmation?id=${docRef.id}`);
    } catch(err) {
        console.error("Error creating reservation: ", err);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de créer la réservation.' });
        setIsSubmitting(false);
    }
  }

  if (loading || !bookingDetails || !tier) {
    return (
        <div className="flex flex-col min-h-dvh bg-muted/40">
            <LandingHeader />
            <main className="flex-1 py-12 md:py-24"><div className="container max-w-2xl"><Skeleton className="h-96 w-full" /></div></main>
            <LandingFooter />
        </div>
    );
  }
  
  const scheduledTimeFormatted = bookingDetails.scheduledTime 
      ? format(bookingDetails.scheduledTime, "dd MMM yyyy 'à' HH:mm", { locale: fr })
      : null;

  return (
    <div className="flex flex-col min-h-dvh bg-muted/40">
      <LandingHeader />
      <main className="flex-1 py-12 md:py-24">
        <div className="container max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold tracking-tighter font-headline">Finalisez votre réservation</CardTitle>
              <CardDescription>Confirmez les détails et choisissez votre méthode de paiement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="border rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-lg">Résumé de la course</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-3">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <p>{tier.name}</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 mt-0.5 text-green-500" />
                            <p className="font-medium">{bookingDetails.pickup}</p>
                        </div>
                        {bookingDetails.stops.map((stop, i) => (
                            <p key={i} className="pl-7 text-sm text-muted-foreground">{stop}</p>
                        ))}
                        <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 mt-0.5 text-red-500" />
                            <p className="font-medium">{bookingDetails.dropoff}</p>
                        </div>
                    </div>
                    <Separator />
                     <div className="flex justify-between items-center">
                        <p className="text-sm font-medium">Prix estimé</p>
                        <p className="font-bold text-xl">{tier.minimumPrice.toFixed(2)}€</p>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-lg mb-4">Paiement</h3>
                    <RadioGroup value={paymentMethod} onValueChange={(val: PaymentMethod) => setPaymentMethod(val)} className="grid gap-4">
                        <Label>
                            <Card className={cn("has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary cursor-pointer transition-all", paymentMethod !== 'Carte' && "text-muted-foreground")}>
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div className="flex items-center gap-4">
                                <CreditCard className="h-6 w-6" />
                                <span className="font-semibold">Payer par carte</span>
                                </div>
                                <RadioGroupItem value="Carte" id="card" />
                            </CardHeader>
                            {paymentMethod === 'Carte' && (
                                <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="card-number">Numéro de carte</Label>
                                    <Input id="card-number" placeholder="0000 0000 0000 0000" />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                    <Label htmlFor="expiry">Expiration</Label>
                                    <Input id="expiry" placeholder="MM/AA" />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                    <Label htmlFor="cvc">CVC</Label>
                                    <Input id="cvc" placeholder="123" />
                                    </div>
                                </div>
                                </CardContent>
                            )}
                            </Card>
                        </Label>
                        <Label>
                            <Card className={cn("has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary cursor-pointer transition-all", paymentMethod !== 'Espèces' && "text-muted-foreground")}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="flex items-center gap-4">
                                <Landmark className="h-6 w-6" />
                                <span className="font-semibold">Payer en espèces</span>
                                </div>
                                <RadioGroupItem value="Espèces" id="cash" />
                            </CardHeader>
                            </Card>
                        </Label>
                    </RadioGroup>
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full text-lg" size="lg" onClick={handleConfirmBooking} disabled={isSubmitting}>
                    {isSubmitting ? 'Confirmation en cours...' : 'Confirmer et Réserver'}
                </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

export default function PaymentPage() {
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <PaymentComponent />
        </Suspense>
    );
}
