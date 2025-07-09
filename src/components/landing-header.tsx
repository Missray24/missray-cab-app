import Link from 'next/link';
import { Car } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingHeader() {
  return (
    <header className="px-4 lg:px-6 h-14 flex items-center bg-background/80 backdrop-blur-sm sticky top-0 z-50 border-b">
      <Link href="/" className="flex items-center justify-center" prefetch={false}>
        <Car className="h-6 w-6 text-primary" />
        <span className="ml-2 text-lg font-bold font-headline">missray cab</span>
      </Link>
      <nav className="ml-auto flex gap-4 sm:gap-6">
        <Link
          href="/login"
          className="text-sm font-medium hover:underline underline-offset-4"
          prefetch={false}
        >
          Se connecter
        </Link>
        <Button asChild>
          <Link href="/signup" prefetch={false}>
            S'inscrire
          </Link>
        </Button>
      </nav>
    </header>
  );
}
