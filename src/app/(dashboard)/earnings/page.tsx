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

export default function DriverEarningsPage() {
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
              {drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell>
                    <div className="font-medium">{driver.name}</div>
                    <div className="text-sm text-muted-foreground">{driver.email}</div>
                  </TableCell>
                  <TableCell className="text-right">{driver.totalRides}</TableCell>
                  <TableCell className="text-right">${driver.totalEarnings.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${(driver.totalEarnings * 0.2).toFixed(2)}</TableCell>
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
                        <DropdownMenuItem>Voir le détail</DropdownMenuItem>
                        <DropdownMenuItem>Générer un rapport</DropdownMenuItem>
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
