import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
};

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
    ({ className, size = 'md', ...props }, ref) => {
        return (
            <div ref={ref} className={cn("flex justify-center items-center", className)} {...props}>
                <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
                <span className="sr-only">Loading...</span>
            </div>
        );
    }
);
Spinner.displayName = 'Spinner';
