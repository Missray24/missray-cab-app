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
                        <DropdownMenuItem>View Documents</DropdownMenuItem>
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
  );
}
