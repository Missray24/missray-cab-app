
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Trash2, PlusCircle, Car } from 'lucide-react';

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
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { type User, type Vehicle } from '@/lib/types';

const vehicleSchema = z.object({
    brand: z.string().min(1, "Marque requise"),
    model: z.string().min(1, "Modèle requis"),
    licensePlate: z.string().min(1, "Immatriculation requise"),
    registrationDate: z.string().min(1, "Date requise"),
});

export default function DriverVehiclesPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const { register: registerVehicle, handleSubmit: handleSubmitVehicle, reset: resetVehicle, formState: { errors: vehicleErrors } } = useForm<z.infer<typeof vehicleSchema>>({ resolver: zodResolver(vehicleSchema) });

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
      resetVehicle(vehicle || { brand: '', model: '', licensePlate: '', registrationDate: '' });
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
        </div>
    )
}
