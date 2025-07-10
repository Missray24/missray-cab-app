
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Car, CircleUser, CalendarCheck, LogOut, LayoutDashboard } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { auth, db } from '@/lib/firebase';
import { Skeleton } from './ui/skeleton';

const ADMIN_EMAIL = 'contact@missray-cab.com';

// Extend the Firebase User type to include our custom 'name' field
interface AppUser extends User {
    name?: string;
}

export function LandingHeader() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
          // If a user is logged in, fetch their details from Firestore
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("uid", "==", currentUser.uid));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
              const userDoc = querySnapshot.docs[0].data();
              // Combine Firebase Auth user with Firestore data
              setUser({ ...currentUser, name: userDoc.name });
          } else {
              // Fallback to just the Auth user if no Firestore doc is found
              setUser(currentUser);
          }
      } else {
          setUser(null);
      }
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
  
  const loginHref = `/login?${searchParams.toString()}`;
  const signupHref = `/signup?${searchParams.toString()}`;


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
          <Link href={loginHref} className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            Se connecter
          </Link>
          <Button asChild>
            <Link href={signupHref} prefetch={false}>
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
          <DropdownMenuLabel>{user.name || user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isClient && (
             <DropdownMenuItem asChild>
                <Link href="/my-bookings">
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    <span>Mes réservations</span>
                </Link>
             </DropdownMenuItem>
          )}
           {isAdmin && (
             <DropdownMenuItem asChild>
                <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
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
      <Link href="/" className="flex items-center justify-center gap-2" prefetch={false}>
        <span className="text-lg font-bold font-headline uppercase bg-gradient-to-r from-[#223aff] to-[#1697ff] bg-clip-text text-transparent">MISSRAY CAB</span>
      </Link>
      <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
        {renderUserMenu()}
      </nav>
    </header>
  );
}
