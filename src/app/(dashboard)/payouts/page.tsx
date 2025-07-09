
'use client';

import { useState, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";

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
import type { Driver } from "@/lib/types";
import { db } from "@/lib/firebase";

export default function PayoutsPage() {
  const [driversWithPendingPayouts, setDriversWithPendingPayouts] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const driversRef = collection(db, "drivers");
        const q = query(driversRef, where("unpaidAmount", ">", 0));
        const querySnapshot = await getDocs(q);
        const driversData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Driver[];
        setDriversWithPendingPayouts(driversData);
      } catch (error) {
        console.error("Error fetching drivers for payouts: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Paiements Chauffeurs">
        <Button>Lancer un paiement groupé</Button>
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
              ) : (
                driversWithPendingPayouts.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell>
                      <div className="font-medium">{driver.firstName} {driver.lastName}</div>
                      <div className="text-sm text-muted-foreground">{driver.email}</div>
                    </TableCell>
                    <TableCell>
                      <div>{driver.paymentDetails.method}</div>
                      <div className="text-sm text-muted-foreground">{driver.paymentDetails.account}</div>
                    </TableCell>
                    <TableCell className="text-right">${(driver.totalEarnings * (driver.company?.commission || 20) / 100 - driver.unpaidAmount).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium text-primary">${driver.unpaidAmount.toFixed(2)}</TableCell>
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
                          <DropdownMenuItem>Marquer comme payé</DropdownMenuItem>
                          <DropdownMenuItem>Contacter le chauffeur</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
