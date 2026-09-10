import { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  href?: string
  detail?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  href,
  detail,
  trend,
  className,
}: StatCardProps) {
  const content = (
    <Card
      className={cn(
        "group overflow-hidden border-border/80 bg-card/90 shadow-[0_12px_30px_rgba(1,10,20,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-ring/35 hover:shadow-[0_18px_40px_rgba(1,10,20,0.22)]",
        href && "cursor-pointer",
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {detail && (
              <div className="text-xs text-muted-foreground leading-4">{detail}</div>
            )}
            {trend && (
              <p
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-orange-600" : "text-red-600"
                )}
              >
                {trend.isPositive ? "+" : "-"}
                {trend.value}% ce mois
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-inner transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
