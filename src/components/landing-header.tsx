
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { Car, CircleUser, CalendarCheck, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { auth } from '@/lib/firebase';
import { Skeleton } from './ui/skeleton';

const ADMIN_EMAIL = 'contact@missray-cab.com';

export function LandingHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const isClient = user && user.email !== ADMIN_EMAIL;
  const isAdmin = user && user.email === ADMIN_EMAIL;

  const renderUserMenu = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      );
    }
    
    if (!user) {
      return (
        <>
          <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            Se connecter
          </Link>
          <Button asChild>
            <Link href="/signup" prefetch={false}>
              S'inscrire
            </Link>
          </Button>
        </>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <CircleUser className="h-5 w-5" />
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isClient && (
             <DropdownMenuItem asChild>
                <Link href="/book/confirmation?id=">
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    <span>Mes réservations</span>
                </Link>
             </DropdownMenuItem>
          )}
           {isAdmin && (
             <DropdownMenuItem asChild>
                <Link href="/dashboard">
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    <span>Tableau de bord</span>
                </Link>
             </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
             <LogOut className="mr-2 h-4 w-4" />
             <span>Déconnexion</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <header className="px-4 lg:px-6 h-14 flex items-center bg-background/80 backdrop-blur-sm sticky top-0 z-50 border-b">
      <Link href="/" className="flex items-center justify-center" prefetch={false}>
        <Car className="h-6 w-6 text-primary" />
        <span className="ml-2 text-lg font-bold font-headline">missray cab</span>
      </Link>
      <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
        {renderUserMenu()}
      </nav>
    </header>
  );
}
