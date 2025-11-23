'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider, useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react'; // Added React import

const inter = Inter({ subsets: ['latin'] });

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  const router = useRouter(); // Ensure useRouter is imported from next/navigation

  React.useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      router.push('/login');
    }
  }, [loading, user, isAuthPage, router]);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (!user && !isAuthPage) {
    return <div className="flex items-center justify-center h-screen">Redirecting...</div>;
  }

  if (isAuthPage) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">{children}</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Dairy Manager</h1>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
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
      <body className={inter.className}>
        <AuthProvider>
          <AuthenticatedLayout>{children}</AuthenticatedLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
