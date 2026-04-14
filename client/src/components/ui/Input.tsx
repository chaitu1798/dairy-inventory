import React, { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    readonly label: string;
    readonly error?: FieldError;
    readonly helperText?: string;
    readonly startAdornment?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className, helperText, startAdornment, ...props }, ref) => {
        const id = props.id || props.name;
        
        return (
            <div className="w-full space-y-1.5 group">
                <label
                    htmlFor={id}
                    className="text-[13px] font-semibold text-slate-700 ml-1 transition-colors group-focus-within:text-primary"
                >
                    {label}
                </label>
                <div className="relative">
                    {startAdornment && (
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors flex items-center pointer-events-none">
                            {startAdornment}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={id}
                        className={cn(
                            "flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm transition-all duration-200",
                            "placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary",
                            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
                            startAdornment && "pl-11",
                            error && "border-destructive focus:ring-destructive/5 focus:border-destructive",
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
                        className="text-[11px] text-slate-500 ml-1 font-medium"
                    >
                        {helperText}
                    </p>
                )}
                {error && (
                    <p
                        id={`${props.name}-error`}
                        className="text-[12px] font-medium text-destructive ml-1 fade-up"
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
