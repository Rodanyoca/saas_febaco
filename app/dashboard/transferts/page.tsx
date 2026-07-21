"use client"

import { useEffect, useMemo, useState } from "react"

import { DataTable, type Column, type Filter } from "@/components/dashboard/data-table"
import { Header } from "@/components/dashboard/header"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { type Transfert, getFilterOptions } from "@/lib/models"

const columns: Column<Transfert>[] = [
  { key: "id", header: "ID", className: "font-mono text-sm" },
  { key: "athleteNom", header: "Athlète", className: "font-medium" },
  { key: "equipeOrigine", header: "Équipe origine" },
  { key: "clubOrigine", header: "Club origine" },
  { key: "equipeBeneficiaire", header: "Équipe bénéficiaire" },
  { key: "clubDestination", header: "Club bénéficiaire" },
  { key: "saison", header: "Saison" },
  { key: "dateDebut", header: "Date début" },
  { key: "dateFin", header: "Date fin" },
  {
    key: "statut",
    header: "Statut",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

export default function TransfertsPage() {
  const [transferts, setTransferts] = useState<Transfert[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/transferts", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setTransferts(Array.isArray(json?.transferts) ? json.transferts : [])
        }
      } catch {
        if (!canceled) setTransferts([])
      }
    })()

    return () => {
      canceled = true
    }
  }, [])

  const filters: Filter[] = useMemo(() => {
    return [
      {
        key: "clubOrigine",
        label: "Origine",
        options: getFilterOptions(transferts, "clubOrigine"),
      },
      {
        key: "clubDestination",
        label: "Bénéficiaire",
        options: getFilterOptions(transferts, "clubDestination"),
      },
      {
        key: "saison",
        label: "Saison",
        options: getFilterOptions(transferts, "saison"),
      },
      {
        key: "statut",
        label: "Statut",
        options: getFilterOptions(transferts, "statut"),
      },
    ]
  }, [transferts])

  return (
    <div className="flex flex-col">
      <Header title="Transferts" subtitle="Parcours et mouvements des athlètes" />

      <div className="flex-1 p-6">
        <DataTable
          data={transferts}
          columns={columns}
          filters={filters}
          searchPlaceholder="Rechercher un transfert..."
          idKey="__key"
        />
      </div>
    </div>
  )
}
