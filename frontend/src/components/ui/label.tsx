import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Rotulo de campo da marca GGPost: 13px, peso medio, texto secundario —
 * o mesmo que o GGPost desenha acima de Input, Select e campo de data.
 */
const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("block text-[13px] font-medium text-[var(--color-text-secondary)]", className)}
      {...props}
    />
  ),
)
Label.displayName = "Label"

export { Label }
