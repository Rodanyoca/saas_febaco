"use client"

import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { arbitres, Arbitre, getFilterOptions } from "@/lib/demo-data"

const columns: Column<Arbitre>[] = [
  { key: "id", header: "ID", className: "font-mono text-sm" },
  {
    key: "nom",
    header: "Nom complet",
    className: "font-medium",
    render: (item) => `${item.prenom} ${item.nom}`,
  },
  { key: "sexe", header: "Sexe", className: "text-center" },
  { key: "niveau", header: "Niveau" },
  { key: "ligue", header: "Ligue" },
  { key: "entente", header: "Entente" },
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
    options: getFilterOptions(arbitres, "province"),
  },
  {
    key: "ligue",
    label: "Ligue",
    options: getFilterOptions(arbitres, "ligue"),
  },
  {
    key: "entente",
    label: "Entente",
    options: getFilterOptions(arbitres, "entente"),
  },
  {
    key: "niveau",
    label: "Niveau",
    options: getFilterOptions(arbitres, "niveau"),
  },
  {
    key: "statut",
    label: "Statut",
    options: getFilterOptions(arbitres, "statut"),
  },
]

export default function ArbitresPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="Arbitres"
        subtitle="Liste des arbitres officiels de la FECOBASKET"
      />

      <div className="flex-1 p-6">
        <DataTable
          data={arbitres}
          columns={columns}
          filters={filters}
          searchPlaceholder="Rechercher un arbitre..."
          detailHref={(item) => `/dashboard/arbitres/${item.id}`}
          idKey="id"
        />
      </div>
    </div>
  )
}
