
'use client';

import { useState, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import { collection, getDocs, query, where, doc, updateDoc, writeBatch } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { User } from "@/lib/types";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function PayoutsPage() {
  const [driversWithPendingPayouts, setDriversWithPendingPayouts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "driver"), where("driverProfile.unpaidAmount", ">", 0));
      const querySnapshot = await getDocs(q);
      const driversData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setDriversWithPendingPayouts(driversData);
    } catch (error) {
      console.error("Error fetching drivers for payouts: ", error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger les paiements en attente." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleMarkAsPaid = async (driverId: string) => {
    try {
      const driverRef = doc(db, "users", driverId);
      await updateDoc(driverRef, { "driverProfile.unpaidAmount": 0 });
      setDriversWithPendingPayouts(prev => prev.filter(d => d.id !== driverId));
      toast({ title: "Succès", description: "Le chauffeur a été marqué comme payé." });
    } catch (error) {
      console.error("Error marking driver as paid: ", error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de mettre à jour le statut du paiement." });
    }
  };

  const handleBulkPayout = async () => {
    const batch = writeBatch(db);
    driversWithPendingPayouts.forEach(driver => {
      const driverRef = doc(db, "users", driver.id);
      batch.update(driverRef, { "driverProfile.unpaidAmount": 0 });
    });

    try {
      await batch.commit();
      setDriversWithPendingPayouts([]);
      toast({ title: "Succès", description: "Tous les chauffeurs ont été marqués comme payés." });
    } catch (error) {
      console.error("Error with bulk payout: ", error);
      toast({ variant: 'destructive', title: "Erreur", description: "Le paiement groupé a échoué." });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Paiements Chauffeurs">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={driversWithPendingPayouts.length === 0}>Lancer un paiement groupé</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer le paiement groupé?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action marquera les {driversWithPendingPayouts.length} chauffeurs comme payés.
                Ceci mettra leur solde "Montant à payer" à 0. Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkPayout}>Confirmer & Payer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Paiements en attente</CardTitle>
          <CardDescription>
            Gérez et exécutez les paiements pour les chauffeurs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Méthode de paiement</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Montant à payer</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : driversWithPendingPayouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Aucun paiement en attente.
                  </TableCell>
                </TableRow>
              ) : (
                driversWithPendingPayouts.map((driver) => {
                  const driverProfile = driver.driverProfile;
                  if (!driverProfile) return null;
                  
                  const totalEarnings = driverProfile.totalEarnings || 0;
                  const commissionRate = driverProfile.company?.commission || 20;
                  const unpaidAmount = driverProfile.unpaidAmount || 0;
                  const commissionAmount = totalEarnings * (commissionRate / 100);


                  return (
                  <TableRow key={driver.id}>
                    <TableCell>
                      <div className="font-medium">{driver.name}</div>
                      <div className="text-sm text-muted-foreground">{driver.email}</div>
                    </TableCell>
                    <TableCell>
                      <div>{driverProfile.paymentDetails.method}</div>
                      <div className="text-sm text-muted-foreground">{driverProfile.paymentDetails.account}</div>
                    </TableCell>
                    <TableCell className="text-right">{(commissionAmount - unpaidAmount).toFixed(2)}€</TableCell>
                    <TableCell className="text-right font-medium text-primary">{unpaidAmount.toFixed(2)}€</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => handleMarkAsPaid(driver.id)}>Marquer comme payé</DropdownMenuItem>
                          <DropdownMenuItem>Contacter le chauffeur</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
