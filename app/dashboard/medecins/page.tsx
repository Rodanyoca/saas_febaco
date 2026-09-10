"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ActorEditor } from "@/components/dashboard/actor-editor"
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

function calcAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null
  const date = new Date(dateNaissance)
  if (Number.isNaN(date.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const month = today.getMonth() - date.getMonth()
  if (month < 0 || (month === 0 && today.getDate() < date.getDate())) age -= 1
  return age >= 0 ? age : null
}

const columns: Column<Medecin>[] = [
  {
    key: "id",
    header: "ID",
    className: "w-[11%] font-mono text-sm",
    render: (item) => <span className="block break-all">{formatCode(item.id) || "-"}</span>,
  },
  {
    key: "nom",
    header: "Nom complet",
    className: "w-[24%] font-medium",
    render: (item) => (
      <div className="flex items-center gap-3">
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={item.avatarUrl || undefined} alt={`${item.prenom} ${item.nom}`} />
          <AvatarFallback className="text-xs">{initials(item.prenom, item.nom)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 whitespace-normal break-words">{item.prenom} {item.nom}</span>
      </div>
    ),
  },
  {
    key: "sexe",
    header: "Sexe / Âge",
    className: "w-[13%]",
    render: (item) => {
      const age = calcAge(item.dateNaissance)
      return (
        <div className="space-y-1">
          <span className="block">{item.sexe || "-"}</span>
          <span className="block text-xs text-muted-foreground">{age !== null ? `${age} ans` : "-"}</span>
        </div>
      )
    },
  },
  { key: "specialite", header: "Spécialité", className: "w-[15%]" },
  {
    key: "idNational",
    header: "ID national",
    className: "w-[14%] break-all font-mono text-sm",
    render: (item) => item.idNational || "-",
  },
  {
    key: "idFiba",
    header: "ID FIBA",
    className: "w-[14%] break-all font-mono text-sm",
    render: (item) => item.idFiba || "-",
  },
  {
    key: "statut",
    header: "Statut",
    className: "w-[10%]",
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
          const raw = Array.isArray(json?.medecins) ? (json.medecins as Medecin[]) : []
          setMedecins(
            raw.map((medecin) => ({
              ...medecin,
              sexe: String(medecin.sexe ?? "").trim().toUpperCase(),
              statut: String(medecin.statut ?? "").trim(),
            }))
          )
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
        key: "sexe",
        label: "Sexe",
        options: [
          { value: "M", label: "M" },
          { value: "F", label: "F" },
        ],
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
        <div className="mb-4 flex justify-end"><ActorEditor kind="medecins" onSaved={(actor) => setMedecins(current => [actor as unknown as Medecin, ...current].sort((a,b)=>String(`${a.prenom} ${a.nom}`).localeCompare(String(`${b.prenom} ${b.nom}`),"fr",{sensitivity:"base"})))} /></div>
        <DataTable
          data={medecins}
          columns={columns}
          filters={filters}
          tableClassName="table-fixed"
          actionsClassName="w-[10%]"
          searchPlaceholder="Rechercher un médecin..."
          detailHref={(item) => `/dashboard/medecins/${encodeURIComponent(item.id)}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
