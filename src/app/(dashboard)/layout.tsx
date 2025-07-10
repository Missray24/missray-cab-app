
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  CircleUser,
  LayoutDashboard,
  CalendarCheck,
  Users,
  Layers,
  Map,
  Settings,
  LogOut,
  TrendingUp,
  Banknote,
  CarFront,
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
import { auth } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

const ADMIN_EMAIL = 'contact@missray-cab.com';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/reservations', icon: CalendarCheck, label: 'Réservations' },
  { href: '/clients', icon: Users, label: 'Clients' },
  { href: '/drivers', icon: CarFront, label: 'Chauffeurs' },
  { href: '/earnings', icon: TrendingUp, label: 'Revenus' },
  { href: '/payouts', icon: Banknote, label: 'Paiements' },
  { href: '/tiers', icon: Layers, label: 'Gammes' },
  { href: '/zones', icon: Map, label: 'Zones' },
  { href: '/settings', icon: Settings, label: 'Paramètres' },
];

function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<FirebaseUser | null>(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email === ADMIN_EMAIL) {
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


function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const checkActivePath = useActivePath();
  const { isMobile, state, setOpen, setOpenMobile } = useSidebar();
  const router = useRouter();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else if (state === 'expanded') {
      // setOpen(false);
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
          <Link href="/dashboard" className="flex items-center gap-2">
            <h2 className="text-lg font-headline font-semibold group-data-[state=collapsed]:hidden">missray cab</h2>
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
                  <Link href={item.href}>
                    <item.icon />
                    <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
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
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/settings">Settings</Link></DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
        <SidebarProvider>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </SidebarProvider>
    </AuthProvider>
  );
}
