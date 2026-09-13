"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { formatDatesInText } from "@/lib/date-format"

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      router.push("/login")
    }
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-border/80 bg-background/90 px-6 py-3 shadow-[0_10px_30px_rgba(2,12,23,0.18)] backdrop-blur-xl">
      <div className="min-w-0 border-l-2 border-primary pl-3">
        <h1 className="truncate text-xl font-bold tracking-[-0.02em] text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{formatDatesInText(subtitle)}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleLogout} className="border-white/15 bg-white/[0.04] hover:border-primary/50 hover:bg-primary/10 hover:text-primary">
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </header>
  )
}
