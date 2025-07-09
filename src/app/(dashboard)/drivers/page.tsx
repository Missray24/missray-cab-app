'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import { MoreHorizontal, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { drivers as initialDrivers } from "@/lib/data";
import type { Driver, DocumentStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [viewingDriver, setViewingDriver] = useState<Driver | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', vehicle: '', licensePlate: '' });

  useEffect(() => {
    if (editingDriver) {
      setEditFormData({
        name: editingDriver.name,
        vehicle: editingDriver.vehicle,
        licensePlate: editingDriver.licensePlate,
      });
    }
  }, [editingDriver]);

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveChanges = () => {
    if (!editingDriver) return;
    setDrivers(prevDrivers =>
      prevDrivers.map(driver =>
        driver.id === editingDriver.id
          ? { ...driver, ...editFormData }
          : driver
      )
    );
    setEditingDriver(null);
  };

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
  
  const handleDocumentStatusChange = (driverId: string, docIndex: number, newStatus: DocumentStatus) => {
    const newDrivers = drivers.map(driver => {
      if (driver.id === driverId) {
        const newDocuments = [...driver.documents];
        newDocuments[docIndex] = { ...newDocuments[docIndex], status: newStatus };
        const updatedDriver = { ...driver, documents: newDocuments };
        if (viewingDriver && viewingDriver.id === driverId) {
          setViewingDriver(updatedDriver);
        }
        return updatedDriver;
      }
      return driver;
    });
    setDrivers(newDrivers);
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
                          <DropdownMenuItem onSelect={() => setEditingDriver(driver)}>
                            Edit
                          </DropdownMenuItem>
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
              <Card key={index} className="flex flex-col">
                 <CardHeader>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                       <FileText className="h-6 w-6 text-primary" />
                       <CardTitle className="text-lg">{doc.name}</CardTitle>
                     </div>
                     <Badge
                       className={cn("capitalize items-center", {
                         "bg-green-100 text-green-800 border-green-200 hover:bg-green-100/80": doc.status === 'Approved',
                         "bg-red-100 text-red-800 border-red-200 hover:bg-red-100/80": doc.status === 'Rejected',
                         "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100/80": doc.status === 'Pending',
                       })}
                     >
                       {doc.status === 'Approved' && <CheckCircle className="mr-1 h-3 w-3" />}
                       {doc.status === 'Rejected' && <XCircle className="mr-1 h-3 w-3" />}
                       {doc.status === 'Pending' && <AlertCircle className="mr-1 h-3 w-3" />}
                       {doc.status}
                     </Badge>
                   </div>
                 </CardHeader>
                <CardContent className="flex-grow">
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
                 <CardFooter className="gap-2">
                   <Button
                     variant="outline"
                     className="w-full"
                     onClick={() => handleDocumentStatusChange(viewingDriver.id, index, 'Rejected')}
                     disabled={doc.status === 'Rejected'}
                   >
                     Refuser
                   </Button>
                   <Button
                     className="w-full"
                     onClick={() => handleDocumentStatusChange(viewingDriver.id, index, 'Approved')}
                     disabled={doc.status === 'Approved'}
                   >
                     Approuver
                   </Button>
                 </CardFooter>
              </Card>
            ))}
            {viewingDriver?.documents.length === 0 && (
              <p className="text-muted-foreground text-center col-span-full">No documents uploaded.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!editingDriver} onOpenChange={(isOpen) => !isOpen && setEditingDriver(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Driver: {editingDriver?.name}</DialogTitle>
            <DialogDescription>
              Update the driver's details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={editFormData.name}
                onChange={handleEditFormChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vehicle" className="text-right">
                Vehicle
              </Label>
              <Input
                id="vehicle"
                value={editFormData.vehicle}
                onChange={handleEditFormChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="licensePlate" className="text-right">
                License Plate
              </Label>
              <Input
                id="licensePlate"
                value={editFormData.licensePlate}
                onChange={handleEditFormChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDriver(null)}>Cancel</Button>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
