
'use client';

import { useState, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import { collection, getDocs, query, where, getDocs as getFirestoreDocs, orderBy, limit } from "firebase/firestore";

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
import type { User, Reservation } from "@/lib/types";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { generateCommissionInvoice } from "@/ai/flows/generate-commission-invoice-flow";

export default function DriverEarningsPage() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

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

  const handleGenerateReport = async (driverId: string) => {
    setIsGenerating(driverId);
    try {
      // For now, let's generate a commission invoice for the driver's *last completed* ride.
      const reservationsRef = collection(db, "reservations");
      const q = query(
        reservationsRef,
        where("driverId", "==", driverId),
        where("status", "==", "Terminée"),
        orderBy("date", "desc"),
        limit(1)
      );

      const reservationSnapshot = await getFirestoreDocs(q);
      if (reservationSnapshot.empty) {
        toast({
          variant: 'destructive',
          title: "Aucune course terminée",
          description: "Ce chauffeur n'a pas encore de course terminée pour générer une facture de commission."
        });
        return;
      }
      
      const reservationId = reservationSnapshot.docs[0].id;

      const { pdfBase64, error } = await generateCommissionInvoice({ driverId, reservationId });

      if (error || !pdfBase64) {
        throw new Error(error || 'La génération de la facture de commission a échoué.');
      }
      
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${pdfBase64}`;
      link.download = `facture-commission-COMM-${reservationId.substring(0, 6).toUpperCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Succès", description: "La facture de commission a été téléchargée." });

    } catch (e: any) {
      console.error('Commission invoice generation failed:', e);
      toast({ variant: 'destructive', title: 'Erreur', description: e.message || "Impossible de générer le rapport." });
    } finally {
      setIsGenerating(null);
    }
  };


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
                            <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isGenerating === driver.id}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>Voir le détail</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleGenerateReport(driver.id)}>
                                {isGenerating === driver.id ? "Génération..." : "Générer un rapport"}
                            </DropdownMenuItem>
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
