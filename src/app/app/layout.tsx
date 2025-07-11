
import { Suspense, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { auth } from '@/lib/firebase';
import { AppHeader } from '@/components/app-header';
import type { Metadata } from 'next';

// Export metadata from the server component layout.
export const metadata: Metadata = {
  manifest: '/manifest-client.json',
};

// This AuthProvider is a client component that handles authentication checks.
function AuthProvider({ children }: { children: ReactNode }) {
  'use client';

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
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

  return (
    <div className="h-dvh w-full flex flex-col">
      <AppHeader />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

// AppLayout is the main Server Component for this route.
export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense>
        <AuthProvider>
          {children}
        </AuthProvider>
    </Suspense>
  );
}
