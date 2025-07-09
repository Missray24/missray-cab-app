'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';

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
import { IntlTelInput, type IntlTelInputRef } from '@/components/ui/intl-tel-input';
import { useToast } from '@/hooks/use-toast';

export default function SignupDriverPage() {
  const phoneInputRef = useRef<IntlTelInputRef>(null);
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // NOTE: This is a mock submission for a driver.
    const fullPhoneNumber = phoneInputRef.current?.getNumber();
    console.log({ ...values, phone: fullPhoneNumber, accountType: 'driver' });
    toast({
      title: "Inscription Chauffeur (simulation)",
      description: "Vérifiez la console pour voir les données du formulaire.",
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-[#223aff] to-[#1697ff] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Devenez chauffeur missray cab</CardTitle>
          <CardDescription>
            Rejoignez notre flotte et commencez à conduire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <FormItem className="flex flex-col gap-1.5">
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
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                Rejoindre la flotte
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm space-y-2">
            <p>
              Vous avez déjà un compte?{' '}
              <Link href="/login" className="underline">
                Se connecter
              </Link>
            </p>
             <p>
              Vous êtes un client?{' '}
              <Link href="/signup" className="underline">
                Inscrivez-vous ici
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
