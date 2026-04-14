'use client';

import './globals.css';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { AuthProvider, useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from 'sonner';
import { cn } from '../lib/utils';
import { Menu, LogOut, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { GlobalSpinner } from '../components/GlobalSpinner';

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-sans',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

function AuthenticatedLayout({ children }: { readonly children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      router.push('/login');
    }
  }, [loading, user, isAuthPage, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <GlobalSpinner />
      </div>
    );
  }

  if (!user && !isAuthPage) {
    return <div className="flex items-center justify-center h-screen bg-background text-foreground">Redirecting...</div>;
  }

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md fade-up">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - Desktop (Fixed) & Mobile (Overlay) */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 md:px-8 shrink-0">
          <div className="flex flex-1 items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Breadcrumb or Search Placeholder */}
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <span className="capitalize">{pathname.split('/')[1] || 'Dashboard'}</span>
              {pathname.split('/').length > 2 && (
                <>
                  <span>/</span>
                  <span className="text-foreground capitalize">{pathname.split('/').pop()}</span>
                </>
              )}
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border text-sm font-medium">
              <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-[10px] text-white">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[150px] truncate">{user?.email}</span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              className="text-muted-foreground hover:text-destructive transition-colors rounded-full"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Main Content Container */}
        <main id="main-content" className="flex-1 overflow-y-auto scroll-smooth scrollbar-modern">
          <div className="max-w-[1600px] mx-auto p-4 md:p-8 lg:p-10 fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(plusJakartaSans.variable, inter.variable)}>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground selection:bg-primary/10 selection:text-primary">
        <a href="#main-content" className="skip-to-content focus:z-50">Skip to main content</a>
        <AuthProvider>
          <AuthenticatedLayout>{children}</AuthenticatedLayout>
          <Toaster position="top-right" richColors closeButton toastOptions={{
            style: {
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-lg)',
            }
          }} />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
