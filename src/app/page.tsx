
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, Star, CheckCircle, Smartphone, CreditCard, Users, Briefcase } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { LandingHeader } from '@/components/landing-header';
import { LandingFooter } from '@/components/landing-footer';
import { BookingForm, type BookingDetails } from '@/components/booking-form';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";


const staticTiers = [
  {
    id: 'standard',
    name: 'Standard',
    photoUrl: 'https://firebasestorage.googleapis.com/v0/b/missray-cab-kb0il.firebasestorage.app/o/service-tiers%2F1752142290793_comfort.png?alt=media&token=f55bb2c2-cb7b-4013-97f0-2adc052f0aa3',
    capacity: { passengers: 4, suitcases: 2 },
    'data-ai-hint': 'sedan car'
  },
  {
    id: 'break',
    name: 'Break',
    photoUrl: 'https://firebasestorage.googleapis.com/v0/b/missray-cab-kb0il.firebasestorage.app/o/service-tiers%2F1752142156955_IZMOEF0CU34689-001-removebg-preview.png?alt=media&token=7e55edc0-d636-4560-b483-565ab409de99',
    capacity: { passengers: 4, suitcases: 3 },
    'data-ai-hint': 'station wagon'
  },
  {
    id: 'comfort',
    name: 'Comfort',
    photoUrl: 'https://firebasestorage.googleapis.com/v0/b/missray-cab-kb0il.firebasestorage.app/o/service-tiers%2F1752130378649_e-class.png?alt=media&token=421c5010-edc3-48fa-88c6-73d705ebe4c3',
    capacity: { passengers: 4, suitcases: 2 },
    'data-ai-hint': 'luxury sedan'
  },
  {
    id: 'van',
    name: 'Van',
    photoUrl: 'https://firebasestorage.googleapis.com/v0/b/missray-cab-kb0il.firebasestorage.app/o/service-tiers%2F1752142005263_suv%20(1).png?alt=media&token=7d5d01b9-9acb-45c6-9021-be9b57b3cb53',
    capacity: { passengers: 7, suitcases: 5 },
    'data-ai-hint': 'passenger van'
  },
];


