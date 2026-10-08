import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Campo de entrada da marca GGPost: preenchimento sem borda em repouso,
 * que ao foco vira superfície branca com anel da cor principal.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "w-full h-10 px-3.5 text-[15px] rounded-[12px] border border-transparent bg-[var(--color-preenchimento)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] hover:bg-[var(--color-preenchimento-2)] focus:outline-none focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_4px_rgba(55,128,157,.14)] disabled:opacity-60 disabled:cursor-not-allowed transition-[background-color,box-shadow,border-color] duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
