
'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import { MoreHorizontal, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";

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
import { Skeleton } from "@/components/ui/skeleton";
import type { Driver, DocumentStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { db } from "@/lib/firebase";

const countryCodes = [
  { value: '+1', label: 'US (+1)' },
  { value: '+33', label: 'FR (+33)' },
  { value: '+44', label: 'UK (+44)' },
  { value: '+49', label: 'DE (+49)' },
  { value: '+212', label: 'MA (+212)' },
];

const initialFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: { countryCode: '+33', number: '' },
  company: {
    name: '',
    address: '',
    siret: '',
    vatNumber: '',
    isVatSubjected: false,
    evtcAdsNumber: '',
    commission: '',
  },
  vehicle: {
    brand: '',
    model: '',
    licensePlate: '',
    registrationDate: '',
  },
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingDriver, setViewingDriver] = useState<Driver | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editFormData, setEditFormData] = useState<any>(initialFormState);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "drivers"));
        const driversData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Driver[];
        setDrivers(driversData);
      } catch (error) {
        console.error("Error fetching drivers: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  useEffect(() => {
    if (editingDriver) {
      setEditFormData({
        firstName: editingDriver.firstName || '',
        lastName: editingDriver.lastName || '',
        email: editingDriver.email || '',
        phone: {
          countryCode: editingDriver.phone?.countryCode || '+33',
          number: editingDriver.phone?.number || '',
        },
        company: {
          name: editingDriver.company?.name || '',
          address: editingDriver.company?.address || '',
          siret: editingDriver.company?.siret || '',
          vatNumber: editingDriver.company?.vatNumber || '',
          isVatSubjected: editingDriver.company?.isVatSubjected || false,
          evtcAdsNumber: editingDriver.company?.evtcAdsNumber || '',
          commission: String(editingDriver.company?.commission || ''),
        },
        vehicle: {
          brand: editingDriver.vehicle?.brand || '',
          model: editingDriver.vehicle?.model || '',
          licensePlate: editingDriver.vehicle?.licensePlate || '',
          registrationDate: editingDriver.vehicle?.registrationDate || '',
        },
      });
    } else {
      setEditFormData(initialFormState);
    }
  }, [editingDriver]);

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const keys = id.split('.');
  
    if (keys.length === 2) {
      const [section, field] = keys as [keyof typeof editFormData, string];
      setEditFormData(prev => ({
        ...prev,
        [section]: {
          ...(prev[section] as object),
          [field]: value,
        },
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [id]: value,
      }));
    }
  };

  const handleCountryCodeChange = (value: string) => {
    setEditFormData(prev => ({
        ...prev,
        phone: { ...prev.phone, countryCode: value }
    }));
  }
  
  const handleVatSubjectedChange = (checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      setEditFormData(prev => ({
        ...prev,
        company: {
          ...prev.company,
          isVatSubjected: checked,
        },
      }));
    }
  };

  const handleSaveChanges = () => {
    if (!editingDriver) return;
    setDrivers(prevDrivers =>
      prevDrivers.map(driver =>
        driver.id === editingDriver.id
          ? { 
              ...driver,
              ...editFormData,
              company: {
                ...editFormData.company,
                commission: parseFloat(String(editFormData.company.commission)) || 0,
              }
            }
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
                {loading ? (
                   Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.firstName} {driver.lastName}</TableCell>
                      <TableCell>{driver.vehicle.brand} {driver.vehicle.model}</TableCell>
                      <TableCell>{driver.vehicle.licensePlate}</TableCell>
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
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewingDriver} onOpenChange={(isOpen) => !isOpen && setViewingDriver(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Documents for {viewingDriver?.firstName} {viewingDriver?.lastName}</DialogTitle>
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
                     onClick={() => viewingDriver && handleDocumentStatusChange(viewingDriver.id, index, 'Rejected')}
                     disabled={doc.status === 'Rejected'}
                   >
                     Refuser
                   </Button>
                   <Button
                     className="w-full"
                     onClick={() => viewingDriver && handleDocumentStatusChange(viewingDriver.id, index, 'Approved')}
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Driver: {editingDriver?.firstName} {editingDriver?.lastName}</DialogTitle>
            <DialogDescription>
              Update the driver's details below.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Informations personnelles</TabsTrigger>
              <TabsTrigger value="company">Informations entreprise</TabsTrigger>
              <TabsTrigger value="vehicle">Informations véhicule</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input id="firstName" value={editFormData.firstName} onChange={handleEditFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" value={editFormData.lastName} onChange={handleEditFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={editFormData.email} onChange={handleEditFormChange} />
                </div>
                <div className="space-y-2">
                  <Label>Numéro de téléphone</Label>
                  <div className="flex gap-2">
                    <Select value={editFormData.phone.countryCode} onValueChange={handleCountryCodeChange}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Indicatif" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input id="phone.number" value={editFormData.phone.number} onChange={handleEditFormChange} className="flex-1" />
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="company" className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company.name">Nom de la société</Label>
                  <Input id="company.name" value={editFormData.company.name} onChange={handleEditFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company.address">Adresse de la société</Label>
                  <Input id="company.address" value={editFormData.company.address} onChange={handleEditFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company.siret">Numéro de SIRET</Label>
                  <Input id="company.siret" value={editFormData.company.siret} onChange={handleEditFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company.evtcAdsNumber">Numéro EVTC ou ADS</Label>
                  <Input id="company.evtcAdsNumber" value={editFormData.company.evtcAdsNumber} onChange={handleEditFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company.vatNumber">Numéro de TVA</Label>
                  <Input id="company.vatNumber" value={editFormData.company.vatNumber} onChange={handleEditFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company.commission">Commission (%)</Label>
                  <Input id="company.commission" type="number" value={editFormData.company.commission} onChange={handleEditFormChange} />
                </div>
                <div className="md:col-span-2 flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="isVatSubjected"
                    checked={editFormData.company.isVatSubjected}
                    onCheckedChange={handleVatSubjectedChange}
                  />
                  <Label htmlFor="isVatSubjected" className="font-normal">
                    Assujetti à la TVA
                  </Label>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="vehicle" className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle.brand">Marque</Label>
                  <Input id="vehicle.brand" value={editFormData.vehicle.brand} onChange={handleEditFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle.model">Modèle</Label>
                  <Input id="vehicle.model" value={editFormData.vehicle.model} onChange={handleEditFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle.licensePlate">Immatriculation</Label>
                  <Input id="vehicle.licensePlate" value={editFormData.vehicle.licensePlate} onChange={handleEditFormChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle.registrationDate">Première date d'immatriculation</Label>
                  <Input id="vehicle.registrationDate" type="date" value={editFormData.vehicle.registrationDate} onChange={handleEditFormChange} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setEditingDriver(null)}>Cancel</Button>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
