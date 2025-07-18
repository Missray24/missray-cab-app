
'use client';

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { MoreHorizontal, FileText, CheckCircle, XCircle, AlertCircle, CalendarIcon } from "lucide-react";
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from "firebase/firestore";
import { format } from "date-fns";

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
  DialogTrigger,
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
import type { User, DocumentStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { IntlTelInput, type IntlTelInputRef } from "@/components/ui/intl-tel-input";
import { sendEmail } from "@/ai/flows/send-email-flow";

const initialFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: {
    name: '',
    address: '',
    siret: '',
    vatNumber: '',
    isVatSubjected: false,
    evtcAdsNumber: '',
    commission: '',
  },
};

type ModalState = {
  mode: 'add' | 'edit';
  driver: User | null;
  isOpen: boolean;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingDriver, setViewingDriver] = useState<User | null>(null);
  const [modalState, setModalState] = useState<ModalState>({ mode: 'add', driver: null, isOpen: false });
  const [editFormData, setEditFormData] = useState<any>(initialFormState);
  const { toast } = useToast();
  const phoneInputRef = useRef<IntlTelInputRef>(null);

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
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger les chauffeurs." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (modalState.mode === 'edit' && modalState.driver) {
      setEditFormData({
        firstName: modalState.driver.firstName || '',
        lastName: modalState.driver.lastName || '',
        email: modalState.driver.email || '',
        phone: modalState.driver.phone || '',
        company: { ...(modalState.driver.driverProfile?.company || {}), commission: String(modalState.driver.driverProfile?.company?.commission || '') },
      });
    } else {
      setEditFormData(initialFormState);
    }
  }, [modalState]);
  
  const handleOpenModal = (mode: 'add' | 'edit', driver: User | null = null) => {
    setModalState({ mode, driver, isOpen: true });
  };
  
  const handleCloseModal = () => {
    setModalState({ ...modalState, isOpen: false });
  }

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const keys = id.split('.');
  
    if (keys.length === 2) {
      const [section, field] = keys as ['company', string];
      setEditFormData(prev => ({
        ...prev,
        [section]: { ...(prev[section] as object), [field]: value },
      }));
    } else {
      setEditFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handlePhoneChange = (number: string) => {
    setEditFormData(prev => ({
        ...prev,
        phone: number
    }));
  };
  
  const handleVatSubjectedChange = (checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      setEditFormData(prev => ({
        ...prev,
        company: { ...prev.company, isVatSubjected: checked },
      }));
    }
  };

  const handleSaveChanges = async () => {
    if (phoneInputRef.current && !phoneInputRef.current.isValidNumber()) {
      toast({ variant: 'destructive', title: "Erreur", description: "Le numéro de téléphone est invalide." });
      return;
    }

    const { firstName, lastName, email, ...restOfForm } = editFormData;
    const driverData = {
      firstName,
      lastName,
      email,
      phone: phoneInputRef.current?.getNumber() || editFormData.phone,
      driverProfile: {
        ...modalState.driver?.driverProfile,
        company: {
          ...modalState.driver?.driverProfile?.company,
          ...restOfForm.company,
          commission: parseFloat(String(restOfForm.company.commission)) || 0,
        },
      }
    };
    
    if (modalState.mode === 'edit' && modalState.driver) {
      // Update existing driver
      try {
        const driverRef = doc(db, "users", modalState.driver.id);
        await updateDoc(driverRef, driverData);
        setDrivers(prev => prev.map(d => d.id === modalState.driver!.id ? { ...d, ...driverData, name: `${driverData.firstName} ${driverData.lastName}` } as User : d));
        toast({ title: "Succès", description: "Chauffeur mis à jour." });
      } catch (error) {
        console.error("Error updating driver: ", error);
        toast({ variant: 'destructive', title: "Erreur", description: "Impossible de mettre à jour le chauffeur." });
      }
    } else {
      // Add new driver
      try {
        const fullDriverData = {
          ...driverData,
          name: `${driverData.firstName} ${driverData.lastName}`,
          role: 'driver' as const,
          status: 'Active' as const,
          joinDate: new Date().toLocaleDateString('fr-CA'),
          driverProfile: {
             ...driverData.driverProfile,
             vehicles: [],
             documents: [],
             totalRides: 0,
             totalEarnings: 0,
             unpaidAmount: 0,
             paymentDetails: { method: 'Bank Transfer' as const, account: '' },
          }
        };
        const docRef = await addDoc(collection(db, "users"), fullDriverData);
        setDrivers(prev => [...prev, { id: docRef.id, ...fullDriverData }]);
        toast({ title: "Succès", description: "Chauffeur ajouté." });
      } catch (error) {
        console.error("Error adding driver: ", error);
        toast({ variant: 'destructive', title: "Erreur", description: "Impossible d'ajouter le chauffeur." });
      }
    }
    handleCloseModal();
  };
  
  const handleApproveDriver = async (driverToApprove: User) => {
    try {
        const driverRef = doc(db, "users", driverToApprove.id);
        await updateDoc(driverRef, { status: 'Active' });

        await sendEmail({
            type: 'new_driver_welcome',
            to: { email: driverToApprove.email, name: driverToApprove.name },
            params: { driverName: driverToApprove.name },
        });

        setDrivers(prev => prev.map(d => d.id === driverToApprove.id ? { ...d, status: 'Active' } : d));
        toast({ title: "Chauffeur Approuvé!", description: `${driverToApprove.name} est maintenant actif et a été notifié.` });
    } catch (error) {
        console.error("Error approving driver:", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible d'approuver le chauffeur." });
    }
  };

  const handleStatusToggle = async (driverToToggle: User) => {
    const newStatus = driverToToggle.status === 'Active' ? 'Suspended' : 'Active';
    try {
      const driverRef = doc(db, "users", driverToToggle.id);
      await updateDoc(driverRef, { status: newStatus });
      setDrivers(prev => prev.map(d => d.id === driverToToggle.id ? { ...d, status: newStatus } : d));
      toast({ title: "Succès", description: "Statut du chauffeur mis à jour." });
    } catch (error) {
      console.error("Error toggling driver status: ", error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de changer le statut." });
    }
  };
  
  const handleDocumentStatusChange = async (driverId: string, docIndex: number, newStatus: DocumentStatus) => {
     const driverToUpdate = drivers.find(d => d.id === driverId);
    if (!driverToUpdate || !driverToUpdate.driverProfile) return;
    
    const newDocuments = [...(driverToUpdate.driverProfile.documents || [])];
    newDocuments[docIndex] = { ...newDocuments[docIndex], status: newStatus };
    
    try {
        const driverRef = doc(db, "users", driverId);
        await updateDoc(driverRef, { "driverProfile.documents": newDocuments });

        const updatedDriver = { ...driverToUpdate, driverProfile: { ...driverToUpdate.driverProfile, documents: newDocuments }};
        setDrivers(drivers.map(d => d.id === driverId ? updatedDriver : d));
        if (viewingDriver && viewingDriver.id === driverId) {
            setViewingDriver(updatedDriver);
        }
        toast({ title: "Succès", description: "Statut du document mis à jour." });
    } catch (error) {
        console.error("Error updating document status: ", error);
        toast({ variant: 'destructive', title: "Erreur", description: "Impossible de mettre à jour le document." });
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader title="Chauffeurs">
          <Button onClick={() => handleOpenModal('add')}>Add Driver</Button>
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
                  <TableHead>Véhicule Principal</TableHead>
                  <TableHead>Immatriculation</TableHead>
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
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>{driver.driverProfile?.vehicles?.[0]?.brand} {driver.driverProfile?.vehicles?.[0]?.model}</TableCell>
                      <TableCell>{driver.driverProfile?.vehicles?.[0]?.licensePlate}</TableCell>
                      <TableCell>
                        <Badge variant={
                            driver.status === 'Active' ? 'secondary' 
                            : driver.status === 'Pending' ? 'default'
                            : 'destructive'}
                            className={cn(driver.status === 'Pending' && 'bg-yellow-500 text-white')}
                        >
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
                             {driver.status === 'Pending' && (
                                <DropdownMenuItem onSelect={() => handleApproveDriver(driver)}>
                                    Approuver le profil
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={() => setViewingDriver(driver)}>
                              View Documents
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleOpenModal('edit', driver)}>
                              Edit
                            </DropdownMenuItem>
                             {driver.status !== 'Pending' && (
                                <DropdownMenuItem onSelect={() => handleStatusToggle(driver)}>
                                {driver.status === 'Active' ? 'Suspend' : 'Reactivate'}
                                </DropdownMenuItem>
                            )}
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Documents for {viewingDriver?.name}</DialogTitle>
            <DialogDescription>
              Review the uploaded documents for this driver.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-h-[70vh] overflow-y-auto">
            {viewingDriver?.driverProfile?.documents?.map((doc, index) => (
              <Card key={index} className="flex flex-col">
                 <CardHeader>
                   <div className="flex items-start justify-between">
                     <div className="flex items-center gap-4">
                       <FileText className="h-6 w-6 text-primary" />
                       <CardTitle className="text-lg">{doc.name}</CardTitle>
                     </div>
                     <Badge
                       className={cn("capitalize items-center text-xs", {
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
                   {doc.expirationDate && (
                       <div className="text-xs text-muted-foreground flex items-center gap-2 pt-2">
                           <CalendarIcon className="h-4 w-4" />
                           <span>Expire le: {format(new Date(doc.expirationDate), 'dd/MM/yyyy')}</span>
                       </div>
                   )}
                 </CardHeader>
                <CardContent className="flex-grow space-y-2">
                    <div className={cn("grid gap-2", doc.urlVerso ? "grid-cols-2" : "grid-cols-1")}>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="aspect-[4/3] w-full rounded-md overflow-hidden border">
                            <Image
                            src={doc.url}
                            alt={`${doc.name} (Recto)`}
                            data-ai-hint="official document"
                            width={400}
                            height={300}
                            className="h-full w-full object-cover"
                            />
                        </a>
                        {doc.urlVerso && (
                            <a href={doc.urlVerso} target="_blank" rel="noopener noreferrer" className="aspect-[4/3] w-full rounded-md overflow-hidden border">
                                <Image
                                    src={doc.urlVerso}
                                    alt={`${doc.name} (Verso)`}
                                    data-ai-hint="official document"
                                    width={400}
                                    height={300}
                                    className="h-full w-full object-cover"
                                />
                            </a>
                        )}
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
            {(!viewingDriver?.driverProfile?.documents || viewingDriver.driverProfile.documents.length === 0) && (
              <p className="text-muted-foreground text-center col-span-full">No documents uploaded.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={modalState.isOpen} onOpenChange={(isOpen) => !isOpen && handleCloseModal()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{modalState.mode === 'edit' ? `Edit Driver: ${modalState.driver?.name}` : 'Add New Driver'}</DialogTitle>
            <DialogDescription>
              Update the driver's details below.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">Informations personnelles</TabsTrigger>
              <TabsTrigger value="company">Informations entreprise</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="pt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input id="firstName" value={editFormData.firstName} onChange={handleEditFormChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input id="lastName" value={editFormData.lastName} onChange={handleEditFormChange} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={editFormData.email} onChange={handleEditFormChange} />
                </div>
                <div className="space-y-2 flex flex-col">
                  <Label>Numéro de téléphone</Label>
                  <IntlTelInput
                    ref={phoneInputRef}
                    value={editFormData.phone}
                    onChange={handlePhoneChange}
                  />
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
          </Tabs>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
