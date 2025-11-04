
import type { ReactNode } from 'react';
import { Header } from '@/components/layout/header';
import { AuthGuard } from '@/components/layout/auth-guard';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          {children}
        </main>
        <footer className="py-4 px-4 text-center text-sm text-muted-foreground md:px-8">
          <p>&copy; {new Date().getFullYear()} TechWare. All rights reserved.</p>
        </footer>
      </div>
    </AuthGuard>
  );
}
