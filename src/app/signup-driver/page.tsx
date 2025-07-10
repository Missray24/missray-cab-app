
'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import {
  IntlTelInput,
  type IntlTelInputRef,
} from '@/components/ui/intl-tel-input';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { auth, db } from '@/lib/firebase';
import { sendEmail } from '@/ai/flows/send-email-flow';

export default function SignupDriverPage() {
  const phoneInputRef = useRef<IntlTelInputRef>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const formSchema = z
    .object({
      // Step 1
      firstName: z.string().min(1, 'Le prénom est requis'),
      lastName: z.string().min(1, 'Le nom est requis'),
      phone: z.string().min(1, 'Le numéro de téléphone est requis'),
      email: z.string().email("L'email est invalide"),
      password: z
        .string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
      confirmPassword: z.string(),

      // Step 2
      companyName: z.string().min(1, 'Le nom de la société est requis'),
      companyAddress: z
        .string()
        .min(1, "L'adresse de la société est requise"),
      siret: z.string().min(1, 'Le numéro de SIRET est requis'),
      evtcAdsNumber: z.string().optional(),
      vatNumber: z.string().optional(),
      isVatSubjected: z.boolean().default(false),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Les mots de passe ne correspondent pas',
      path: ['confirmPassword'],
    })
    .refine(
      () => {
        if (typeof window === 'undefined') return true;
        const isValid = phoneInputRef.current?.isValidNumber() ?? false;
        return isValid;
      },
      {
        message: 'Le numéro de téléphone est invalide.',
        path: ['phone'],
      }
    );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      companyName: '',
      companyAddress: '',
      siret: '',
      evtcAdsNumber: '',
      vatNumber: '',
      isVatSubjected: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const driverName = `${values.firstName} ${values.lastName}`;
    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      // 2. Create driver document in Firestore
      const driverData = {
        uid: user.uid,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: phoneInputRef.current?.getNumber() || '',
        company: {
          name: values.companyName,
          address: values.companyAddress,
          siret: values.siret,
          evtcAdsNumber: values.evtcAdsNumber || '',
          vatNumber: values.vatNumber || '',
          isVatSubjected: values.isVatSubjected,
          commission: 20, // Default commission
        },
        vehicle: {
          // Placeholder vehicle info
          brand: '',
          model: '',
          licensePlate: '',
          registrationDate: '',
        },
        status: 'Active' as const,
        totalRides: 0,
        totalEarnings: 0,
        unpaidAmount: 0,
        paymentDetails: {
          method: 'Bank Transfer' as const,
          account: '',
        },
        documents: [],
      };

      await addDoc(collection(db, 'drivers'), driverData);
      
      // 3. Send emails
      await Promise.all([
        sendEmail({
            type: 'new_driver_welcome',
            to: { email: values.email, name: driverName },
            params: { driverName: driverName },
        }),
        sendEmail({
            type: 'admin_new_user',
            to: { email: 'contact@missray-cab.com', name: 'Admin' }, // This will be overridden
            params: {
              userType: 'Chauffeur',
              name: driverName,
              email: values.email,
            },
        }),
      ]);


      toast({
        title: 'Inscription réussie !',
        description:
          'Votre compte chauffeur a été créé. Vous allez être redirigé vers la page de connexion.',
      });

      router.push('/login');
    } catch (error: any) {
      console.error('Error signing up driver:', error);
      const errorMessage =
        error.code === 'auth/email-already-in-use'
          ? 'Cette adresse email est déjà utilisée.'
          : "Une erreur est survenue lors de l'inscription.";
      toast({
        variant: 'destructive',
        title: "Erreur d'inscription",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleNextStep = async () => {
    const fieldsToValidate: (keyof z.infer<typeof formSchema>)[] = [
      'firstName',
      'lastName',
      'phone',
      'email',
      'password',
      'confirmPassword',
    ];
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(2);
    }
  };

  const handlePreviousStep = () => {
    setStep(1);
  };

  const progressValue = step === 1 ? 50 : 100;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-[#223aff] to-[#1697ff] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">
            Devenez chauffeur missray cab
          </CardTitle>
          <CardDescription>
            {step === 1
              ? 'Étape 1/2 : Vos informations personnelles.'
              : 'Étape 2/2 : Informations sur votre entreprise.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressValue} className="mb-6 h-2" />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className={cn(step !== 1 && 'hidden')}>
                <div className="space-y-4">
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

                    <div className="md:col-span-2">
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
                    </div>
                    
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
                                showPassword ? 'Hide password' : 'Show password'
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
                </div>
              </div>

              <div className={cn(step !== 2 && 'hidden')}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de la société</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Dupont Transports" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="companyAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse de la société</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123 Rue de la République, 75001 Paris"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="siret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro de SIRET</FormLabel>
                        <FormControl>
                          <Input placeholder="123 456 789 00012" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="evtcAdsNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro EVTC ou ADS (optionnel)</FormLabel>
                        <FormControl>
                          <Input placeholder="EVTC123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vatNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro de TVA (optionnel)</FormLabel>
                        <FormControl>
                          <Input placeholder="FR12345678901" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isVatSubjected"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 pt-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 font-normal">
                          Je suis assujetti à la TVA
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                {step === 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreviousStep}
                    className="w-1/3"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Précédent
                  </Button>
                )}
                {step === 1 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full"
                  >
                    Suivant
                  </Button>
                ) : (
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading
                      ? 'Inscription en cours...'
                      : 'Rejoindre la flotte'}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-4">
          <div className="text-center text-sm">
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
        </CardFooter>
      </Card>
    </div>
  );
}
