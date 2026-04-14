'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    Package, 
    ShoppingCart, 
    TrendingUp, 
    DollarSign, 
    FileBarChart, 
    X, 
    Trash2, 
    Users, 
    ChevronRight,
    UserCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

interface SidebarProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const pathname = usePathname();
    const { user } = useAuth();

    const menuGroups = [
        {
            title: "Overview",
            links: [
                { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/products', label: 'Products', icon: Package },
                { href: '/customers', label: 'Customers', icon: Users },
                { href: '/accounts-receivable', label: 'Accounts Receivable', icon: DollarSign },
            ]
        },
        {
            title: "Transactions",
            links: [
                { href: '/sales', label: 'Sales', icon: TrendingUp },
                { href: '/purchases', label: 'Purchases', icon: ShoppingCart },
                { href: '/expenses', label: 'Expenses', icon: DollarSign },
            ]
        },
        {
            title: "Management & Reports",
            links: [
                { href: '/waste', label: 'Waste', icon: Trash2 },
                { href: '/reports/daily', label: 'Daily Report', icon: FileBarChart },
                { href: '/reports/monthly', label: 'Monthly Report', icon: FileBarChart },
            ]
        }
    ];

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar Content */}
            <aside
                className={cn(
                    "fixed lg:static inset-y-0 left-0 z-50 w-72 sidebar-bg text-slate-300 transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col h-full lg:translate-x-0 border-r border-slate-800/50 shadow-2xl lg:shadow-none",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
                aria-label="Sidebar Navigation"
            >
                {/* Header Brand */}
                <div className="p-6 flex justify-between items-center shrink-0">
                    <Link href="/dashboard" className="flex items-center gap-3 group" onClick={onClose}>
                        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg group-hover:glow-hover transition-all duration-300">
                            <span className="text-white font-bold text-xl">D</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-white group-hover:text-primary transition-colors">Dairy OS</h1>
                    </Link>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="lg:hidden text-slate-400 hover:text-white hover:bg-white/10 rounded-full"
                        aria-label="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-4 py-4 space-y-8 overflow-y-auto scrollbar-modern">
                    {menuGroups.map((group, idx) => (
                        <div key={idx} className="space-y-2">
                            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                {group.title}
                            </p>
                            <ul className="space-y-1">
                                {group.links.map((link) => {
                                    const Icon = link.icon;
                                    const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                                    
                                    return (
                                        <li key={link.href}>
                                            <Link
                                                href={link.href}
                                                onClick={onClose}
                                                className={cn(
                                                    'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden',
                                                    isActive
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'hover:bg-white/5 hover:text-slate-100'
                                                )}
                                                aria-current={isActive ? 'page' : undefined}
                                            >
                                                {isActive && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-primary rounded-r-full" />
                                                )}
                                                
                                                <Icon className={cn(
                                                    "w-5 h-5 mr-3 shrink-0 transition-transform duration-200", 
                                                    isActive ? "text-primary scale-110" : "text-slate-500 group-hover:text-slate-300"
                                                )} aria-hidden="true" />
                                                
                                                <span className="flex-1 z-10">{link.label}</span>
                                                
                                                {!isActive && (
                                                    <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-slate-500" />
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                {/* User Footer Container */}
                <div className="p-4 shrink-0">
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-between hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-white/10">
                                <UserCircle className="w-6 h-6 text-slate-400" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-white truncate">{user?.email || 'Admin User'}</p>
                                <p className="text-xs text-slate-500">Manager Account</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
