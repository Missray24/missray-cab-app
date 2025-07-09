import { MoreHorizontal } from "lucide-react";

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
import { drivers } from "@/lib/data";

export default function PayoutsPage() {
  const driversWithPendingPayouts = drivers.filter(d => d.unpaidAmount > 0);

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
                <TableHead className="text-right">Montant à payer</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driversWithPendingPayouts.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell>
                     <div className="font-medium">{driver.name}</div>
                    <div className="text-sm text-muted-foreground">{driver.email}</div>
                  </TableCell>
                  <TableCell>
                    <div>{driver.paymentDetails.method}</div>
                    <div className="text-sm text-muted-foreground">{driver.paymentDetails.account}</div>
                  </TableCell>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
