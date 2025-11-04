
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  title: 'ChronoPay - Timesheet & Invoice Management',
  description: 'Professional timesheet tracking and invoice generation made easy. Manage your projects, clients, and billing efficiently.',
  applicationName: 'ChronoPay',
  keywords: ['timesheet', 'invoice', 'billing', 'time tracking', 'project management', 'freelance'],
  authors: [{ name: 'ChronoPay' }],
  creator: 'ChronoPay',
  publisher: 'ChronoPay',
  metadataBase: new URL('https://chronopay.app'),
  openGraph: {
    title: 'ChronoPay - Timesheet & Invoice Management',
    description: 'Professional timesheet tracking and invoice generation made easy',
    type: 'website',
    locale: 'en_US',
    siteName: 'ChronoPay',
  },
  twitter: {
    card: 'summary',
    title: 'ChronoPay - Timesheet & Invoice Management',
    description: 'Professional timesheet tracking and invoice generation made easy',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <FirebaseClientProvider>
            {children}
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
