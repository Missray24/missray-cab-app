'use client';

import { useState } from 'react';
import Image from "next/image";
import { MoreHorizontal, FileText } from "lucide-react";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { drivers as initialDrivers } from "@/lib/data";
import type { Driver } from '@/lib/types';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [viewingDriver, setViewingDriver] = useState<Driver | null>(null);

  const handleStatusToggle = (driverId: string) => {
    setDrivers(prevDrivers =>
      prevDrivers.map(driver =>
        driver.id === driverId
          ? {
              ...driver,
              status: driver.status === 'Active' ? 'Suspended' : 'Active',
            }
          : driver
      )
    );
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader title="Chauffeurs">
          <Button>Add Driver</Button>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>All Drivers</CardTitle>
            <CardDescription>
              Manage driver profiles, documents, and status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.vehicle}</TableCell>
                    <TableCell>{driver.licensePlate}</TableCell>
                    <TableCell>
                      <Badge variant={driver.status === 'Active' ? 'secondary' : 'destructive'}>
                        {driver.status}
                      </Badge>
                    </TableCell>
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
                          <DropdownMenuItem onSelect={() => setViewingDriver(driver)}>
                            View Documents
                          </DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleStatusToggle(driver.id)}>
                            {driver.status === 'Active' ? 'Suspend' : 'Reactivate'}
                          </DropdownMenuItem>
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

      <Dialog open={!!viewingDriver} onOpenChange={(isOpen) => !isOpen && setViewingDriver(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Documents for {viewingDriver?.name}</DialogTitle>
            <DialogDescription>
              Review the uploaded documents for this driver.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4 grid-cols-1 sm:grid-cols-2">
            {viewingDriver?.documents.map((doc, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                  <FileText className="h-6 w-6 text-primary" />
                  <CardTitle className="text-lg">{doc.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video w-full rounded-md overflow-hidden border">
                    <Image
                      src={doc.url}
                      alt={`Image of ${doc.name}`}
                      data-ai-hint="official document"
                      width={600}
                      height={400}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            {viewingDriver?.documents.length === 0 && (
              <p className="text-muted-foreground text-center col-span-full">No documents uploaded.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
