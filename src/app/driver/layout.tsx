
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  CircleUser,
  LayoutDashboard,
  CalendarCheck,
  LogOut,
  TrendingUp,
  Settings,
  Car,
  FileText,
  BellRing,
} from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useActivePath } from '@/hooks/use-active-path';
import { auth, db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { href: '/driver/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/driver/new-rides', icon: BellRing, label: 'Nouvelles courses', id: 'new-rides' },
  { href: '/driver/reservations', icon: CalendarCheck, label: 'Mes Courses' },
  { href: '/driver/earnings', icon: TrendingUp, label: 'Mes Revenus' },
  { href: '/driver/vehicles', icon: Car, label: 'Mes Véhicules' },
  { href: '/driver/documents', icon: FileText, label: 'Mes Documents' },
  { href: '/driver/settings', icon: Settings, label: 'Profil' },
];

function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<FirebaseUser | null>(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // This is a simplified check. A proper implementation should query
        // a 'users' collection in Firestore to verify the user's role.
        // For now, we assume if the user is logged in, they are a driver.
        setUser(firebaseUser);
      } else {
        setUser(null);
        router.replace('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
            </div>
        </div>
    );
  }

  if (!user) {
    return null; // The redirect is handled in the effect
  }

  return <>{children}</>;
}


function DriverLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const checkActivePath = useActivePath();
  const { isMobile, state, setOpenMobile } = useSidebar();
  const router = useRouter();
  const [newRidesCount, setNewRidesCount] = React.useState(0);

  React.useEffect(() => {
    const q = query(collection(db, "reservations"), where("status", "==", "Nouvelle demande"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        setNewRidesCount(querySnapshot.size);
    });

    return () => unsubscribe();
  }, []);

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link href="/driver/dashboard" className="flex items-center gap-2">
            <h2 className="text-lg font-headline font-semibold group-data-[state=collapsed]:hidden uppercase bg-gradient-to-r from-white/90 to-white/60 bg-clip-text text-transparent">
                MISSRAY CAB
            </h2>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={checkActivePath(item.href)}
                  tooltip={item.label}
                  onClick={handleLinkClick}
                >
                  <Link href={item.href} className="relative">
                    <item.icon />
                    <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
                     {item.id === 'new-rides' && newRidesCount > 0 && (
                        <Badge className="absolute right-2 top-1/2 -translate-y-1/2 h-5 group-data-[state=collapsed]:hidden bg-destructive">
                            {newRidesCount}
                        </Badge>
                     )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut />
                <span className="group-data-[state=collapsed]:hidden">Déconnexion</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:px-6 sticky top-0 z-30">
          <SidebarTrigger />
          <div className="w-full flex-1">
            {/* Can add a search bar here if needed */}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <CircleUser className="h-5 w-5" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/driver/settings">Profil</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Déconnexion</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}


export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
        <SidebarProvider>
          <DriverLayoutContent>{children}</DriverLayoutContent>
        </SidebarProvider>
    </AuthProvider>
  );
}
