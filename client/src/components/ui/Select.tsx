import React, { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';
import { cn } from '../../lib/utils';

export interface SelectOption {
    readonly value: string;
    readonly label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    readonly label: string;
    readonly options: readonly SelectOption[];
    readonly error?: FieldError;
    readonly placeholder?: string;
    readonly helperText?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, options, error, placeholder, className, helperText, ...props }, ref) => {
        return (
            <div className="w-full space-y-2">
                <label
                    htmlFor={props.id || props.name}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    {label}
                </label>
                <div className="relative">
                    <select
                        ref={ref}
                        className={cn(
                            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none transition-colors",
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
                    >
                        {placeholder && <option value="">{placeholder}</option>}
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {/* Chevron Icon for better styling since we removed default appearance */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                    </div>
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

Select.displayName = 'Select';

export default Select;
