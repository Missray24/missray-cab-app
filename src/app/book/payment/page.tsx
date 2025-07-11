

'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, getDoc, query, where, getDocs, addDoc } from 'firebase/firestore';
import { Landmark, Car, MapPin, Milestone, Timer, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

import { LandingHeader } from '@/components/landing-header';
import { LandingFooter } from '@/components/landing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { db, auth } from '@/lib/firebase';
import type { ServiceTier, PaymentMethod, ReservationOption, SelectedOption } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY } from '@/lib/config';
import { createPaymentIntent } from '@/ai/flows/create-payment-intent-flow';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { calculatePrice } from '@/lib/pricing';
import { sendEmail } from '@/ai/flows/send-email-flow';

const stripePromise = NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? loadStripe(NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) : null;

interface CheckoutFormProps {
  onPaymentSuccess: (reservationId: string) => void;
  bookingDetails: NonNullable<ReturnType<typeof useBookingDetails>>;
  tier: ServiceTier;
  user: User;
  finalPrice: number;
}

function CheckoutForm({ onPaymentSuccess, bookingDetails, tier, user, finalPrice }: CheckoutFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Carte');

    const handleConfirmBooking = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!bookingDetails || !tier || !user) return;
        setIsSubmitting(true);

        const createReservationInDb = async (stripePaymentId?: string) => {
             try {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("uid", "==", user.uid));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) throw new Error("Client details not found.");
                const clientDoc = querySnapshot.docs[0];
                const clientData = clientDoc.data();

                const reservationDate = bookingDetails.scheduledTime || new Date();

                const reservationData = {
                    clientId: clientDoc.id,
                    clientName: clientData.name,
                    driverId: '',
                    driverName: 'Non assigné',
                    date: reservationDate.toISOString(),
                    pickup: bookingDetails.pickup,
                    dropoff: bookingDetails.dropoff,
                    stops: bookingDetails.stops,
                    status: 'Nouvelle demande' as const,
                    statusHistory: [{ status: 'Nouvelle demande' as const, timestamp: new Date().toLocaleString('fr-FR') }],
                    amount: finalPrice,
                    driverPayout: finalPrice * 0.8, // Assuming 20% commission
                    paymentMethod,
                    serviceTierId: tier.id,
                    stripePaymentId: stripePaymentId || null,
                    passengers: bookingDetails.passengers,
                    suitcases: bookingDetails.suitcases,
                    backpacks: bookingDetails.backpacks,
                    options: bookingDetails.options,
                };

                const docRef = await addDoc(collection(db, "reservations"), reservationData);
                
                // Send confirmation email
                await sendEmail({
                    type: 'new_reservation_client',
                    to: { email: clientData.email, name: clientData.name },
                    params: {
                        reservationId: docRef.id.substring(0, 8).toUpperCase(),
                        clientName: clientData.name,
                        date: format(reservationDate, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr }),
                        pickup: reservationData.pickup,
                        dropoff: reservationData.dropoff,
                        amount: reservationData.amount,
                        paymentMethod: reservationData.paymentMethod,
                        tierName: tier.name,
                        passengers: tier.capacity.passengers,
                        suitcases: tier.capacity.suitcases,
                    },
                });

                toast({ title: 'Réservation confirmée!', description: 'Votre course a été enregistrée.' });
                onPaymentSuccess(docRef.id);
            } catch (err) {
                console.error("Error creating reservation: ", err);
                toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de créer la réservation en base de données.' });
                setIsSubmitting(false);
            }
        };

        if (paymentMethod === 'Carte') {
            if (!stripe || !elements) return;

            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                redirect: 'if_required',
            });

            if (error) {
                toast({ variant: 'destructive', title: 'Erreur de paiement', description: error.message || 'Une erreur est survenue.' });
                setIsSubmitting(false);
            } else {
                await createReservationInDb(paymentIntent.id); 
            }
        } else { // Cash payment
            await createReservationInDb();
        }
    };
    
    return (
        <form onSubmit={handleConfirmBooking} className="space-y-6">
            <div>
                <h3 className="font-semibold text-lg mb-4">Paiement</h3>
                <RadioGroup value={paymentMethod} onValueChange={(val: PaymentMethod) => setPaymentMethod(val)} className="grid gap-4">
                     <Label>
                        <Card className={cn("has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary cursor-pointer transition-all", paymentMethod !== 'Carte' && "text-muted-foreground")}>
                           <CardHeader className="flex flex-row items-center justify-between">
                               <div className="flex items-center gap-4"><Landmark className="h-6 w-6" /> <span className="font-semibold">Payer par carte</span></div>
                               <RadioGroupItem value="Carte" id="card" />
                           </CardHeader>
                            {paymentMethod === 'Carte' && stripePromise && (
                                <CardContent>
                                    <PaymentElement />
                                </CardContent>
                            )}
                        </Card>
                    </Label>
                    <Label>
                        <Card className={cn("has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary cursor-pointer transition-all", paymentMethod !== 'Espèces' && "text-muted-foreground")}>
                           <CardHeader className="flex flex-row items-center justify-between">
                               <div className="flex items-center gap-4"><Landmark className="h-6 w-6" /> <span className="font-semibold">Payer en espèces</span></div>
                               <RadioGroupItem value="Espèces" id="cash" />
                           </CardHeader>
                        </Card>
                    </Label>
                </RadioGroup>
            </div>
            <Button type="submit" className="w-full text-lg" size="lg" disabled={isSubmitting || (paymentMethod === 'Carte' && !stripe)}>
                {isSubmitting ? 'Confirmation en cours...' : 'Confirmer et Réserver'}
            </Button>
        </form>
    )
}

