import * as React from "react"
import { cn } from "../../lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    readonly variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "gradient"
    readonly size?: "default" | "sm" | "lg" | "icon"
    readonly isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", isLoading, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 hover:scale-[1.02]",
                    {
                        "bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:bg-primary/90": variant === "default",
                        "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90": variant === "destructive",
                        "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm": variant === "outline",
                        "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
                        "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
                        "text-primary underline-offset-4 hover:underline": variant === "link",
                        "gradient-primary text-white shadow-md hover:shadow-lg glow-hover": variant === "gradient",
                        "h-10 px-4 py-2": size === "default",
                        "h-9 rounded-lg px-3": size === "sm",
                        "h-12 rounded-2xl px-8 text-base": size === "lg",
                        "h-10 w-10 p-0": size === "icon",
                    },
                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
