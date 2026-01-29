import React, { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: FieldError | undefined;
    helperText?: string;
    startAdornment?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className, helperText, startAdornment, ...props }, ref) => {
        return (
            <div className="w-full space-y-2">
                <label
                    htmlFor={props.id || props.name}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    {label}
                </label>
                <div className="relative">
                    {startAdornment && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center pointer-events-none">
                            {startAdornment}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={cn(
                            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
                            startAdornment && "pl-9",
                            error && "border-destructive focus-visible:ring-destructive",
                            className
                        )}
                        aria-invalid={error ? 'true' : 'false'}
                        aria-describedby={
                            error
                                ? `${props.name}-error`
                                : helperText
                                    ? `${props.name}-description`
                                    : undefined
                        }
                        {...props}
                    />
                </div>
                {helperText && !error && (
                    <p
                        id={`${props.name}-description`}
                        className="text-xs text-muted-foreground"
                    >
                        {helperText}
                    </p>
                )}
                {error && (
                    <p
                        id={`${props.name}-error`}
                        className="text-sm font-medium text-destructive animate-slide-down"
                        role="alert"
                    >
                        {error.message}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
