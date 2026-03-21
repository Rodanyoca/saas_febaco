import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface DetailField {
  label: string
  value: string | number | null | undefined
}

interface DetailCardProps {
  title: string
  icon?: LucideIcon
  fields: DetailField[]
}

export function DetailCard({ title, icon: Icon, fields }: DetailCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map((field, index) => (
          <div key={index} className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">{field.label}</span>
            <span className="text-sm font-medium text-foreground text-right max-w-[60%]">
              {field.value ?? "-"}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
