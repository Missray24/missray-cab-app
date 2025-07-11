
'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowLeft, Upload, FileCheck2 } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';


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
import { auth, db, storage } from '@/lib/firebase';
import { requiredDriverDocs } from '@/lib/types';

const fileRefine = (files: FileList | undefined) => files && files.length > 0;

const fileSchema = z.instanceof(FileList).refine(fileRefine, { message: 'Fichier requis.' });

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
      terms: z.boolean().refine((val) => val === true, {
        message: "Vous devez accepter les conditions générales.",
      }),

      // Step 2
      companyName: z.string().min(1, 'Le nom de la société est requis'),
      companyAddress: z
        .string()
        .min(1, "L'adresse de la société est requise"),
      siret: z.string().min(1, 'Le numéro de SIRET est requis'),
      evtcAdsNumber: z.string().optional(),
      vatNumber: z.string().optional(),
      isVatSubjected: z.boolean().default(false),
      
      // Step 3
      ...Object.fromEntries(requiredDriverDocs.map(doc => [doc.id, fileSchema]))

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


export default function SignupDriverPage() {
  const phoneInputRef = useRef<IntlTelInputRef>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
      companyName: '',
      companyAddress: '',
      siret: '',
      evtcAdsNumber: '',
      vatNumber: '',
      isVatSubjected: false,
    },
  });

  const uploadFile = async (file: File, driverNamePath: string, docId: string): Promise<string> => {
    const storageRef = ref(storage, `chauffeurs/${driverNamePath}/${docId}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const driverName = `${values.firstName} ${values.lastName}`;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      const driverNamePath = `${values.firstName}-${values.lastName}`.toLowerCase().replace(/\s+/g, '-');

      const uploadedDocuments = await Promise.all(
        requiredDriverDocs.map(async (doc) => {
          const file = (values as any)[doc.id]?.[0];
          if (file) {
            const url = await uploadFile(file, driverNamePath, doc.id);
            return { id: doc.id, name: doc.name, type: doc.type, url, status: 'Pending' as const };
          }
          return null;
        })
      );

      const driverData = {
        uid: user.uid,
        name: driverName,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: phoneInputRef.current?.getNumber() || '',
        role: 'driver' as const,
        joinDate: new Date().toLocaleDateString('fr-CA'),
        status: 'Pending' as const,
        driverProfile: {
          company: {
            name: values.companyName, address: values.companyAddress, siret: values.siret,
            evtcAdsNumber: values.evtcAdsNumber || '', vatNumber: values.vatNumber || '',
            isVatSubjected: values.isVatSubjected, commission: 20,
          },
          vehicles: [], totalRides: 0, totalEarnings: 0, unpaidAmount: 0,
          paymentDetails: { method: 'Bank Transfer' as const, account: '' },
          documents: uploadedDocuments.filter(Boolean),
        }
      };

      await addDoc(collection(db, 'users'), driverData);
      
      toast({
        title: 'Inscription soumise !',
        description: 'Votre compte a été créé et est en attente de validation par un administrateur. Vous serez notifié par email.',
      });

      router.push('/login');
    } catch (error: any) {
      console.error('Error signing up driver:', error);
      const errorMessage = error.code === 'auth/email-already-in-use' ? 'Cette adresse email est déjà utilisée.' : "Une erreur est survenue lors de l'inscription.";
      toast({ variant: 'destructive', title: "Erreur d'inscription", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof z.infer<typeof formSchema>)[];
    if (step === 1) {
      fieldsToValidate = ['firstName', 'lastName', 'phone', 'email', 'password', 'confirmPassword', 'terms'];
    } else if (step === 2) {
      fieldsToValidate = ['companyName', 'companyAddress', 'siret'];
    } else {
      return;
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(s => s + 1);
    }
  };

  const handlePreviousStep = () => {
    setStep(s => s - 1);
  };
  
  const watchedFiles = form.watch(requiredDriverDocs.map(d => d.id) as any);

  const progressValue = (step / 3) * 100;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-[#223aff] to-[#1697ff] p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Devenez chauffeur missray cab</CardTitle>
          <CardDescription>
            {step === 1 && 'Étape 1/3 : Vos informations personnelles.'}
            {step === 2 && 'Étape 2/3 : Informations sur votre entreprise.'}
            {step === 3 && 'Étape 3/3 : Téléversement des documents.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressValue} className="mb-6 h-2" />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className={cn(step !== 1 && 'hidden')}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input placeholder="Jean" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Dupont" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <FormField control={form.control} name="phone" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Téléphone</FormLabel><FormControl><IntlTelInput ref={phoneInputRef} value={field.value} onChange={(v) => { field.onChange(v); form.trigger('phone'); }} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="jean.dupont@email.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Mot de passe</FormLabel><FormControl><div className="relative"><Input type={showPassword ? 'text' : 'password'} placeholder="********" {...field} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirmer</FormLabel><FormControl><div className="relative"><Input type={showConfirmPassword ? 'text' : 'password'} placeholder="********" {...field} /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground">{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="terms" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>J'ai lu et j'accepte les <Link href="/terms" className="underline hover:text-primary">conditions générales d'utilisation</Link>.</FormLabel><FormMessage /></div></FormItem>)} />
                </div>
              </div>

              <div className={cn(step !== 2 && 'hidden')}>
                <div className="space-y-4">
                  <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem><FormLabel>Nom société</FormLabel><FormControl><Input placeholder="Dupont Transports" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="companyAddress" render={({ field }) => (<FormItem><FormLabel>Adresse société</FormLabel><FormControl><Input placeholder="123 Rue de la République, Paris" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="siret" render={({ field }) => (<FormItem><FormLabel>N° SIRET</FormLabel><FormControl><Input placeholder="123 456 789 00012" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="evtcAdsNumber" render={({ field }) => (<FormItem><FormLabel>N° EVTC/ADS (optionnel)</FormLabel><FormControl><Input placeholder="EVTC123456789" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="vatNumber" render={({ field }) => (<FormItem><FormLabel>N° TVA (optionnel)</FormLabel><FormControl><Input placeholder="FR12345678901" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="isVatSubjected" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-2 pt-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0 font-normal">Assujetti à la TVA</FormLabel></FormItem>)} />
                </div>
              </div>

              <div className={cn(step !== 3 && 'hidden')}>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto p-1">
                   {requiredDriverDocs.map((doc, index) => {
                       const fileList = watchedFiles[index];
                       const isUploaded = fileList && fileList.length > 0;
                       return (
                            <FormField key={doc.id} control={form.control} name={doc.id as any} render={({ field }) => (
                                <FormItem className="border p-4 rounded-md">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <FormLabel>{doc.name}</FormLabel>
                                        <p className="text-xs text-muted-foreground">{doc.description}</p>
                                      </div>
                                      <Button asChild variant={isUploaded ? "secondary" : "outline"} size="sm">
                                        <label htmlFor={doc.id} className="cursor-pointer">
                                          {isUploaded ? <FileCheck2 className="h-4 w-4 mr-2"/> : <Upload className="h-4 w-4 mr-2"/>}
                                          {isUploaded ? "Changer" : "Choisir"}
                                        </label>
                                      </Button>
                                    </div>
                                    <FormControl><Input type="file" id={doc.id} className="hidden" accept="image/*,application/pdf" onChange={(e) => field.onChange(e.target.files)} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                       )
                   })}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                {(step === 2 || step === 3) && <Button type="button" variant="outline" onClick={handlePreviousStep} className="w-1/3"><ArrowLeft className="mr-2 h-4 w-4" />Précédent</Button>}
                {step < 3 ? <Button type="button" onClick={handleNextStep} className="w-full">Suivant</Button>
                : <Button type="submit" className="flex-1" disabled={isLoading}>{isLoading ? 'Inscription...' : 'Rejoindre la flotte'}</Button>}
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-4">
          <div className="text-center text-sm">
            <p>Vous avez déjà un compte? <Link href="/login" className="underline">Se connecter</Link></p>
            <p>Vous êtes un client? <Link href="/signup" className="underline">Inscrivez-vous ici</Link></p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
