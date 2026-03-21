"use client"

import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { athletes, Athlete, getFilterOptions } from "@/lib/demo-data"

const columns: Column<Athlete>[] = [
  { key: "id", header: "ID", className: "font-mono text-sm" },
  {
    key: "nom",
    header: "Nom complet",
    className: "font-medium",
    render: (item) => `${item.prenom} ${item.nom}`,
  },
  { key: "sexe", header: "Sexe", className: "text-center" },
  { key: "dateNaissance", header: "Date de naissance" },
  { key: "nationalite", header: "Nationalité" },
  { key: "club", header: "Club" },
  { key: "equipe", header: "Équipe" },
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
    options: getFilterOptions(athletes, "province"),
  },
  {
    key: "ligue",
    label: "Ligue",
    options: getFilterOptions(athletes, "ligue"),
  },
  {
    key: "club",
    label: "Club",
    options: getFilterOptions(athletes, "club"),
  },
  {
    key: "sexe",
    label: "Sexe",
    options: [
      { value: "M", label: "Masculin" },
      { value: "F", label: "Féminin" },
    ],
  },
  {
    key: "categorie",
    label: "Catégorie",
    options: getFilterOptions(athletes, "categorie"),
  },
  {
    key: "statut",
    label: "Statut",
    options: getFilterOptions(athletes, "statut"),
  },
]

export default function AthletesPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="Athlètes"
        subtitle="Liste des athlètes affiliés à la FECOBASKET"
      />

      <div className="flex-1 p-6">
        <DataTable
          data={athletes}
          columns={columns}
          filters={filters}
          searchPlaceholder="Rechercher un athlète..."
          detailHref={(item) => `/dashboard/athletes/${item.id}`}
          idKey="id"
        />
      </div>
    </div>
  )
}
