import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} missray cab. Tous droits réservés.</p>
      </div>
      <nav className="sm:ml-auto flex gap-4 sm:gap-6">
        <Link href="/signup-driver" className="text-xs hover:underline underline-offset-4" prefetch={false}>
          Devenir chauffeur
        </Link>
        <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
          Termes et Conditions
        </Link>
        <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
          Politique de confidentialité
        </Link>
      </nav>
    </footer>
  );
}
