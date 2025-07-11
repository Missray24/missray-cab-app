
'use client';

import { useState, useEffect } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

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
import type { User, Reservation } from "@/lib/types";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function DriverEarningsPage() {
  const [driver, setDriver] = useState<User | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setLoading(true);
        try {
          const usersRef = collection(db, "users");
          const userQuery = query(usersRef, where("uid", "==", currentUser.uid));
          const userSnapshot = await getDocs(userQuery);

          if (!userSnapshot.empty) {
            const driverData = { id: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data() } as User;
            setDriver(driverData);

            const reservationsRef = collection(db, "reservations");
            const q = query(
              reservationsRef,
              where("driverId", "==", driverData.id),
              where("status", "==", "Terminée")
            );
            const querySnapshot = await getDocs(q);
            const reservationsData = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            })) as Reservation[];
            reservationsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setReservations(reservationsData);
          }
        } catch (error) {
          console.error("Error fetching earnings: ", error);
          toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger vos revenus." });
        } finally {
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, [toast]);

  const driverProfile = driver?.driverProfile;
  const totalEarnings = driverProfile?.totalEarnings ?? 0;
  const unpaidAmount = driverProfile?.unpaidAmount ?? 0;
  const commissionRate = driverProfile?.company?.commission ?? 20;
  const totalCommission = reservations.reduce((acc, res) => acc + (res.amount * (commissionRate / 100)), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mes Revenus" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Gains totaux (brut)</CardTitle>
            <CardDescription>Total généré avant commission.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-32" /> : <p className="text-2xl font-bold">{totalEarnings.toFixed(2)}€</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Commission totale</CardTitle>
            <CardDescription>Commission de {commissionRate}% prélevée.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold text-destructive">{totalCommission.toFixed(2)}€</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Montant à payer</CardTitle>
            <CardDescription>Votre prochain versement.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-28" /> : <p className="text-2xl font-bold text-primary">{unpaidAmount.toFixed(2)}€</p>}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Historique des courses terminées</CardTitle>
          <CardDescription>
            Retrouvez le détail de vos revenus pour chaque course effectuée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">Montant Course</TableHead>
                <TableHead className="text-right">Commission ({commissionRate}%)</TableHead>
                <TableHead className="text-right">Vos Gains</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : reservations.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        Aucune course terminée pour le moment.
                    </TableCell>
                </TableRow>
              ) : (
                reservations.map((res) => {
                  const commission = res.amount * (commissionRate / 100);
                  const netGain = res.amount - commission;

                  return (
                    <TableRow key={res.id}>
                      <TableCell>{new Date(res.date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>
                        <div className="font-medium">{res.pickup}</div>
                        <div className="text-sm text-muted-foreground">vers {res.dropoff}</div>
                      </TableCell>
                      <TableCell className="text-right">{res.amount.toFixed(2)}€</TableCell>
                      <TableCell className="text-right text-destructive">-{commission.toFixed(2)}€</TableCell>
                      <TableCell className="text-right font-medium text-primary">{netGain.toFixed(2)}€</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
