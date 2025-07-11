
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Menu, CircleUser, CalendarCheck, LogOut, LayoutDashboard, Settings, HandCoins, UserCog } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { auth, db } from '@/lib/firebase';
import { Skeleton } from './ui/skeleton';

interface AppUser extends User {
    name?: string;
    role?: 'client' | 'driver' | 'admin';
}

export function AppHeader() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("uid", "==", currentUser.uid));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
              const userDoc = querySnapshot.docs[0].data();
              setUser({ ...currentUser, name: userDoc.name, role: userDoc.role });
          } else {
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
    router.push('/login');
  };
  
  const navLinks = [
      { href: '/my-bookings', icon: CalendarCheck, label: 'Mes courses' },
      { href: '/app/profile', icon: UserCog, label: 'Mon profil' },
      { href: '/app/payment-methods', icon: HandCoins, label: 'Paiements' },
  ];

  return (
    <header className="px-4 lg:px-6 h-14 flex items-center bg-background/80 backdrop-blur-sm sticky top-0 z-50 border-b flex-shrink-0">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Ouvrir le menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
            <SheetHeader>
                <SheetTitle>
                    <Link href="/app" className="flex items-center justify-center gap-2" prefetch={false}>
                        <span className="text-lg font-bold font-headline uppercase bg-gradient-to-r from-[#223aff] to-[#006df1] bg-clip-text text-transparent">MISSRAY CAB</span>
                    </Link>
                </SheetTitle>
            </SheetHeader>
             <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="flex items-center gap-4 text-lg font-medium text-foreground hover:text-primary">
                        <link.icon className="h-6 w-6" />
                        {link.label}
                    </Link>
                ))}
            </nav>
            <div className="absolute bottom-4 left-4 right-4">
                 <Button onClick={handleLogout} variant="outline" className="w-full">
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                </Button>
            </div>
        </SheetContent>
      </Sheet>
      
      <Link href="/app" className="flex items-center justify-center gap-2 mx-auto" prefetch={false}>
        <span className="text-lg font-bold font-headline uppercase bg-gradient-to-r from-[#223aff] to-[#006df1] bg-clip-text text-transparent">MISSRAY CAB</span>
      </Link>
      
      <div className="w-10">
        {/* Placeholder to balance the menu icon */}
      </div>
    </header>
  );
}
