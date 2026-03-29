"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, checked, ...props }, ref) => {
    return (
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-background checked:bg-primary",
            className
          )}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props}
        />
        <Check className="pointer-events-none absolute h-3 w-3 text-primary-foreground opacity-0 peer-checked:opacity-100" />
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
