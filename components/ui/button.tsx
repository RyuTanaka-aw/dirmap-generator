import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-primary-500/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary-500 text-white rounded-lg hover:bg-primary-700",
        destructive: "bg-red-500 text-white rounded-lg hover:bg-red-600",
        outline: "bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-gray-50",
        secondary: "bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200",
        ghost: "text-body rounded-lg hover:bg-gray-50",
        link: "text-primary-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 text-[1rem]",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-lg px-3 text-[0.875rem]",
        lg: "h-12 rounded-lg px-6 text-[1rem]",
        icon: "size-10 rounded-lg",
        "icon-xs": "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
