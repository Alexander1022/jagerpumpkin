import * as React from "react"

import { cn } from "@/lib/utils"

function Avatar({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar"
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-foreground ring-1 ring-border",
        className
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-fallback"
      className={cn("inline-flex items-center justify-center uppercase", className)}
      {...props}
    />
  )
}

export { Avatar, AvatarFallback }
