"use client"

import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { medecins, Medecin, getFilterOptions } from "@/lib/demo-data"

const columns: Column<Medecin>[] = [
  { key: "id", header: "ID", className: "font-mono text-sm" },
  {
    key: "nom",
    header: "Nom complet",
    className: "font-medium",
    render: (item) => `${item.prenom} ${item.nom}`,
  },
  { key: "specialite", header: "Spécialité" },
  { key: "structureMedicale", header: "Structure médicale" },
  { key: "club", header: "Club" },
  { key: "ligue", header: "Ligue" },
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
    options: getFilterOptions(medecins, "province"),
  },
  {
    key: "ligue",
    label: "Ligue",
    options: getFilterOptions(medecins, "ligue"),
  },
  {
    key: "specialite",
    label: "Spécialité",
    options: getFilterOptions(medecins, "specialite"),
  },
  {
    key: "statut",
    label: "Statut",
    options: getFilterOptions(medecins, "statut"),
  },
]

export default function MedecinsPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="Médecins"
        subtitle="Liste du personnel médical affilié à la FECOBASKET"
      />

      <div className="flex-1 p-6">
        <DataTable
          data={medecins}
          columns={columns}
          filters={filters}
          searchPlaceholder="Rechercher un médecin..."
          detailHref={(item) => `/dashboard/medecins/${item.id}`}
          idKey="id"
        />
      </div>
    </div>
  )
}
