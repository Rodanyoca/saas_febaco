"use client"

import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ligues, Ligue, getFilterOptions } from "@/lib/demo-data"

const columns: Column<Ligue>[] = [
  { key: "id", header: "ID Ligue", className: "font-mono text-sm" },
  { key: "nom", header: "Nom Ligue", className: "font-medium" },
  { key: "pseudo", header: "Pseudo", className: "text-muted-foreground" },
  { key: "province", header: "Province" },
  {
    key: "statut",
    header: "Statut",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

const filters: Filter[] = [
  {
    key: "province",
    label: "Province",
    options: getFilterOptions(ligues, "province"),
  },
  {
    key: "statut",
    label: "Statut",
    options: getFilterOptions(ligues, "statut"),
  },
]

export default function LiguesPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="Ligues"
        subtitle="Liste des ligues provinciales affiliées à la FECOBASKET"
      />

      <div className="flex-1 p-6">
        <DataTable
          data={ligues}
          columns={columns}
          filters={filters}
          searchPlaceholder="Rechercher une ligue..."
          idKey="id"
        />
      </div>
    </div>
  )
}