const useBookingDetails = () => {
    return useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        const pickup = params.get('pickup');
        const dropoff = params.get('dropoff');
        const stops = params.getAll('stop');
        const scheduledTime = params.get('scheduledTime');
        const tierId = params.get('tierId');
        const distance = params.get('distance');
        const duration = params.get('duration');
        const passengers = params.get('passengers');
        const suitcases = params.get('suitcases');
        const backpacks = params.get('backpacks');
        const optionsParam = params.get('options');
        const options = optionsParam ? JSON.parse(optionsParam) as SelectedOption[] : [];

        if (!pickup || !dropoff || !tierId) return null;

        return { 
            pickup, 
            dropoff, 
            stops, 
            scheduledTime: scheduledTime ? new Date(scheduledTime) : null, 
            tierId, 
            distance, 
            duration,
            passengers: passengers ? parseInt(passengers) : undefined,
            suitcases: suitcases ? parseInt(suitcases) : undefined,
            backpacks: backpacks ? parseInt(backpacks) : undefined,
            options,
        };
    }, []);
};

function PaymentComponent() {
  const router = useRouter();
  const { toast } = useToast();

  const [tier, setTier] = useState<ServiceTier | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState<number>(0);

  const bookingDetails = useBookingDetails();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) router.push('/login');
      else setUser(currentUser);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!bookingDetails) {
      router.replace('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const tierDocRef = doc(db, "serviceTiers", bookingDetails.tierId);
        const tierDocSnap = await getDoc(tierDocRef);
        if (tierDocSnap.exists()) {
          const tierData = { id: tierDocSnap.id, ...tierDocSnap.data() } as ServiceTier;
          setTier(tierData);

          const calculatedPrice = calculatePrice(
            tierData,
            bookingDetails.distance,
            bookingDetails.duration,
            bookingDetails.stops.length
          );
          setFinalPrice(calculatedPrice);

          const { clientSecret, error } = await createPaymentIntent({ amount: Math.round(calculatedPrice * 100), currency: 'eur' });
          if (clientSecret) {
            setClientSecret(clientSecret);
          } else {
             toast({ variant: 'destructive', title: 'Erreur de paiement', description: error || 'Impossible d\'initialiser le paiement.' });
          }
        } else {
          toast({ variant: 'destructive', title: 'Erreur', description: 'Gamme de service non trouvée.' });
          router.replace('/');
        }
      } catch (error) {
        console.error("Error fetching data: ", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [bookingDetails, router, toast]);

  if (loading || !bookingDetails || !tier || !user) {
    return (
        <div className="flex flex-col min-h-dvh bg-muted/40">
            <LandingHeader />
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-lg">
                    <Skeleton className="h-[500px] w-full" />
                </div>
            </main>
            <LandingFooter />
        </div>
    );
  }
  
  const onPaymentSuccess = (reservationId: string) => {
    router.push(`/book/confirmation?id=${reservationId}`);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-muted/40">
      <LandingHeader />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold tracking-tighter font-headline">Finalisez votre réservation</CardTitle>
                    <CardDescription>Confirmez les détails et choisissez votre méthode de paiement.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="border rounded-lg p-4 space-y-4">
                        <h3 className="font-semibold text-lg">Résumé de la course</h3>
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                {bookingDetails.distance && (
                                    <div className="flex items-center gap-3">
                                        <Milestone className="h-4 w-4 text-muted-foreground" />
                                        <p>{bookingDetails.distance}</p>
                                    </div>
                                )}
                                {bookingDetails.duration && (
                                    <div className="flex items-center gap-3">
                                        <Timer className="h-4 w-4 text-muted-foreground" />
                                        <p>{bookingDetails.duration}</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <p>{tier.name}</p>
                            </div>
                            {bookingDetails.scheduledTime && (
                                <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <p>{format(bookingDetails.scheduledTime, "EEEE d MMMM yyyy", { locale: fr })}</p>
                                <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                                <p>{format(bookingDetails.scheduledTime, "HH:mm", { locale: fr })}</p>
                            </div>
                            )}
                            <Separator />
                            <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 mt-0.5 text-green-500" />
                                <p className="font-medium">{bookingDetails.pickup}</p>
                            </div>
                            {bookingDetails.stops.map((stop, i) => (
                                <div key={i} className="flex items-center gap-3 pl-1">
                                    <div className="flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground text-xs font-bold">{i + 1}</div>
                                    <p className="text-sm text-muted-foreground">{stop}</p>
                                </div>
                            ))}
                            <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                                <p className="font-medium">{bookingDetails.dropoff}</p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-medium">Prix estimé</p>
                            <p className="font-bold text-xl">{finalPrice.toFixed(2)}€</p>
                        </div>
                    </div>
                    {stripePromise && clientSecret ? (
                        <Elements stripe={stripePromise} options={{ clientSecret, locale: 'fr' }}>
                            <CheckoutForm 
                                onPaymentSuccess={onPaymentSuccess} 
                                bookingDetails={bookingDetails} 
                                tier={tier} 
                                user={user}
                                finalPrice={finalPrice}
                            />
                        </Elements>
                    ) : (
                         <div className="text-center text-muted-foreground">Chargement du module de paiement...</div>
                    )}
                </CardContent>
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
