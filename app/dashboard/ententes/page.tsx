"use client"

import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ententes, Entente, getFilterOptions } from "@/lib/demo-data"

const columns: Column<Entente>[] = [
  { key: "id", header: "ID Entente", className: "font-mono text-sm" },
  { key: "nom", header: "Nom Entente", className: "font-medium" },
  { key: "pseudo", header: "Pseudo", className: "text-muted-foreground" },
  { key: "ligue", header: "Ligue" },
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
    options: getFilterOptions(ententes, "province"),
  },
  {
    key: "ligue",
    label: "Ligue",
    options: getFilterOptions(ententes, "ligue"),
  },
  {
    key: "statut",
    label: "Statut",
    options: getFilterOptions(ententes, "statut"),
  },
]

export default function EntentesPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="Ententes"
        subtitle="Liste des ententes territoriales affiliées aux ligues"
      />

      <div className="flex-1 p-6">
        <DataTable
          data={ententes}
          columns={columns}
          filters={filters}
          searchPlaceholder="Rechercher une entente..."
          idKey="id"
        />
      </div>
    </div>
  )
}
