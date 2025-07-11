
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { MapPin } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/page-header';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { type User, type Zone } from '@/lib/types';

export default function DriverZonesPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [allZones, setAllZones] = useState<Zone[]>([]);
    const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setLoading(true);
                try {
                    const usersRef = collection(db, "users");
                    const q = query(usersRef, where("uid", "==", currentUser.uid));
                    const userSnapshot = await getDocs(q);
                    
                    if (!userSnapshot.empty) {
                        const userData = { id: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data() } as User;
                        setUser(userData);
                        setSelectedZoneIds(userData.driverProfile?.activeZoneIds || []);
                    }

                    const zonesSnapshot = await getDocs(collection(db, "zones"));
                    setAllZones(zonesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Zone)));

                } catch (error) {
                    console.error("Error fetching data:", error);
                    toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les données.' });
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [toast]);

    const handleZoneChange = (zoneId: string, checked: boolean | 'indeterminate') => {
        if (typeof checked === 'boolean') {
             if (checked && selectedZoneIds.length >= 5) {
                toast({
                    variant: 'destructive',
                    title: 'Limite atteinte',
                    description: 'Vous ne pouvez pas sélectionner plus de 5 zones d\'activité.',
                });
                return;
            }
            setSelectedZoneIds(prev =>
                checked ? [...prev, zoneId] : prev.filter(id => id !== zoneId)
            );
        }
    };

    const handleSaveChanges = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const userRef = doc(db, "users", user.id);
            await updateDoc(userRef, { 'driverProfile.activeZoneIds': selectedZoneIds });
            toast({ title: 'Succès', description: 'Vos zones d\'activité ont été mises à jour.' });
        } catch (error) {
            console.error('Error updating zones:', error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'La mise à jour a échoué.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Mes Zones d'Activité" />
            <Card>
                <CardHeader>
                    <CardTitle>Sélectionnez vos zones</CardTitle>
                    <CardDescription>Cochez les zones dans lesquelles vous souhaitez recevoir des propositions de courses (maximum 5). Les courses programmées en dehors de ces zones ne vous seront pas proposées.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allZones.map(zone => (
                                <div key={zone.id} className="flex items-center space-x-3 p-3 border rounded-md">
                                    <Checkbox
                                        id={zone.id}
                                        checked={selectedZoneIds.includes(zone.id)}
                                        onCheckedChange={(checked) => handleZoneChange(zone.id, checked)}
                                        disabled={!selectedZoneIds.includes(zone.id) && selectedZoneIds.length >= 5}
                                    />
                                    <Label htmlFor={zone.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        {zone.name} ({zone.region})
                                    </Label>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            <div className="flex justify-end">
                <Button onClick={handleSaveChanges} disabled={isSaving || loading}>
                    {isSaving ? 'Sauvegarde...' : 'Sauvegarder les changements'}
                </Button>
            </div>
        </div>
    );
}
