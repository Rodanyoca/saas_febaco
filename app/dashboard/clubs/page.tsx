"use client"

import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { clubs, Club, getFilterOptions } from "@/lib/demo-data"

const columns: Column<Club>[] = [
  { key: "id", header: "ID Club", className: "font-mono text-sm" },
  { key: "nom", header: "Nom Club", className: "font-medium" },
  { key: "categorie", header: "Catégorie" },
  { key: "entente", header: "Entente" },
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
    options: getFilterOptions(clubs, "province"),
  },
  {
    key: "ligue",
    label: "Ligue",
    options: getFilterOptions(clubs, "ligue"),
  },
  {
    key: "entente",
    label: "Entente",
    options: getFilterOptions(clubs, "entente"),
  },
  {
    key: "categorie",
    label: "Catégorie",
    options: getFilterOptions(clubs, "categorie"),
  },
  {
    key: "statut",
    label: "Statut",
    options: getFilterOptions(clubs, "statut"),
  },
]

export default function ClubsPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="Clubs"
        subtitle="Liste des clubs affiliés à la FECOBASKET"
      />

      <div className="flex-1 p-6">
        <DataTable
          data={clubs}
          columns={columns}
          filters={filters}
          searchPlaceholder="Rechercher un club..."
          detailHref={(item) => `/dashboard/clubs/${item.id}`}
          idKey="id"
        />
      </div>
    </div>
  )
}
