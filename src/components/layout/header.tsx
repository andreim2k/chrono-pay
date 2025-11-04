
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from './theme-toggle';
import { LogOut, Menu, LayoutDashboard, FileText, BarChart, Settings as SettingsIcon, Clock } from 'lucide-react';
import { ChronoPayLogo } from '../icons';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { MainNav } from './main-nav';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const mainNav = [
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard /> },
    { name: 'Timecards', href: '/timecards', icon: <Clock /> },
    { name: 'Invoices', href: '/invoices', icon: <FileText /> },
    { name: 'Reports', href: '/reports', icon: <BarChart /> },
];

const mobileNav = [
  ...mainNav,
  { name: 'Settings', href: '/settings', icon: <SettingsIcon /> },
];


export function Header() {
  const pathname = usePathname();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 md:px-6">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-semibold md:text-base"
        >
          <ChronoPayLogo className="h-8 w-8 text-primary" />
          <span className="">ChronoPay</span>
        </Link>
        <MainNav navItems={mainNav} />
      </nav>

      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <ChronoPayLogo className="h-8 w-8 text-primary" />
              <span className="">ChronoPay</span>
            </Link>
            {mobileNav.map(item => (
                <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 transition-colors hover:text-foreground ${pathname.startsWith(item.href) ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {React.cloneElement(item.icon, { className: 'h-4 w-4' })}
                {item.name}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>


      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
         <Link href="/settings">
            <Button
                variant={pathname.startsWith('/settings') ? 'secondary' : 'ghost'}
                size="icon"
                className="hidden md:inline-flex"
            >
                <SettingsIcon className="h-5 w-5" />
                <span className="sr-only">Settings</span>
            </Button>
        </Link>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || ''} />
                  <AvatarFallback>
                    {user?.displayName
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
