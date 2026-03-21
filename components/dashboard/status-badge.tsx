import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusStyles: Record<string, string> = {
  actif: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  inactif: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  inactive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  suspendu: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  suspended: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  en_attente: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, "_") || ""
  const style = statusStyles[normalizedStatus] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"

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
