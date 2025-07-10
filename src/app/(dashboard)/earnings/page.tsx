
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
import type { User } from "@/lib/types";
import { db } from "@/lib/firebase";

export default function DriverEarningsPage() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", "driver"));
        const querySnapshot = await getDocs(q);
        const driversData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];
        setDrivers(driversData);
      } catch (error) {
        console.error("Error fetching drivers: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);


  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Revenus Chauffeurs" />
      <Card>
        <CardHeader>
          <CardTitle>Résumé des revenus</CardTitle>
          <CardDescription>
            Consultez les revenus totaux et les montants non payés pour chaque chauffeur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chauffeur</TableHead>
                <TableHead className="text-right">Courses</TableHead>
                <TableHead className="text-right">Revenus Totaux</TableHead>
                <TableHead className="text-right">Commission (20%)</TableHead>
                <TableHead className="text-right">Montant à payer</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[50px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : (
                drivers.map((driver) => {
                  const driverProfile = driver.driverProfile;
                  if (!driverProfile) return null;
                  
                  const totalRides = driverProfile.totalRides || 0;
                  const totalEarnings = driverProfile.totalEarnings || 0;
                  const commissionRate = driverProfile.company?.commission || 20;
                  const commissionAmount = totalEarnings * (commissionRate / 100);
                  const unpaidAmount = driverProfile.unpaidAmount || 0;

                  return (
                    <TableRow key={driver.id}>
                      <TableCell>
                        <div className="font-medium">{driver.name}</div>
                        <div className="text-sm text-muted-foreground">{driver.email}</div>
                      </TableCell>
                      <TableCell className="text-right">{totalRides}</TableCell>
                      <TableCell className="text-right">{totalEarnings.toFixed(2)}€</TableCell>
                      <TableCell className="text-right">{commissionAmount.toFixed(2)}€</TableCell>
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
                            <DropdownMenuItem>Voir le détail</DropdownMenuItem>
                            <DropdownMenuItem>Générer un rapport</DropdownMenuItem>
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
