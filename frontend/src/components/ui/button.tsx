import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Botão da marca GGPost: pílula de altura fixa, raio = metade da altura.
 *
 * As variantes leem os tokens de `index.css`. `ghost` e `icon` ficam
 * porque as telas deste sistema já as usam em 36 lugares; trocá-las
 * exigiria reescrever todas sem ganho visual.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-.006em] whitespace-nowrap transition-[background-color,color,translate] duration-200 active:translate-y-px disabled:opacity-50 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressionado)]",
        secondary:
          "text-[var(--color-text)] bg-[var(--color-preenchimento-2)] hover:bg-[var(--color-preenchimento-3)]",
        tint:
          "text-[var(--color-primary-hover)] bg-[var(--color-primary-bg)] hover:bg-[var(--color-primary-bg-hover)]",
        destructive:
          "text-white bg-[var(--color-danger)] hover:brightness-95",
        ghost:
          "text-[var(--color-nav-text)] hover:bg-[rgb(var(--tinta)/.055)]",
        outline:
          "border border-[var(--color-border)] text-[var(--color-text)] bg-transparent hover:bg-[var(--color-nav-hover)]",
        link:
          "text-[var(--color-primary)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        default: "h-10 px-4 text-sm",
        lg: "h-12 px-5 text-[15px]",
        // Quadrado, para ícone isolado (editar, excluir, fechar).
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
