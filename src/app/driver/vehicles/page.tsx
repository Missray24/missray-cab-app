
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Trash2, PlusCircle, Car, Upload, FileCheck2 } from 'lucide-react';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { auth, db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { type User, type Vehicle, requiredVehicleDocs } from '@/lib/types';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const fileSchema = z.instanceof(FileList).refine(files => files && files.length > 0, 'Fichier requis.');

const vehicleSchema = z.object({
    brand: z.string().min(1, "Marque requise"),
    model: z.string().min(1, "Modèle requis"),
    licensePlate: z.string().min(1, "Immatriculation requise"),
    registrationDate: z.string().min(1, "Date requise"),
    ...Object.fromEntries(requiredVehicleDocs.map(doc => [doc.id, fileSchema]))
});


export default function DriverVehiclesPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const form = useForm<z.infer<typeof vehicleSchema>>({ resolver: zodResolver(vehicleSchema) });
    const { register: registerVehicle, handleSubmit: handleSubmitVehicle, reset: resetVehicle, formState: { errors: vehicleErrors } } = form;
    
    const watchedFiles = form.watch(requiredVehicleDocs.map(d => d.id) as any);

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
                    setVehicles(userData.driverProfile?.vehicles || []);
                }
                setLoading(false);
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const updateUserData = async (dataToUpdate: object, successMessage: string) => {
      if (!user) return;
      try {
          const userRef = doc(db, "users", user.id);
          await updateDoc(userRef, dataToUpdate);
          toast({ title: 'Succès', description: successMessage });
      } catch (error) {
          console.error('Error updating vehicles:', error);
          toast({ variant: 'destructive', title: 'Erreur', description: 'Mise à jour échouée.' });
      }
    };

    const handleVehicleSubmit = async (data: z.infer<typeof vehicleSchema>) => {
        if (!user) return;
        
        // TODO: Handle document upload for vehicles
        
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

    const handleDeleteVehicle = async (vehicleId: string) => {
        if (!user) return;
        const updatedVehicles = vehicles.filter(v => v.id !== vehicleId);
        await updateUserData({ 'driverProfile.vehicles': updatedVehicles }, 'Véhicule supprimé.');
        setVehicles(updatedVehicles);
    };
  
    const openVehicleModal = (vehicle: Vehicle | null) => {
      setEditingVehicle(vehicle);
      const defaultValues = vehicle ? {
          brand: vehicle.brand,
          model: vehicle.model,
          licensePlate: vehicle.licensePlate,
          registrationDate: vehicle.registrationDate
      } : { brand: '', model: '', licensePlate: '', registrationDate: '' };
      resetVehicle(defaultValues as any); // Type assertion to bypass doc fields
      setIsVehicleModalOpen(true);
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Mes Véhicules" />
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div className="space-y-1.5">
                        <CardTitle>Liste des véhicules</CardTitle>
                        <CardDescription>Gérez la liste de vos véhicules (max 5).</CardDescription>
                    </div>
                    <Button type="button" onClick={() => openVehicleModal(null)} disabled={vehicles.length >= 5}>
                        <PlusCircle className="mr-2" />Ajouter un véhicule
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? (
                        Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                    ) : vehicles.length > 0 ? vehicles.map(v => (
                        <div key={v.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-4">
                                <Car className="h-6 w-6 text-primary" />
                                <div className="font-medium">{v.brand} {v.model}<p className="text-sm text-muted-foreground">{v.licensePlate}</p></div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => openVehicleModal(v)}>Modifier</Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteVehicle(v.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    )) : <p className="text-muted-foreground text-center py-8">Aucun véhicule ajouté.</p>}
                </CardContent>
            </Card>

            <Dialog open={isVehicleModalOpen} onOpenChange={setIsVehicleModalOpen}>
                <DialogContent className="max-w-2xl"><Form {...form}>
                <form onSubmit={handleSubmitVehicle(handleVehicleSubmit)}>
                <DialogHeader><DialogTitle>{editingVehicle ? 'Modifier le véhicule' : 'Ajouter un véhicule'}</DialogTitle><DialogDescription>Remplissez les informations de votre véhicule.</DialogDescription></DialogHeader>
                <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
                    <FormField control={form.control} name="brand" render={({ field }) => (<FormItem><FormLabel>Marque</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Modèle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="licensePlate" render={({ field }) => (<FormItem><FormLabel>Plaque</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="registrationDate" render={({ field }) => (<FormItem><FormLabel>Date d'immatriculation</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />

                    <h3 className="text-lg font-semibold pt-4 border-t mt-4">Documents du Véhicule</h3>

                     {requiredVehicleDocs.map((doc, index) => {
                       const fileList = watchedFiles[index];
                       const isUploaded = fileList && fileList.length > 0;
                       return (
                            <FormField key={doc.id} control={form.control} name={doc.id as any} render={({ field }) => (
                                <FormItem className="border p-4 rounded-md">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <FormLabel>{doc.name}</FormLabel>
                                        <p className="text-xs text-muted-foreground">{doc.description}</p>
                                      </div>
                                      <Button asChild variant={isUploaded ? "secondary" : "outline"} size="sm">
                                        <label htmlFor={doc.id} className="cursor-pointer">
                                          {isUploaded ? <FileCheck2 className="h-4 w-4 mr-2"/> : <Upload className="h-4 w-4 mr-2"/>}
                                          {isUploaded ? "Changer" : "Choisir"}
                                        </label>
                                      </Button>
                                    </div>
                                    <FormControl><Input type="file" id={doc.id} className="hidden" accept="image/*,application/pdf" onChange={(e) => field.onChange(e.target.files)} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                       )
                   })}
                </div>
                <DialogFooter><Button variant="outline" type="button" onClick={() => setIsVehicleModalOpen(false)}>Annuler</Button><Button type="submit">Sauvegarder</Button></DialogFooter>
                </form></Form></DialogContent>
            </Dialog>
        </div>
    )
}
