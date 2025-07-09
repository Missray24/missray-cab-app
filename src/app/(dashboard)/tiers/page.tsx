
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { collection, getDocs } from "firebase/firestore";

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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';

export default function ServiceTiersPage() {
  const [serviceTiers, setServiceTiers] = useState<ServiceTier[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddTierDialogOpen, setIsAddTierDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tiersSnap, zonesSnap] = await Promise.all([
          getDocs(collection(db, "serviceTiers")),
          getDocs(collection(db, "zones")),
        ]);
        const tiersData = tiersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ServiceTier[];
        const zonesData = zonesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Zone[];
        setServiceTiers(tiersData);
        setZones(zonesData);
      } catch (error) {
        console.error("Error fetching service tiers or zones: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Gammes de Service">
        <Dialog open={isAddTierDialogOpen} onOpenChange={setIsAddTierDialogOpen}>
          <DialogTrigger asChild>
            <Button>Ajouter une gamme</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter une nouvelle gamme</DialogTitle>
              <DialogDescription>
                Remplissez les informations ci-dessous pour créer une nouvelle gamme de service.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="p-1 pr-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de la gamme</Label>
                  <Input id="name" placeholder="Ex: Berline" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Référence (interne)</Label>
                  <Input id="reference" placeholder="Ex: BER-01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photo">Photo de la gamme</Label>
                  <Input id="photo" type="file" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="baseFare">Prise en charge (€)</Label>
                    <Input id="baseFare" type="number" placeholder="5.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="perKm">Prix / km (€)</Label>
                    <Input id="perKm" type="number" placeholder="1.50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="perMinute">Prix / minute (€)</Label>
                    <Input id="perMinute" type="number" placeholder="0.30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="perStop">Prix / arrêt (€)</Label>
                    <Input id="perStop" type="number" placeholder="2.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimumPrice">Prix minimum (€)</Label>
                    <Input id="minimumPrice" type="number" placeholder="10.00" />
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <Label>Zones de disponibilité</Label>
                  <div className="grid grid-cols-2 gap-2 rounded-md border p-4 max-h-48 overflow-y-auto">
                    {zones.map(zone => (
                      <div key={zone.id} className="flex items-center gap-2">
                        <Checkbox id={`zone-${zone.id}`} />
                        <Label htmlFor={`zone-${zone.id}`} className="font-normal">{zone.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddTierDialogOpen(false)}>Annuler</Button>
              <Button onClick={() => setIsAddTierDialogOpen(false)}>Ajouter la gamme</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="aspect-video w-full rounded-md" />
                <Skeleton className="h-6 w-3/4 mt-4" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prise en charge</span>
                  <span className="font-medium">€{tier.baseFare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix / km</span>
                  <span className="font-medium">€{tier.perKm.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix / minute</span>
                  <span className="font-medium">€{tier.perMinute.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix minimum</span>
                  <span className="font-medium">€{tier.minimumPrice.toFixed(2)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
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
