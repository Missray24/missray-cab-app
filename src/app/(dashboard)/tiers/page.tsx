
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import type { ServiceTier, Zone } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Upload } from 'lucide-react';

const initialFormState = {
  name: '',
  reference: '',
  description: '',
  photoUrl: '',
  baseFare: '0',
  perKm: '0',
  perMinute: '0',
  perStop: '0',
  minimumPrice: '0',
  availableZoneIds: [] as string[],
};

type ModalState = {
  mode: 'add' | 'edit';
  tier: ServiceTier | null;
  isOpen: boolean;
}

export default function ServiceTiersPage() {
  const [serviceTiers, setServiceTiers] = useState<ServiceTier[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>({ mode: 'add', tier: null, isOpen: false });
  const [formData, setFormData] = useState(initialFormState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tiersSnap, zonesSnap] = await Promise.all([
          getDocs(collection(db, "serviceTiers")),
          getDocs(collection(db, "zones")),
        ]);
        setServiceTiers(tiersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ServiceTier[]);
        setZones(zonesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Zone[]);
      } catch (error) {
        console.error("Error fetching data: ", error);
        toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger les données." });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);
  
  useEffect(() => {
    if (modalState.mode === 'edit' && modalState.tier) {
      const { availableZoneIds, photoUrl, ...rest } = modalState.tier;
      setFormData({
        ...Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, String(value)])),
        photoUrl: photoUrl,
        availableZoneIds,
      } as any);
      setPreviewUrl(photoUrl);
    } else {
      setFormData(initialFormState);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
  }, [modalState]);

  const handleOpenModal = (mode: 'add' | 'edit', tier: ServiceTier | null = null) => {
    setModalState({ mode, tier, isOpen: true });
  }

  const handleCloseModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleZoneChange = (zoneId: string, checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      setFormData(prev => ({
        ...prev,
        availableZoneIds: checked
          ? [...prev.availableZoneIds, zoneId]
          : prev.availableZoneIds.filter(id => id !== zoneId)
      }));
    }
  }

  const handleSubmit = async () => {
    setIsUploading(true);
    let photoDownloadUrl = formData.photoUrl;

    if (selectedFile) {
        const storageRef = ref(storage, `service-tiers/${Date.now()}_${selectedFile.name}`);
        try {
            const snapshot = await uploadBytes(storageRef, selectedFile);
            photoDownloadUrl = await getDownloadURL(snapshot.ref);
        } catch (error) {
            console.error("Error uploading file: ", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de télécharger l\'image.' });
            setIsUploading(false);
            return;
        }
    }
    
    if (!photoDownloadUrl) {
       photoDownloadUrl = 'https://placehold.co/600x400.png';
    }
    
    const dataToSave = {
      ...formData,
      photoUrl: photoDownloadUrl,
      baseFare: parseFloat(formData.baseFare),
      perKm: parseFloat(formData.perKm),
      perMinute: parseFloat(formData.perMinute),
      perStop: parseFloat(formData.perStop),
      minimumPrice: parseFloat(formData.minimumPrice),
    };

    if (modalState.mode === 'edit' && modalState.tier) {
      try {
        const tierRef = doc(db, "serviceTiers", modalState.tier.id);
        await updateDoc(tierRef, dataToSave);
        setServiceTiers(prev => prev.map(t => t.id === modalState.tier!.id ? { id: modalState.tier!.id, ...dataToSave } : t));
        toast({ title: "Succès", description: "Gamme mise à jour." });
      } catch (error) {
        console.error("Error updating tier: ", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour la gamme.' });
      }
    } else {
      try {
        const docRef = await addDoc(collection(db, "serviceTiers"), dataToSave);
        setServiceTiers(prev => [...prev, { id: docRef.id, ...dataToSave }]);
        toast({ title: "Succès", description: "Gamme ajoutée." });
      } catch (error) {
        console.error("Error adding tier: ", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'ajouter la gamme.' });
      }
    }
    setIsUploading(false);
    handleCloseModal();
  }

  const tierDialogContent = (
    <>
      <ScrollArea className="max-h-[70vh]">
        <div className="p-1 pr-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la gamme</Label>
                <Input id="name" placeholder="Ex: Berline" value={formData.name} onChange={handleFormChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Référence (interne)</Label>
                <Input id="reference" placeholder="Ex: BER-01" value={formData.reference} onChange={handleFormChange}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Description courte de la gamme" value={formData.description} onChange={handleFormChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Photo du véhicule</Label>
              <div className="aspect-video w-full rounded-md overflow-hidden border relative flex items-center justify-center bg-muted/40">
                {previewUrl ? (
                  <Image src={previewUrl} alt="Aperçu" layout="fill" objectFit="cover" />
                ) : (
                  <div className="text-center text-muted-foreground p-4">
                    <Upload className="mx-auto h-8 w-8 mb-2" />
                    <p className="text-sm">Aucune image</p>
                  </div>
                )}
              </div>
               <Input id="photo" type="file" accept="image/*" onChange={handleFileChange} className="mt-2" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            <div className="space-y-2"><Label htmlFor="baseFare">Prise en charge (€)</Label><Input id="baseFare" type="number" value={formData.baseFare} onChange={handleFormChange} /></div>
            <div className="space-y-2"><Label htmlFor="perKm">Prix / km (€)</Label><Input id="perKm" type="number" value={formData.perKm} onChange={handleFormChange} /></div>
            <div className="space-y-2"><Label htmlFor="perMinute">Prix / minute (€)</Label><Input id="perMinute" type="number" value={formData.perMinute} onChange={handleFormChange} /></div>
            <div className="space-y-2"><Label htmlFor="perStop">Prix / arrêt (€)</Label><Input id="perStop" type="number" value={formData.perStop} onChange={handleFormChange} /></div>
            <div className="space-y-2"><Label htmlFor="minimumPrice">Prix minimum (€)</Label><Input id="minimumPrice" type="number" value={formData.minimumPrice} onChange={handleFormChange} /></div>
          </div>

          <div className="space-y-2 pt-2">
            <Label>Zones de disponibilité</Label>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-4 max-h-48 overflow-y-auto">
              {zones.map(zone => (
                <div key={zone.id} className="flex items-center gap-2">
                  <Checkbox 
                    id={`zone-${zone.id}`} 
                    checked={formData.availableZoneIds.includes(zone.id)}
                    onCheckedChange={(checked) => handleZoneChange(zone.id, checked)}
                  />
                  <Label htmlFor={`zone-${zone.id}`} className="font-normal">{zone.name}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
      <DialogFooter>
        <Button variant="outline" onClick={handleCloseModal}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={isUploading}>
          {isUploading ? 'Sauvegarde...' : (modalState.mode === 'edit' ? 'Sauvegarder' : 'Ajouter')}
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Gammes de Service">
        <Button onClick={() => handleOpenModal('add')}>Ajouter une gamme</Button>
      </PageHeader>
      
      <Dialog open={modalState.isOpen} onOpenChange={(isOpen) => !isOpen && handleCloseModal()}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{modalState.mode === 'edit' ? 'Modifier la gamme' : 'Ajouter une nouvelle gamme'}</DialogTitle>
              <DialogDescription>
                Remplissez les informations ci-dessous.
              </DialogDescription>
            </DialogHeader>
            {tierDialogContent}
          </DialogContent>
      </Dialog>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="aspect-video w-full rounded-md" /><Skeleton className="h-6 w-3/4 mt-4" /><Skeleton className="h-4 w-full mt-2" /></CardHeader>
              <CardContent className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></CardContent>
              <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
            </Card>
          ))
        ) : (
          serviceTiers.map((tier) => (
            <Card key={tier.id} className="flex flex-col">
              <CardHeader>
                <div className="aspect-video w-full rounded-md overflow-hidden border mb-4">
                  <Image
                    src={tier.photoUrl}
                    alt={`Photo of ${tier.name}`}
                    data-ai-hint="sedan car"
                    width={400}
                    height={225}
                    className="h-full w-full object-cover"
                  />
                </div>
                <CardTitle className="font-headline">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm flex-grow">
                <div className="flex justify-between"><span className="text-muted-foreground">Prise en charge</span><span className="font-medium">€{tier.baseFare.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Prix / km</span><span className="font-medium">€{tier.perKm.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Prix / minute</span><span className="font-medium">€{tier.perMinute.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Prix minimum</span><span className="font-medium">€{tier.minimumPrice.toFixed(2)}</span></div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => handleOpenModal('edit', tier)}>
                  Modifier
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
