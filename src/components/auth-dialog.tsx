

'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { IntlTelInput, type IntlTelInputRef } from '@/components/ui/intl-tel-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { sendEmail } from '@/ai/flows/send-email-flow';
import type { SelectedOption } from '@/lib/types';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingDetails: {
    pickup: string;
    dropoff: string;
    stops: string[];
    scheduledTime: Date | null;
    tierId: string;
    routeInfo: { distance: string; duration: string } | null;
    passengers?: number;
    suitcases?: number;
    backpacks?: number;
    options: SelectedOption[];
  };
}

const signupSchema = z
  .object({
    firstName: z.string().min(1, 'Le prénom est requis'),
    lastName: z.string().min(1, 'Le nom est requis'),
    phone: z.string().min(1, 'Le numéro de téléphone est requis'),
    email: z.string().email("L'email est invalide"),
    password: z
      .string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

const loginSchema = z.object({
  email: z.string().email("L'email est invalide"),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

export function AuthDialog({ open, onOpenChange, bookingDetails }: AuthDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const phoneInputRef = useRef<IntlTelInputRef>(null);

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema.refine(() => phoneInputRef.current?.isValidNumber() ?? false, {
        message: "Le numéro de téléphone est invalide.",
        path: ["phone"],
    })),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '' },
  });

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  
  const handleAuthSuccess = () => {
    // After login/signup, redirect to the payment page with booking details
    const params = new URLSearchParams();
    params.set('pickup', bookingDetails.pickup);
    params.set('dropoff', bookingDetails.dropoff);
    bookingDetails.stops.forEach(s => params.append('stop', s));
    if (bookingDetails.scheduledTime) {
      params.set('scheduledTime', bookingDetails.scheduledTime.toISOString());
    }
    params.set('tierId', bookingDetails.tierId);
    if (bookingDetails.routeInfo) {
      params.set('distance', bookingDetails.routeInfo.distance);
      params.set('duration', bookingDetails.routeInfo.duration);
    }
    if (bookingDetails.passengers) params.set('passengers', String(bookingDetails.passengers));
    if (bookingDetails.suitcases) params.set('suitcases', String(bookingDetails.suitcases));
    if (bookingDetails.backpacks) params.set('backpacks', String(bookingDetails.backpacks));
    if (bookingDetails.options && bookingDetails.options.length > 0) {
        params.set('options', JSON.stringify(bookingDetails.options));
    }
    
    router.push(`/book/payment?${params.toString()}`);
    onOpenChange(false);
  }

  async function onSignup(values: z.infer<typeof signupSchema>) {
    setIsLoading(true);
    const clientName = `${values.firstName} ${values.lastName}`;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      await addDoc(collection(db, 'users'), {
        uid: user.uid,
        name: clientName,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: phoneInputRef.current?.getNumber() || '',
        role: 'client',
        joinDate: new Date().toLocaleDateString('fr-CA'),
        status: 'Active',
      });
      
      await sendEmail({
        type: 'new_client_welcome',
        to: { email: values.email, name: clientName },
        params: { clientName: clientName },
      });
      
      handleAuthSuccess();

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur d\'inscription', description: error.code === 'auth/email-already-in-use' ? 'Cette adresse email est déjà utilisée.' : 'Une erreur est survenue.' });
    } finally {
      setIsLoading(false);
    }
  }

  async function onLogin(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      handleAuthSuccess();
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erreur de connexion", description: "Email ou mot de passe incorrect." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-card">
        <DialogHeader>
          <DialogTitle className="text-center font-headline">Finalisez votre réservation</DialogTitle>
          <DialogDescription className="text-center">Connectez-vous ou créez un compte pour continuer.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Se connecter</TabsTrigger>
            <TabsTrigger value="signup">S'inscrire</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4 pt-4">
                <FormField control={loginForm.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="votre@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={loginForm.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>Mot de passe</FormLabel>
                    <FormControl><div className="relative"><Input type={showPassword ? "text" : "password"} placeholder="********" {...field} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </div></FormControl><FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={isLoading} variant="default">{isLoading ? 'Connexion...' : 'Se connecter et Réserver'}</Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="signup">
            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4 pt-4 max-h-[50vh] overflow-y-auto pr-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={signupForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input placeholder="Jean" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={signupForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Dupont" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={signupForm.control} name="phone" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Téléphone</FormLabel><FormControl><IntlTelInput ref={phoneInputRef} value={field.value} onChange={(value) => { field.onChange(value); signupForm.trigger('phone'); }} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={signupForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="jean.dupont@email.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={signupForm.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>Mot de passe</FormLabel><FormControl><div className="relative"><Input type={showPassword ? 'text' : 'password'} placeholder="********" {...field} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (
                  <FormItem><FormLabel>Confirmer</FormLabel><FormControl><div className="relative"><Input type={showConfirmPassword ? 'text' : 'password'} placeholder="********" {...field} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={isLoading} variant="default">{isLoading ? 'Inscription...' : 'S\'inscrire et Réserver'}</Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
