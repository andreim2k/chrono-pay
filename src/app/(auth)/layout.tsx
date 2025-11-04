
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        {children}
      </main>
      <footer className="py-4 px-4 text-center text-sm text-muted-foreground md:px-8">
        <p>&copy; {new Date().getFullYear()} TechWare. All rights reserved.</p>
      </footer>
    </div>
  );
}
