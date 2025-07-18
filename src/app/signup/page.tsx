
'use client';

import Link from 'next/link';
import { Suspense, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { IntlTelInput, type IntlTelInputRef } from '@/components/ui/intl-tel-input';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { sendEmail } from '@/ai/flows/send-email-flow';


function SignupFormComponent() {
  const phoneInputRef = useRef<IntlTelInputRef>(null);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formSchema = z
    .object({
      firstName: z.string().min(1, 'Le prénom est requis'),
      lastName: z.string().min(1, 'Le nom est requis'),
      phone: z.string().min(1, 'Le numéro de téléphone est requis'),
      email: z.string().email("L'email est invalide"),
      password: z
        .string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
      confirmPassword: z.string(),
      terms: z.boolean().refine((val) => val === true, {
        message: "Vous devez accepter les conditions générales.",
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Les mots de passe ne correspondent pas',
      path: ['confirmPassword'],
    })
    .refine(() => {
        if (typeof window === 'undefined') return true;
        const isValid = phoneInputRef.current?.isValidNumber() ?? false;
        return isValid;
    }, {
        message: "Le numéro de téléphone est invalide.",
        path: ["phone"],
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const clientName = `${values.firstName} ${values.lastName}`;
    
    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      // 2. Create user document in Firestore
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
      
      // 3. Send welcome email to client (and admin notification)
      await sendEmail({
        type: 'new_client_welcome',
        to: { email: values.email, name: clientName },
        params: { clientName: clientName },
      });

      toast({
        title: 'Inscription réussie!',
        description: 'Votre compte a été créé. Vous pouvez maintenant vous connecter.',
      });
      
      const bookingParams = searchParams.toString() ? `?${searchParams.toString()}` : '';
      router.push(`/login${bookingParams}`);

    } catch (error: any) {
      console.error("Error signing up:", error);
      const errorMessage =
        error.code === 'auth/email-already-in-use'
          ? 'Cette adresse email est déjà utilisée.'
          : 'Une erreur est survenue lors de l\'inscription.';
      toast({
        variant: 'destructive',
        title: 'Erreur d\'inscription',
        description: errorMessage,
      });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-[#223aff] to-[#1697ff] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Créer votre compte client</CardTitle>
          <CardDescription>
            Inscrivez-vous pour réserver vos courses en quelques clics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input placeholder="Jean" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input placeholder="Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Numéro de téléphone</FormLabel>
                    <FormControl>
                      <IntlTelInput
                        ref={phoneInputRef}
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          form.trigger('phone');
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="jean.dupont@email.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="********"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                          aria-label={
                            showPassword
                              ? 'Hide password'
                              : 'Show password'
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="********"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                          aria-label={
                            showConfirmPassword
                              ? 'Hide password'
                              : 'Show password'
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        J'ai lu et j'accepte les{" "}
                        <Link href="/terms" className="underline hover:text-primary">
                          conditions générales d'utilisation
                        </Link>
                        .
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Création en cours...' : 'Créer mon compte'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm space-y-2">
            <p>
              Vous avez déjà un compte?{' '}
              <Link href={`/login?${searchParams.toString()}`} className="underline">
                Se connecter
              </Link>
            </p>
            <p>
              Vous êtes chauffeur?{' '}
              <Link href="/signup-driver" className="underline">
                Inscrivez-vous ici
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SignupFormComponent />
        </Suspense>
    )
}
