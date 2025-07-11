
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Trash2, PlusCircle, Car, FileText, Upload, Image as ImageIcon, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Image from 'next/image';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { auth, db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { type User, type Vehicle, type DriverDocument } from '@/lib/types';
import { IntlTelInput, type IntlTelInputRef } from '@/components/ui/intl-tel-input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';

const profileSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  phone: z.string().min(1, "Téléphone requis"),
  'paymentDetails.method': z.enum(['Bank Transfer', 'PayPal']),
  'paymentDetails.account': z.string().min(1, "Détail de paiement requis"),
});

const vehicleSchema = z.object({
    brand: z.string().min(1, "Marque requise"),
    model: z.string().min(1, "Modèle requis"),
    licensePlate: z.string().min(1, "Immatriculation requise"),
    registrationDate: z.string().min(1, "Date requise"),
});

const documentSchema = z.object({
  name: z.string().min(1, "Nom du document requis"),
  type: z.string().min(1, "Type de document requis"),
  file: z.instanceof(File).refine(file => file.size > 0, 'Un fichier est requis.'),
});


export default function DriverSettingsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const phoneInputRef = useRef<IntlTelInputRef>(null);

  // Profile Form
  const { control, register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '', lastName: '', phone: '', 'paymentDetails.method': 'Bank Transfer' as const, 'paymentDetails.account': '',
    }
  });

  // Vehicles
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const { register: registerVehicle, handleSubmit: handleSubmitVehicle, reset: resetVehicle, formState: { errors: vehicleErrors } } = useForm<z.infer<typeof vehicleSchema>>({ resolver: zodResolver(vehicleSchema) });

  // Documents
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const { register: registerDoc, handleSubmit: handleSubmitDoc, reset: resetDoc, watch: watchDoc, formState: { errors: docErrors } } = useForm<z.infer<typeof documentSchema>>({ resolver: zodResolver(documentSchema) });
  const docFile = watchDoc("file");


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setLoading(true);
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("uid", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as User;
          setUser(userData);
          // Set form values
          reset({
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            'paymentDetails.method': userData.driverProfile?.paymentDetails?.method || 'Bank Transfer',
            'paymentDetails.account': userData.driverProfile?.paymentDetails?.account || '',
          });
          setVehicles(userData.driverProfile?.vehicles || []);
          setDocuments(userData.driverProfile?.documents || []);
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [reset]);

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    if (!user || !phoneInputRef.current?.isValidNumber()) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Numéro de téléphone invalide.' });
        return;
    }
    const updatedData = {
        firstName: data.firstName, lastName: data.lastName, name: `${data.firstName} ${data.lastName}`,
        phone: phoneInputRef.current.getNumber(),
        'driverProfile.paymentDetails': { method: data['paymentDetails.method'], account: data['paymentDetails.account'] }
    };
    await updateUserData(updatedData, 'Profil mis à jour.');
  };

  const handleVehicleSubmit = async (data: z.infer<typeof vehicleSchema>) => {
    if (!user) return;
    let updatedVehicles: Vehicle[];
    if (editingVehicle) {
        updatedVehicles = vehicles.map(v => v.id === editingVehicle.id ? { ...v, ...data } : v);
    } else {
        if (vehicles.length >= 5) {
            toast({ variant: 'destructive', title: 'Limite atteinte', description: 'Vous ne pouvez pas ajouter plus de 5 véhicules.' });
            return;
        }
        updatedVehicles = [...vehicles, { id: Date.now().toString(), ...data }];
    }
    await updateUserData({ 'driverProfile.vehicles': updatedVehicles }, 'Véhicule sauvegardé.');
    setVehicles(updatedVehicles);
    setIsVehicleModalOpen(false);
  };
  
  const handleDocumentSubmit = async (data: z.infer<typeof documentSchema>) => {
    if (!user) return;
    
    const file = data.file;
    const storageRef = ref(storage, `driver-documents/${user.uid}/${Date.now()}_${file.name}`);
    
    try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        const newDocument: DriverDocument = {
            name: data.name,
            type: data.type,
            url: downloadURL,
            status: 'Pending',
        };

        const updatedDocuments = [...documents, newDocument];
        await updateUserData({ 'driverProfile.documents': updatedDocuments }, 'Document téléversé.');
        setDocuments(updatedDocuments);
        setIsDocModalOpen(false);

    } catch (error) {
        console.error("Error uploading document:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de téléverser le document.' });
    }
  };
  
  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!user) return;
    const updatedVehicles = vehicles.filter(v => v.id !== vehicleId);
    await updateUserData({ 'driverProfile.vehicles': updatedVehicles }, 'Véhicule supprimé.');
    setVehicles(updatedVehicles);
  };
  
  const handleDeleteDocument = async (docUrl: string) => {
      // Note: This only removes the reference from Firestore. Deleting from Storage is more complex and might not be desired.
      if (!user) return;
      const updatedDocuments = documents.filter(d => d.url !== docUrl);
      await updateUserData({ 'driverProfile.documents': updatedDocuments }, 'Document supprimé.');
      setDocuments(updatedDocuments);
  };
  
  const openVehicleModal = (vehicle: Vehicle | null) => {
      setEditingVehicle(vehicle);
      resetVehicle(vehicle || { brand: '', model: '', licensePlate: '', registrationDate: '' });
      setIsVehicleModalOpen(true);
  };
  
  const updateUserData = async (dataToUpdate: object, successMessage: string) => {
      if (!user) return;
      try {
          const userRef = doc(db, "users", user.id);
          await updateDoc(userRef, dataToUpdate);
          toast({ title: 'Succès', description: successMessage });
      } catch (error) {
          console.error('Error updating profile:', error);
          toast({ variant: 'destructive', title: 'Erreur', description: 'Mise à jour échouée.' });
      }
  };

  if (loading) {
    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Paramètres" />
            <Skeleton className="h-96 w-full max-w-4xl" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Paramètres" />
      <Tabs defaultValue="profile" className="w-full max-w-4xl">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profil & Paiements</TabsTrigger>
          <TabsTrigger value="vehicles">Mes Véhicules</TabsTrigger>
          <TabsTrigger value="documents">Mes Documents</TabsTrigger>
          <TabsTrigger value="password">Mot de passe</TabsTrigger>
        </TabsList>
        
        {/* Profile Tab */}
        <TabsContent value="profile">
          <form onSubmit={handleSubmit(onProfileSubmit)}>
            <Card>
              <CardHeader><CardTitle>Profil</CardTitle><CardDescription>Gérez vos informations personnelles et de paiement.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><Label htmlFor="firstName">Prénom</Label><Input id="firstName" {...register('firstName')} /><p className="text-destructive text-xs mt-1">{errors.firstName?.message}</p></div>
                    <div><Label htmlFor="lastName">Nom</Label><Input id="lastName" {...register('lastName')} /><p className="text-destructive text-xs mt-1">{errors.lastName?.message}</p></div>
                </div>
                <div><Label>Numéro de téléphone</Label><Controller name="phone" control={control} render={({ field }) => (<IntlTelInput ref={phoneInputRef} value={field.value} onChange={field.onChange} />)} /><p className="text-destructive text-xs mt-1">{errors.phone?.message}</p></div>
                <div><Label>Email</Label><Input id="email" type="email" defaultValue={user?.email} disabled /></div>
                <div className="space-y-2 pt-2"><Label>Méthode de paiement</Label><Controller name="paymentDetails.method" control={control} render={({ field }) => (<RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4"><Label className="flex items-center gap-2 border rounded-md p-3 has-[:checked]:border-primary flex-1"><RadioGroupItem value="Bank Transfer" /> Virement Bancaire</Label><Label className="flex items-center gap-2 border rounded-md p-3 has-[:checked]:border-primary flex-1"><RadioGroupItem value="PayPal" /> PayPal</Label></RadioGroup>)} /></div>
                <div><Label htmlFor="paymentDetails.account">Détails (IBAN ou email PayPal)</Label><Input id="paymentDetails.account" {...register('paymentDetails.account')} /><p className="text-destructive text-xs mt-1">{errors['paymentDetails.account']?.message}</p></div>
              </CardContent>
              <CardFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sauvegarde...' : 'Sauvegarder les changements'}</Button></CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles">
            <Card>
                <CardHeader className="flex-row items-center justify-between"><div className="space-y-1.5"><CardTitle>Mes Véhicules</CardTitle><CardDescription>Gérez la liste de vos véhicules (max 5).</CardDescription></div><Button type="button" onClick={() => openVehicleModal(null)} disabled={vehicles.length >= 5}><PlusCircle className="mr-2" />Ajouter</Button></CardHeader>
                <CardContent className="space-y-4">
                    {vehicles.length > 0 ? vehicles.map(v => (
                        <div key={v.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-4"><Car className="h-6 w-6 text-primary" /><div className="font-medium">{v.brand} {v.model}<p className="text-sm text-muted-foreground">{v.licensePlate}</p></div></div>
                            <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => openVehicleModal(v)}>Modifier</Button><Button variant="destructive" size="sm" onClick={() => handleDeleteVehicle(v.id)}><Trash2 className="h-4 w-4" /></Button></div>
                        </div>
                    )) : <p className="text-muted-foreground text-center py-8">Aucun véhicule ajouté.</p>}
                </CardContent>
            </Card>
        </TabsContent>
        
        {/* Documents Tab */}
        <TabsContent value="documents">
            <Card>
                <CardHeader className="flex-row items-center justify-between"><div className="space-y-1.5"><CardTitle>Mes Documents</CardTitle><CardDescription>Téléversez vos documents obligatoires (VTC, etc.).</CardDescription></div><Button type="button" onClick={() => { resetDoc(); setIsDocModalOpen(true); }}><Upload className="mr-2"/>Téléverser</Button></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.length > 0 ? documents.map(doc => (
                        <Card key={doc.url} className="group">
                           <div className="aspect-video w-full rounded-t-lg overflow-hidden border-b relative">
                                <Image src={doc.url} alt={doc.name} layout="fill" objectFit="cover" data-ai-hint="official document" />
                                <div className="absolute top-2 right-2"><Badge className={cn("capitalize items-center", {"bg-green-100 text-green-800 border-green-200": doc.status === 'Approved', "bg-red-100 text-red-800 border-red-200": doc.status === 'Rejected', "bg-yellow-100 text-yellow-800 border-yellow-200": doc.status === 'Pending' })}>{doc.status === 'Approved' && <CheckCircle className="mr-1 h-3 w-3" />} {doc.status === 'Rejected' && <XCircle className="mr-1 h-3 w-3" />} {doc.status === 'Pending' && <AlertCircle className="mr-1 h-3 w-3" />} {doc.status}</Badge></div>
                           </div>
                           <CardContent className="p-4 flex items-center justify-between">
                               <div><p className="font-semibold">{doc.name}</p><p className="text-sm text-muted-foreground">{doc.type}</p></div>
                               <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => handleDeleteDocument(doc.url)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                           </CardContent>
                        </Card>
                    )) : <p className="text-muted-foreground text-center py-8 col-span-full">Aucun document téléversé.</p>}
                </CardContent>
            </Card>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader><CardTitle>Mot de passe</CardTitle><CardDescription>Changez votre mot de passe ici. Vous serez déconnecté après la modification.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="current-password">Mot de passe actuel</Label><Input id="current-password" type="password" /></div>
              <div><Label htmlFor="new-password">Nouveau mot de passe</Label><Input id="new-password" type="password" /></div>
            </CardContent>
            <CardFooter><Button>Changer le mot de passe</Button></CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Vehicle Modal */}
      <Dialog open={isVehicleModalOpen} onOpenChange={setIsVehicleModalOpen}>
        <DialogContent><form onSubmit={handleSubmitVehicle(handleVehicleSubmit)}>
          <DialogHeader><DialogTitle>{editingVehicle ? 'Modifier le véhicule' : 'Ajouter un véhicule'}</DialogTitle><DialogDescription>Remplissez les informations de votre véhicule.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
              <div><Label htmlFor="brand">Marque</Label><Input id="brand" {...registerVehicle("brand")} /><p className="text-destructive text-xs mt-1">{vehicleErrors.brand?.message}</p></div>
              <div><Label htmlFor="model">Modèle</Label><Input id="model" {...registerVehicle("model")} /><p className="text-destructive text-xs mt-1">{vehicleErrors.model?.message}</p></div>
              <div><Label htmlFor="licensePlate">Plaque d'immatriculation</Label><Input id="licensePlate" {...registerVehicle("licensePlate")} /><p className="text-destructive text-xs mt-1">{vehicleErrors.licensePlate?.message}</p></div>
              <div><Label htmlFor="registrationDate">Date de 1ère immatriculation</Label><Input id="registrationDate" type="date" {...registerVehicle("registrationDate")} /><p className="text-destructive text-xs mt-1">{vehicleErrors.registrationDate?.message}</p></div>
          </div>
          <DialogFooter><Button variant="outline" type="button" onClick={() => setIsVehicleModalOpen(false)}>Annuler</Button><Button type="submit">Sauvegarder</Button></DialogFooter>
        </form></DialogContent>
      </Dialog>
      
      {/* Document Upload Modal */}
      <Dialog open={isDocModalOpen} onOpenChange={setIsDocModalOpen}>
        <DialogContent><form onSubmit={handleSubmitDoc(handleDocumentSubmit)}>
          <DialogHeader><DialogTitle>Téléverser un document</DialogTitle><DialogDescription>Choisissez un fichier et donnez-lui un nom.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
              <div><Label htmlFor="docName">Nom du document</Label><Input id="docName" {...registerDoc("name")} placeholder="Ex: Carte VTC" /><p className="text-destructive text-xs mt-1">{docErrors.name?.message}</p></div>
              <div><Label htmlFor="docType">Type</Label><Input id="docType" {...registerDoc("type")} placeholder="Ex: Justificatif officiel" /><p className="text-destructive text-xs mt-1">{docErrors.type?.message}</p></div>
              <div><Label htmlFor="docFile">Fichier</Label><Input id="docFile" type="file" {...registerDoc("file")} accept="image/*,application/pdf" /><p className="text-destructive text-xs mt-1">{docErrors.file?.message}</p></div>
              {docFile?.[0] && <div className="text-center"><ImageIcon className="h-16 w-16 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2 truncate">{docFile[0].name}</p></div>}
          </div>
          <DialogFooter><Button variant="outline" type="button" onClick={() => setIsDocModalOpen(false)}>Annuler</Button><Button type="submit">Téléverser</Button></DialogFooter>
        </form></DialogContent>
      </Dialog>
    </div>
  );
}
