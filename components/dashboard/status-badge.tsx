import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusStyles: Record<string, string> = {
  actif: "border border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  active: "border border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  inactif: "border border-red-400/25 bg-red-400/10 text-red-300",
  inactive: "border border-red-400/25 bg-red-400/10 text-red-300",
  suspendu: "border border-yellow-300/25 bg-yellow-300/10 text-yellow-200",
  suspended: "border border-yellow-300/25 bg-yellow-300/10 text-yellow-200",
  en_attente: "border border-sky-400/25 bg-sky-400/10 text-sky-300",
  pending: "border border-sky-400/25 bg-sky-400/10 text-sky-300",
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, "_") || ""
  const style = statusStyles[normalizedStatus] || "border border-white/15 bg-white/[0.06] text-slate-300"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        style,
        className
      )}
    >
      {status || "-"}
    </span>
  )
}
