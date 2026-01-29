'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, TrendingUp, DollarSign, FileBarChart, LogOut, X, Trash2, Users, UserCog } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const pathname = usePathname();
    const { logout } = useAuth();

    const links = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/products', label: 'Products', icon: Package },
        { href: '/purchases', label: 'Purchases', icon: ShoppingCart },
        { href: '/sales', label: 'Sales', icon: TrendingUp },
        { href: '/customers', label: 'Customers', icon: Users },
        { href: '/accounts-receivable', label: 'Accounts Receivable', icon: DollarSign },
        { href: '/expenses', label: 'Expenses', icon: DollarSign },
        { href: '/waste', label: 'Waste', icon: Trash2 },
        { href: '/reports/daily', label: 'Daily Report', icon: FileBarChart },
        { href: '/reports/monthly', label: 'Monthly Report', icon: FileBarChart },
        { href: '/admin/users', label: 'User Management', icon: UserCog },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden transition-opacity",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar Content */}
            <aside
                className={cn(
                    "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 transform transition-transform duration-200 ease-in-out flex flex-col h-full lg:translate-x-0 border-r border-slate-800",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
                aria-label="Sidebar Navigation"
            >
                <div className="p-6 flex justify-between items-center border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-lg">D</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">Dairy Manager</h1>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="lg:hidden text-slate-400 hover:text-white hover:bg-slate-800"
                        aria-label="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
                    <ul className="space-y-1">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;
                            return (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        onClick={onClose}
                                        className={cn(
                                            'flex items-center px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden',
                                            isActive
                                                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                        )}
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        <Icon className={cn("w-5 h-5 mr-3 shrink-0 transition-transform duration-200", isActive && "scale-110")} aria-hidden="true" />
                                        <span className="relative z-10">{link.label}</span>
                                        {isActive && <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-20" />}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="p-4 border-t border-slate-800 lg:pb-4 pb-8">
                    <button
                        onClick={logout}
                        className="flex items-center w-full px-4 py-3.5 text-sm font-medium text-slate-400 hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive group"
                        aria-label="Logout"
                    >
                        <LogOut className="w-5 h-5 mr-3 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
