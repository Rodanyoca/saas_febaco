"use client"

import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { officiels, Officiel, getFilterOptions } from "@/lib/demo-data"

const columns: Column<Officiel>[] = [
  { key: "id", header: "ID", className: "font-mono text-sm" },
  {
    key: "nom",
    header: "Nom complet",
    className: "font-medium",
    render: (item) => `${item.prenom} ${item.nom}`,
  },
  { key: "fonction", header: "Fonction" },
  { key: "structure", header: "Structure" },
  { key: "ligue", header: "Ligue" },
  { key: "club", header: "Club" },
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
    options: getFilterOptions(officiels, "province"),
  },
  {
    key: "ligue",
    label: "Ligue",
    options: getFilterOptions(officiels, "ligue"),
  },
  {
    key: "fonction",
    label: "Fonction",
    options: getFilterOptions(officiels, "fonction"),
  },
  {
    key: "statut",
    label: "Statut",
    options: getFilterOptions(officiels, "statut"),
  },
]

export default function OfficielsPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="Officiels"
        subtitle="Liste des officiels et dirigeants de la FECOBASKET"
      />

      <div className="flex-1 p-6">
        <DataTable
          data={officiels}
          columns={columns}
          filters={filters}
          searchPlaceholder="Rechercher un officiel..."
          detailHref={(item) => `/dashboard/officiels/${item.id}`}
          idKey="id"
        />
      </div>
    </div>
  )
}
