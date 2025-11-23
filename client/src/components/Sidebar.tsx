'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, TrendingUp, DollarSign, FileBarChart, LogOut, X, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';

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
        { href: '/expenses', label: 'Expenses', icon: DollarSign },
        { href: '/waste', label: 'Waste', icon: Trash2 },
        { href: '/reports/daily', label: 'Daily Report', icon: FileBarChart },
        { href: '/reports/monthly', label: 'Monthly Report', icon: FileBarChart },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar Content */}
            <div className={clsx(
                "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white transform transition-transform duration-200 ease-in-out flex flex-col h-full lg:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                <div className="p-6 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-blue-400">Dairy Manager</h1>
                    <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                    {links.map((link) => {
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={onClose}
                                className={clsx(
                                    'flex items-center px-4 py-3 rounded-lg transition-colors',
                                    pathname === link.href
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                )}
                            >
                                <Icon className="w-5 h-5 mr-3" />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={logout}
                        className="flex items-center w-full px-4 py-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Logout
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
