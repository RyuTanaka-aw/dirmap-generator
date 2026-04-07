import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full px-3 py-2 text-base border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 transition-[box-shadow] outline-none",
        "focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 caret-primary-500",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
