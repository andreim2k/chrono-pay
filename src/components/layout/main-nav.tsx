'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';
import React from 'react';

interface MainNavProps {
    navItems: {
        name: string;
        href: string;
        icon: ReactElement;
    }[];
}

export function MainNav({ navItems }: MainNavProps) {
    const pathname = usePathname();
    return (
        <>
            {navItems.map(item => (
                <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 transition-colors hover:text-foreground ${pathname.startsWith(item.href) ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                    {React.cloneElement(item.icon, { className: 'h-4 w-4' })}
                    {item.name}
                </Link>
            ))}
        </>
    );
}
