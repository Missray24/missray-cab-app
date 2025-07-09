'use client';

import { useState } from 'react';
import { MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { reservations as initialReservations } from "@/lib/data";
import { reservationStatuses, type Reservation, type ReservationStatus } from '@/lib/types';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);

  const handleStatusChange = (reservationId: string, newStatus: ReservationStatus) => {
    setReservations(prevReservations =>
      prevReservations.map(res =>
        res.id === reservationId ? { ...res, status: newStatus } : res
      )
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Réservations">
        <Button>Add Reservation</Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>All Reservations</CardTitle>
          <CardDescription>
            Manage all customer reservations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-medium">{reservation.id}</TableCell>
                  <TableCell>{reservation.clientName}</TableCell>
                  <TableCell>{reservation.driverName}</TableCell>
                  <TableCell>
                     <Badge
                      variant={
                        reservation.status === 'Terminée'
                          ? 'default'
                          : reservation.status.startsWith('Annulée') || reservation.status === 'No-show'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="capitalize"
                    >
                      {reservation.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{reservation.date}</TableCell>
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
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Changer le statut</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup
                              value={reservation.status}
                              onValueChange={(value) => handleStatusChange(reservation.id, value as ReservationStatus)}
                            >
                              {reservationStatuses.map((status) => (
                                <DropdownMenuRadioItem key={status} value={status}>
                                  {status}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
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
