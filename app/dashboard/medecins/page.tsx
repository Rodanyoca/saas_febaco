"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Medecin, getFilterOptions } from "@/lib/models"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function formatCode(value: unknown): string {
  const raw = String(value ?? "").trim()
  const digits = raw.replace(/\D/g, "")
  if (!digits) return raw
  return digits.slice(-3).padStart(3, "0")
}

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p.replace(/^Dr\.?\s*/i, "")[0] ?? "" : ""
  const b = n ? n[0] : ""
  const v = `${a}${b}`.toUpperCase()
  return v || "MD"
}

const columns: Column<Medecin>[] = [
  {
    key: "id",
    header: "Code",
    className: "font-mono text-sm",
    render: (item) => (
      <div className="flex items-center gap-2">
        <span>{formatCode(item.id)}</span>
        <Avatar className="size-7">
          <AvatarImage src={item.avatarUrl || undefined} alt={`${item.prenom} ${item.nom}`} />
          <AvatarFallback className="text-[10px]">{initials(item.prenom, item.nom)}</AvatarFallback>
        </Avatar>
      </div>
    ),
  },
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

export default function MedecinsPage() {
  const [medecins, setMedecins] = useState<Medecin[]>([])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch("/api/medecins", { cache: "no-store" })
        const json = await res.json()
        if (!canceled) {
          setMedecins(Array.isArray(json?.medecins) ? json.medecins : [])
        }
      } catch {
        if (!canceled) setMedecins([])
      }
    })()

    return () => {
      canceled = true
    }
  }, [])

  const filters: Filter[] = useMemo(() => {
    return [
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
  }, [medecins])

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
          idKey="__key"
        />
      </div>
    </div>
  )
}
