'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider, useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from 'sonner';
import { cn } from '../lib/utils';
import { Menu } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { GlobalSpinner } from '../components/GlobalSpinner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      router.push('/login');
    }
  }, [loading, user, isAuthPage, router]);

  if (loading) return <div className="flex items-center justify-center h-screen bg-background text-foreground animate-pulse">Loading...</div>;

  if (!user && !isAuthPage) {
    return <div className="flex items-center justify-center h-screen bg-background text-foreground">Redirecting...</div>;
  }

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-muted/20 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-background border-b px-4 h-16 flex items-center justify-between sticky top-0 z-30">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">D</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight">Dairy Manager</h1>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        inter.className
      )}>
        <a href="#main-content" className="skip-to-content focus:z-50">Skip to main content</a>
        <AuthProvider>
          <AuthenticatedLayout>{children}</AuthenticatedLayout>
          <GlobalSpinner />
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
