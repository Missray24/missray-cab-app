
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, getDoc, query, where, getDocs, addDoc } from 'firebase/firestore';
import { CreditCard, Landmark, CheckCircle } from 'lucide-react';

import { LandingHeader } from '@/components/landing-header';
import { LandingFooter } from '@/components/landing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { db, auth } from '@/lib/firebase';
import type { ServiceTier, PaymentMethod } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

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
            <main className="flex-1 py-12 md:py-24"><div className="container"><Skeleton className="h-96 w-full" /></div></main>
            <LandingFooter />
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-muted/40">
      <LandingHeader />
      <main className="flex-1 py-12 md:py-24">
        <div className="container grid md:grid-cols-2 gap-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter font-headline mb-2">Finalisez votre réservation</h1>
            <p className="text-muted-foreground mb-6">Confirmez les détails et choisissez votre méthode de paiement.</p>
            <Card>
              <CardHeader>
                <CardTitle>Résumé de la course</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Gamme</p>
                  <p className="font-semibold">{tier.name}</p>
                </div>
                <Separator />
                <div>
                  <p className="font-medium text-muted-foreground">Départ</p>
                  <p className="font-semibold">{bookingDetails.pickup}</p>
                </div>
                {bookingDetails.stops.map((stop, i) => <p key={i} className="pl-4 text-muted-foreground">{stop}</p>)}
                <div>
                  <p className="font-medium text-muted-foreground">Arrivée</p>
                  <p className="font-semibold">{bookingDetails.dropoff}</p>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-lg">
                    <p className="font-semibold">Prix estimé</p>
                    <p className="font-bold">{tier.minimumPrice.toFixed(2)}€</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-4">Paiement</h2>
            <RadioGroup value={paymentMethod} onValueChange={(val: PaymentMethod) => setPaymentMethod(val)} className="grid gap-4">
              <Label>
                <Card className="has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CreditCard className="h-6 w-6" />
                      <CardTitle>Payer par carte</CardTitle>
                    </div>
                    <RadioGroupItem value="Carte" id="card" />
                  </CardHeader>
                  {paymentMethod === 'Carte' && (
                    <CardContent className="space-y-4 pt-0">
                      <div className="space-y-2">
                        <Label htmlFor="card-number">Numéro de carte</Label>
                        <Input id="card-number" placeholder="0000 0000 0000 0000" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Expiration</Label>
                          <Input id="expiry" placeholder="MM/AA" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvc">CVC</Label>
                          <Input id="cvc" placeholder="123" />
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </Label>
              <Label>
                <Card className="has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Landmark className="h-6 w-6" />
                      <CardTitle>Payer en espèces</CardTitle>
                    </div>
                    <RadioGroupItem value="Espèces" id="cash" />
                  </CardHeader>
                </Card>
              </Label>
            </RadioGroup>
            <Button className="w-full mt-6 text-lg" size="lg" onClick={handleConfirmBooking} disabled={isSubmitting}>
              {isSubmitting ? 'Confirmation en cours...' : 'Confirmer et Réserver'}
            </Button>
          </div>
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
