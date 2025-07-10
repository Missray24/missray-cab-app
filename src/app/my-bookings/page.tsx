
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

import { LandingHeader } from '@/components/landing-header';
import { LandingFooter } from '@/components/landing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { db, auth } from '@/lib/firebase';
import type { Reservation } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';

function MyBookingsComponent() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        setLoading(true);
        try {
          const usersRef = collection(db, "users");
          const userQuery = query(usersRef, where("uid", "==", currentUser.uid));
          const userSnapshot = await getDocs(userQuery);

          if (!userSnapshot.empty) {
            const clientDocId = userSnapshot.docs[0].id;
            
            const reservationsRef = collection(db, "reservations");
            // Query without server-side ordering to avoid needing a composite index
            const q = query(
              reservationsRef, 
              where("clientId", "==", clientDocId)
            );
            const querySnapshot = await getDocs(q);
            
            let userReservations = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            })) as Reservation[];
            
            // Sort the reservations on the client-side
            userReservations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setReservations(userReservations);
          }
        } catch (error) {
          console.error("Error fetching reservations: ", error);
        } finally {
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (loading || !user) {
    return (
        <div className="flex flex-col min-h-dvh bg-muted/40">
            <LandingHeader />
            <main className="flex-1 container py-12">
              <PageHeader title="Mes Courses" />
              <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
              </div>
            </main>
            <LandingFooter />
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-muted/40">
      <LandingHeader />
      <main className="flex-1 container py-12">
        <PageHeader title="Mes Courses" />
        {reservations.length > 0 ? (
           <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reservations.map((res) => (
              <Card key={res.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        Course du {format(new Date(res.date), "d MMMM yyyy", { locale: fr })}
                      </CardTitle>
                      <CardDescription>ID: {res.id.substring(0, 8)}...</CardDescription>
                    </div>
                    <Badge
                      variant={
                        res.status === 'Terminée' ? 'default'
                        : res.status.startsWith('Annulée') || res.status === 'No-show' ? 'destructive'
                        : 'secondary'
                      }
                      className="capitalize whitespace-nowrap"
                    >
                      {res.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm flex-grow">
                  <p><span className="font-semibold">Départ:</span> {res.pickup}</p>
                  <p><span className="font-semibold">Arrivée:</span> {res.dropoff}</p>
                  <p><span className="font-semibold">Prix:</span> {res.amount.toFixed(2)}€ ({res.paymentMethod})</p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full" variant="outline">
                    <Link href={`/book/confirmation?id=${res.id}`}>Voir les détails</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mt-8 text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">Aucune course pour le moment</h3>
            <p className="text-muted-foreground mt-2">Lorsque vous réserverez une course, elle apparaîtra ici.</p>
            <Button asChild className="mt-4">
              <Link href="/">Réserver ma première course</Link>
            </Button>
          </div>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}

export default function MyBookingsPage() {
    return (
        <Suspense fallback={<div>Chargement de vos courses...</div>}>
            <MyBookingsComponent />
        </Suspense>
    );
}
