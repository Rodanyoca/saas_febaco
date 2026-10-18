"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { DataTable, Column, Filter } from "@/components/dashboard/data-table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ActorEditor } from "@/components/dashboard/actor-editor"
import { Medecin, getFilterOptions } from "@/lib/models"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function initials(prenom?: string, nom?: string): string {
  const p = String(prenom ?? "").trim()
  const n = String(nom ?? "").trim()
  const a = p ? p[0] : ""
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
    key: "licenceDisplay",
    header: "Licence",
    className: "w-[10%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block break-all leading-snug" title={item.licenceAmbiguous ? "Plusieurs licences valides : vérification administrative nécessaire." : undefined}>{item.licenceAmbiguous ? "À vérifier" : item.licenceDisplay || ""}</span>,
  },
  {
    key: "avatarUrl",
    header: "Avatar",
    className: "w-[6%] text-center",
    render: (item) => (
      <div className="flex justify-center">
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={item.avatarUrl || undefined} alt={item.nomComplet || `${item.prenom} ${item.nom}`} />
          <AvatarFallback className="text-xs">{initials(item.prenom, item.nom)}</AvatarFallback>
        </Avatar>
      </div>
    ),
  },
  {
    key: "nomComplet",
    header: "Nom complet",
    className: "w-[24%] whitespace-normal font-medium",
    render: (item) => (
        <span className="block whitespace-normal break-words leading-snug">
          {item.nomComplet || `${item.prenom} ${item.nom}`}
        </span>
    ),
  },
  {
    key: "specialite",
    header: "Spécialité",
    className: "w-[14%] whitespace-normal break-words",
    render: (item) => <span className="block whitespace-normal break-words leading-snug">{item.specialite || "-"}</span>,
  },
  {
    key: "sexe",
    header: "Sexe / âge",
    className: "w-[8%] text-center",
    render: (item) => {
      const age = calcAge(item.dateNaissance)
      return (
        <div className="flex flex-col items-center leading-tight">
          <span className="text-sm font-semibold">{item.sexe || "-"}</span>
          <span className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">{age !== null ? `${age} ans` : "-"}</span>
        </div>
      )
    },
  },
  {
    key: "idNational",
    header: "ID national",
    className: "w-[12%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block break-all leading-snug">{item.idNational || "-"}</span>,
  },
  {
    key: "idFiba",
    header: "ID FIBA",
    className: "w-[12%] whitespace-normal break-all font-mono text-sm",
    render: (item) => <span className="block break-all leading-snug">{item.idFiba || "-"}</span>,
  },
  {
    key: "statut",
    header: "Statut",
    className: "w-[8%]",
    render: (item) => <StatusBadge status={item.statut} />,
  },
]

export default function MedecinsPage() {
  const [medecins, setMedecins] = useState<Medecin[]>([])
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let canceled = false
    const controller = new AbortController()
    ;(async () => {
      try {
        setLoading(true); setError("")
        const res = await fetch("/api/medecins", { cache: "no-store", signal: controller.signal })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Lecture impossible.")
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
      } catch (cause) {
        if (!canceled) { setMedecins([]); setError(cause instanceof Error ? cause.message : "Lecture impossible.") }
      } finally { if (!canceled) setLoading(false) }
    })()

    return () => {
      canceled = true
      controller.abort()
    }
  }, [revision])

  const filters: Filter[] = useMemo(() => {
    return [
      {
        key: "sexe",
        label: "Sexe",
        allLabel: "Tous les sexes",
        options: [
          { value: "M", label: "Masculin" },
          { value: "F", label: "Féminin" },
        ],
      },
      {
        key: "specialite",
        label: "Spécialité",
        allLabel: "Toutes les spécialités",
        options: getFilterOptions(medecins, "specialite").sort((a,b) => a.label.localeCompare(b.label, "fr")),
      },
      {
        key: "statut",
        label: "Statut",
        allLabel: "Tous les statuts",
        options: getFilterOptions(medecins, "statut").map(option => ({ ...option, label: option.value === "ACTIF" ? "Actif" : option.value === "INACTIF" ? "Inactif" : option.label })),
      },
    ]
  }, [medecins])

  return (
    <div className="flex flex-col">
      <Header
        title="Médecins"
        subtitle="Liste des médecins et de leurs licences actuellement valides"
      />

      <div className="flex-1 p-6">
        {loading ? <p role="status" className="mb-4 text-sm text-muted-foreground">Chargement des médecins et des licences…</p> : null}
        {error ? <p role="alert" className="mb-4 text-sm text-destructive">{error}</p> : null}
        <div className="mb-4 flex justify-end"><ActorEditor kind="medecins" onSaved={() => setRevision(value => value + 1)} /></div>
        <DataTable
          data={medecins}
          showFilterLabels
          columns={columns}
          filters={filters}
          tableClassName="table-fixed"
          actionsClassName="w-[6%]"
          searchPlaceholder="Rechercher par licence, nom…"
          searchableKeys={["licenceDisplay", "nomComplet", "specialite", "sexe", "idNational", "idFiba", "statut"]}
          detailHref={(item) => `/dashboard/medecins/${encodeURIComponent(item.id)}`}
          idKey="__key"
        />
      </div>
    </div>
  )
}
