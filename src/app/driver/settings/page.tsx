
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

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
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { type User } from '@/lib/types';
import { IntlTelInput, type IntlTelInputRef } from '@/components/ui/intl-tel-input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const profileSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  phone: z.string().min(1, "Téléphone requis"),
  'paymentDetails.method': z.enum(['Bank Transfer', 'PayPal']),
  'paymentDetails.account': z.string().min(1, "Détail de paiement requis"),
});

export default function DriverSettingsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const phoneInputRef = useRef<IntlTelInputRef>(null);

  const { control, register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '', lastName: '', phone: '', 'paymentDetails.method': 'Bank Transfer' as const, 'paymentDetails.account': '',
    }
  });

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
            <Skeleton className="h-96 w-full max-w-2xl" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Paramètres" />
      <Tabs defaultValue="profile" className="w-full max-w-2xl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profil & Paiements</TabsTrigger>
          <TabsTrigger value="password">Mot de passe</TabsTrigger>
        </TabsList>
        
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
    </div>
  );
}
