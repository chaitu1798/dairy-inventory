import React, { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

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
                    <select
                        ref={ref}
                        id={id}
                        className={cn(
                            "flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm transition-all duration-200 appearance-none outline-none",
                            "placeholder:text-slate-400 focus:ring-4 focus:ring-primary/5 focus:border-primary",
                            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
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
                    >
                        {placeholder && <option value="" disabled>{placeholder}</option>}
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 group-focus-within:text-primary transition-colors">
                        <ChevronDown className="h-4 w-4" />
                    </div>
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

Select.displayName = 'Select';

export default Select;
