import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    readonly variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "premium"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                {
                    "border-transparent bg-primary/10 text-primary": variant === "default",
                    "border-transparent bg-slate-100 text-slate-600": variant === "secondary",
                    "border-transparent bg-rose-50 text-rose-600": variant === "destructive",
                    "border-slate-200 text-slate-500": variant === "outline",
                    "border-transparent bg-emerald-50 text-emerald-600": variant === "success",
                    "border-transparent bg-amber-50 text-amber-600": variant === "warning",
                    "border-transparent gradient-primary text-white shadow-sm ring-1 ring-blue-500/25": variant === "premium",
                },
                className
            )}
            {...props}
        />
    )
}

export { Badge }
