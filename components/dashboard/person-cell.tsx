"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function initials(name: string): string {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return "?"
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
}

export function PersonCell({
  name,
  avatarUrl,
  subtitle,
}: {
  name: string
  avatarUrl?: string
  subtitle?: string
}) {
  return (
    <div className="flex min-w-[180px] items-center gap-3">
      <Avatar className="size-8">
        <AvatarImage src={avatarUrl || undefined} alt={name} />
        <AvatarFallback className="text-[11px]">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="truncate font-medium">{name || "-"}</div>
        {subtitle ? <div className="truncate text-xs text-muted-foreground">{subtitle}</div> : null}
      </div>
    </div>
  )
}
