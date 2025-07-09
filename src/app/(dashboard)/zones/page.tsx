
'use client'

import { useState, useEffect } from 'react';
import Image from "next/image";
import { MapPin } from "lucide-react";
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";

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
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { paymentMethods, type Zone, type PaymentMethod } from "@/lib/types";
import { db } from "@/lib/firebase";
import { useToast } from '@/hooks/use-toast';

const initialFormState = {
    name: '',
    region: '',
    freeWaitingMinutes: '5',
    minutesBeforeNoShow: '10',
    paymentMethods: [] as PaymentMethod[],
};

type ModalState = {
    mode: 'add' | 'edit';
    zone: Zone | null;
    isOpen: boolean;
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>({ mode: 'add', zone: null, isOpen: false });
  const [formData, setFormData] = useState(initialFormState);
  const { toast } = useToast();

  useEffect(() => {
    const fetchZones = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "zones"));
        const zonesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Zone[];
        setZones(zonesData);
      } catch (error) {
        console.error("Error fetching zones: ", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les zones.'});
      } finally {
        setLoading(false);
      }
    };
    fetchZones();
  }, [toast]);
  
  useEffect(() => {
      if (modalState.mode === 'edit' && modalState.zone) {
          setFormData({
              name: modalState.zone.name,
              region: modalState.zone.region,
              freeWaitingMinutes: String(modalState.zone.freeWaitingMinutes),
              minutesBeforeNoShow: String(modalState.zone.minutesBeforeNoShow),
              paymentMethods: modalState.zone.paymentMethods,
          });
      } else {
          setFormData(initialFormState);
      }
  }, [modalState]);

  const handleOpenModal = (mode: 'add' | 'edit', zone: Zone | null = null) => {
    setModalState({ mode, zone, isOpen: true });
  }
  
  const handleCloseModal = () => {
      setModalState(prev => ({ ...prev, isOpen: false }));
  }
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  }

  const handlePaymentMethodChange = (method: PaymentMethod, checked: boolean | 'indeterminate') => {
      if (typeof checked === 'boolean') {
          setFormData(prev => ({
              ...prev,
              paymentMethods: checked
                ? [...prev.paymentMethods, method]
                : prev.paymentMethods.filter(m => m !== method)
          }));
      }
  }

  const handleSubmit = async () => {
    const dataToSave = {
        ...formData,
        freeWaitingMinutes: parseInt(formData.freeWaitingMinutes),
        minutesBeforeNoShow: parseInt(formData.minutesBeforeNoShow),
        // This is a placeholder as we don't have real-time driver data yet
        activeDrivers: modalState.zone?.activeDrivers || 0,
    };

    if (modalState.mode === 'edit' && modalState.zone) {
        try {
            const zoneRef = doc(db, "zones", modalState.zone.id);
            await updateDoc(zoneRef, dataToSave);
            setZones(prev => prev.map(z => z.id === modalState.zone!.id ? { id: modalState.zone!.id, ...dataToSave } : z));
            toast({ title: 'Succès', description: 'Zone mise à jour.' });
        } catch (error) {
            console.error("Error updating zone: ", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour la zone.' });
        }
    } else {
        try {
            const docRef = await addDoc(collection(db, "zones"), dataToSave);
            setZones(prev => [...prev, { id: docRef.id, ...dataToSave }]);
            toast({ title: 'Succès', description: 'Zone ajoutée.' });
        } catch (error) {
            console.error("Error adding zone: ", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'ajouter la zone.' });
        }
    }
    handleCloseModal();
  }
  
  const zoneDialogContent = (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          <div className="md:col-span-2">
            <Label>Zone Area (Feature coming soon)</Label>
            <div className="mt-2 rounded-lg overflow-hidden border">
              <Image
                src="https://placehold.co/800x400.png"
                alt="Map of the zone"
                data-ai-hint="city map"
                width={800}
                height={400}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="space-y-4 pt-2">
            <div className='space-y-2'>
                <Label htmlFor="name">Nom de la zone</Label>
                <Input id="name" value={formData.name} onChange={handleFormChange} />
            </div>
            <div className='space-y-2'>
                <Label htmlFor="region">Région/Ville</Label>
                <Input id="region" value={formData.region} onChange={handleFormChange} />
            </div>
            <div>
              <Label htmlFor="freeWaitingMinutes">Attente gratuite (minutes)</Label>
              <Input id="freeWaitingMinutes" type="number" value={formData.freeWaitingMinutes} onChange={handleFormChange} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="minutesBeforeNoShow">Délai No-show (minutes)</Label>
              <Input id="minutesBeforeNoShow" type="number" value={formData.minutesBeforeNoShow} onChange={handleFormChange} className="mt-2" />
            </div>
            <Separator />
            <div>
              <Label>Moyens de paiement</Label>
              <div className="space-y-2 mt-2">
                {paymentMethods.map(method => (
                  <div key={method} className="flex items-center gap-2">
                    <Checkbox
                      id={method}
                      checked={formData.paymentMethods.includes(method)}
                      onCheckedChange={(checked) => handlePaymentMethodChange(method, checked)}
                    />
                    <Label htmlFor={method} className="font-normal">{method}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCloseModal}>Annuler</Button>
          <Button type="submit" onClick={handleSubmit}>{modalState.mode === 'edit' ? 'Sauvegarder' : 'Ajouter'}</Button>
        </DialogFooter>
      </>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Zones">
        <Button onClick={() => handleOpenModal('add')}>Add Zone</Button>
      </PageHeader>

       <Dialog open={modalState.isOpen} onOpenChange={(isOpen) => !isOpen && handleCloseModal()}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{modalState.mode === 'edit' ? `Gérer la zone: ${modalState.zone?.name}` : 'Ajouter une nouvelle zone'}</DialogTitle>
              <DialogDescription>
                Définissez la zone sur la carte et configurez ses paramètres.
              </DialogDescription>
            </DialogHeader>
            {zoneDialogContent}
          </DialogContent>
        </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
              <CardContent className="space-y-4"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-8 w-full" /></CardContent>
              <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
            </Card>
          ))
        ) : (
          zones.map((zone) => (
            <Card key={zone.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {zone.name}
                </CardTitle>
                <CardDescription>{zone.region}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 flex-grow">
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Details</h4>
                  <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active Drivers:</span>
                        <span className="font-medium text-foreground">{zone.activeDrivers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Free Waiting:</span>
                        <span className="font-medium text-foreground">{zone.freeWaitingMinutes} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">No-show Delay:</span>
                        <span className="font-medium text-foreground">{zone.minutesBeforeNoShow} min</span>
                      </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium my-2 text-muted-foreground">Payment Methods</h4>
                  <div className="flex flex-wrap gap-1">
                      {zone.paymentMethods.map(method => (
                        <Badge key={method} variant="secondary">{method}</Badge>
                      ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => handleOpenModal('edit', zone)}>
                    Manage Zone
                  </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