export default function LandingPage() {
  const router = useRouter();

  const handleSeeVehicles = (details: BookingDetails) => {
    const queryParams = new URLSearchParams();
    queryParams.set('pickup', details.pickup);
    queryParams.set('dropoff', details.dropoff);
    details.stops.forEach(stop => stop.address && queryParams.append('stop', stop.address));
    if (details.scheduledTime) {
      queryParams.set('scheduledTime', details.scheduledTime.toISOString());
    }

    router.push(`/book/select-vehicle?${queryParams.toString()}`);
  }


  return (
    <div className="flex flex-col min-h-dvh">
      <LandingHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-r from-[#223aff] to-[#006df1]">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_500px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-white font-headline">
                    Votre chauffeur VTC de confiance
                  </h1>
                  <p className="max-w-[600px] text-gray-200 md:text-xl">
                    Réservez votre course en quelques clics. Profitez d'un service ponctuel, professionnel et confortable.
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="p-0.5 bg-gradient-to-br from-primary to-[#006df1] rounded-xl w-full max-w-md">
                  <div className="bg-white/60 p-6 rounded-lg shadow-lg w-full">
                    <BookingForm onSubmit={handleSeeVehicles} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="w-full py-12 md:py-16 lg:py-20 bg-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Comment ça marche ?</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Simple, rapide et efficace.</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Trois étapes faciles pour vous rendre à votre destination.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 mt-12">
              <div className="grid gap-1 text-center">
                 <div className="flex justify-center items-center mb-4">
                    <div className="bg-primary/10 text-primary p-4 rounded-full">
                        <Smartphone className="h-8 w-8" />
                    </div>
                 </div>
                <h3 className="text-lg font-bold">1. Demandez</h3>
                <p className="text-sm text-muted-foreground">
                  Entrez votre destination et choisissez votre gamme de véhicule directement depuis notre site.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                 <div className="flex justify-center items-center mb-4">
                    <div className="bg-primary/10 text-primary p-4 rounded-full">
                        <Car className="h-8 w-8" />
                    </div>
                 </div>
                <h3 className="text-lg font-bold">2. Voyagez</h3>
                <p className="text-sm text-muted-foreground">
                  Votre chauffeur vient vous chercher. Profitez d'un trajet confortable et en toute sécurité.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                 <div className="flex justify-center items-center mb-4">
                    <div className="bg-primary/10 text-primary p-4 rounded-full">
                        <CreditCard className="h-8 w-8" />
                    </div>
                 </div>
                <h3 className="text-lg font-bold">3. Payez</h3>
                <p className="text-sm text-muted-foreground">
                  Le paiement est simple et sécurisé. Une fois arrivé, vous recevez votre reçu par email.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Fleet Section */}
        <section id="fleet" className="w-full py-12 md:py-16 lg:py-20">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                 <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Notre Flotte</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Un véhicule pour chaque occasion.</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  De la berline élégante au van spacieux, nous avons le véhicule qu'il vous faut.
                </p>
              </div>
            </div>
            <div className="md:hidden mt-8">
                <Carousel
                    opts={{
                        align: "start",
                    }}
                    className="w-full"
                >
                    <CarouselContent>
                        {staticTiers.map((tier) => (
                            <CarouselItem key={tier.id} className="basis-11/12">
                                <Card className="overflow-hidden">
                                  <CardContent className="p-0">
                                    <div className="aspect-video w-full border-b">
                                      <Image
                                        src={tier.photoUrl}
                                        alt={`Photo de ${tier.name}`}
                                        data-ai-hint={tier['data-ai-hint']}
                                        width={400}
                                        height={225}
                                        className="h-full w-full object-contain"
                                      />
                                    </div>
                                    <div className="p-4">
                                      <CardTitle className="font-headline text-lg">{tier.name}</CardTitle>
                                      <div className="flex items-center gap-3 text-sm font-semibold text-foreground mt-2">
                                        <div className="flex items-center gap-1"><Users className="h-4 w-4" />{tier.capacity.passengers}</div>
                                        <div className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{tier.capacity.suitcases}</div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            </div>
            <div className="hidden md:grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-12">
              {staticTiers.map((tier) => (
                <Card key={tier.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="aspect-video w-full border-b">
                      <Image
                        src={tier.photoUrl}
                        alt={`Photo de ${tier.name}`}
                        data-ai-hint={tier['data-ai-hint']}
                        width={400}
                        height={225}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="p-4">
                      <CardTitle className="font-headline text-lg">{tier.name}</CardTitle>
                      <div className="flex items-center gap-3 text-sm font-semibold text-foreground mt-2">
                        <div className="flex items-center gap-1"><Users className="h-4 w-4" />{tier.capacity.passengers}</div>
                        <div className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{tier.capacity.suitcases}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        
        {/* Why Choose Us Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
            <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-10">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">L'excellence, notre standard.</h2>
                    <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                        Nous nous engageons à vous offrir une expérience de transport irréprochable.
                    </p>
                </div>
                <div className="grid gap-4">
                    <div className="flex items-start gap-4">
                        <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                        <div>
                            <h3 className="text-lg font-bold">Chauffeurs Professionnels</h3>
                            <p className="text-sm text-muted-foreground">Nos chauffeurs sont expérimentés, courtois et formés pour vous garantir un service de qualité.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                        <div>
                            <h3 className="text-lg font-bold">Disponibilité 24/7</h3>
                            <p className="text-sm text-muted-foreground">Commandez une course à tout moment, de jour comme de nuit. Nous sommes toujours là pour vous.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                        <div>
                            <h3 className="text-lg font-bold">Tarifs Transparents</h3>
                            <p className="text-sm text-muted-foreground">Pas de mauvaise surprise. Le prix de votre course est fixe et connu à l'avance.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>


        {/* Testimonials Section */}
        <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                 <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Témoignages</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Nos clients nous adorent.</h2>
                 <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Découvrez pourquoi nos clients choisissent missray cab pour leurs déplacements.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 mt-12">
              <Card>
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-2">
                    <Star className="w-5 h-5 fill-primary text-primary" />
                    <Star className="w-5 h-5 fill-primary text-primary" />
                    <Star className="w-5 h-5 fill-primary text-primary" />
                    <Star className="w-5 h-5 fill-primary text-primary" />
                    <Star className="w-5 h-5 fill-primary text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    "Service impeccable. Chauffeur à l'heure, voiture propre et trajet agréable. Je recommande vivement !"
                  </p>
                   <p className="font-semibold mt-4">Sophie L.</p>
                </CardContent>
              </Card>
               <Card>
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-2">
                    <Star className="w-5 h-5 fill-primary text-primary" />
                    <Star className="w-5 h-5 fill-primary text-primary" />
                    <Star className="w-5 h-5 fill-primary text-primary" />
                    <Star className="w-5 h-5 fill-primary text-primary" />
                    <Star className="w-5 h-5 fill-primary text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    "Très pratique pour mes déplacements professionnels. L'application est simple et les chauffeurs sont très pros."
                  </p>
                   <p className="font-semibold mt-4">Julien M.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-2">
                    <Star className="w-5 h-5 fill-primary text-primary" />
                    <Star className="w-5 h-5 fill-primary text-primary" />
                    <Star className="w-5 h-5 fill-primary text-primary" />
                    <Star className="w-5 h-5 fill-primary text-primary" />
                    <Star className="w-5 h-5 fill-primary text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    "La meilleure solution pour aller à l'aéroport. Ponctualité et sérénité garanties. Je ne prends plus que ça."
                  </p>
                   <p className="font-semibold mt-4">Caroline D.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 border-t">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">Prêt à partir ?</h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                N'attendez plus. Réservez votre chauffeur et voyagez l'esprit tranquille.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
              <Button asChild type="submit" size="lg" className="w-full">
                <Link href="/signup">Créer un compte et réserver</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
