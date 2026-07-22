import type { ReactNode } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function DashboardSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="space-y-4 border-t border-border pt-6" aria-labelledby={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}>
    <div><h2 id={`section-${title.replace(/\s+/g, "-").toLowerCase()}`} className="text-lg font-semibold">{title}</h2>{description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}</div>
    {children}
  </section>
}

export function StatGrid({ children }: { children: ReactNode }) { return <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">{children}</div> }

export function StatValue({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return <div className="min-h-32 bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>{detail ? <p className="mt-2 text-xs text-muted-foreground">{detail}</p> : null}</div>
}

export type AnalyticsColumn<T> = { key: string; label: string; align?: "left" | "right"; render?: (row: T) => ReactNode }
export function AnalyticsTable<T extends Record<string, unknown>>({ columns, rows, empty = "Aucune donnée disponible." }: { columns: AnalyticsColumn<T>[]; rows: T[]; empty?: string }) {
  return <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow>{columns.map((column) => <TableHead key={column.key} className={column.align === "right" ? "text-right" : undefined}>{column.label}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.length ? rows.map((row, index) => <TableRow key={[row.id, row.block, row.label, row.field, index].filter((value) => value != null).join("::")}>{columns.map((column) => <TableCell key={column.key} className={column.align === "right" ? "text-right tabular-nums" : undefined}>{column.render ? column.render(row) : String(row[column.key] ?? "-")}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">{empty}</TableCell></TableRow>}</TableBody></Table></div>
}

export function StatusText({ children, level = "neutral" }: { children: ReactNode; level?: "good" | "warning" | "critical" | "neutral" }) {
  const className = level === "good" ? "text-emerald-700" : level === "critical" ? "text-red-700" : level === "warning" ? "text-amber-700" : "text-foreground"
  return <span className={className}>{children}</span>
}

export function EmptyAnalyticsState({ children }: { children: ReactNode }) { return <div className="rounded-lg border p-6 text-sm text-muted-foreground">{children}</div> }
