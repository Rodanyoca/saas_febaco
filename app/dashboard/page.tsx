"use client"

import {
  MapPin,
  Building2,
  Shield,
  Users,
  UserCog,
  Flag,
  BadgeCheck,
  Stethoscope,
  Layers,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/dashboard/header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
  const [ligues, setLigues] = useState<{ statut?: string }[]>([])
  const [ententes, setEntentes] = useState<{ statut?: string }[]>([])
  const [clubs, setClubs] = useState<{ statut?: string }[]>([])
  const [equipes, setEquipes] = useState<{ statut?: string; genre?: string }[]>([])
  const [athletes, setAthletes] = useState<{ statut?: string; sexe?: string }[]>([])
  const [coachs, setCoachs] = useState<{ statut?: string; niveau?: string }[]>([])

  useEffect(() => {
    let canceled = false
    const load = async () => {
      try {
        const [liguesRes, ententesRes, clubsRes, equipesRes, athletesRes, coachsRes] = await Promise.all([
          fetch("/api/ligues", { cache: "no-store" }),
          fetch("/api/ententes", { cache: "no-store" }),
          fetch("/api/clubs", { cache: "no-store" }),
          fetch("/api/equipes", { cache: "no-store" }),
          fetch("/api/athletes", { cache: "no-store" }),
          fetch("/api/coachs", { cache: "no-store" }),
        ])

        const [liguesJson, ententesJson, clubsJson, equipesJson, athletesJson, coachsJson] = await Promise.all([
          liguesRes.json(),
          ententesRes.json(),
          clubsRes.json(),
          equipesRes.json(),
          athletesRes.json(),
          coachsRes.json(),
        ])

        if (!canceled) {
          setLigues(Array.isArray(liguesJson?.ligues) ? liguesJson.ligues : [])
          setEntentes(Array.isArray(ententesJson?.ententes) ? ententesJson.ententes : [])
          setClubs(Array.isArray(clubsJson?.clubs) ? clubsJson.clubs : [])
          setEquipes(Array.isArray(equipesJson?.equipes) ? equipesJson.equipes : [])
          setAthletes(Array.isArray(athletesJson?.athletes) ? athletesJson.athletes : [])
          setCoachs(Array.isArray(coachsJson?.coachs) ? coachsJson.coachs : [])
        }
      } catch {
        if (!canceled) {
          setLigues([])
          setEntentes([])
          setClubs([])
          setEquipes([])
          setAthletes([])
          setCoachs([])
        }
      }
    }

    load()

    const onFocus = () => {
      load()
    }

    window.addEventListener("focus", onFocus)
    const intervalId = window.setInterval(load, 30000)

    return () => {
      canceled = true
      window.removeEventListener("focus", onFocus)
      window.clearInterval(intervalId)
    }
  }, [])

  const ligueCounts = useMemo(() => {
    const total = ligues.length
    const actif = ligues.filter((l) => String(l?.statut ?? "").toLowerCase() === "actif").length
    const inactif = ligues.filter((l) => String(l?.statut ?? "").toLowerCase() === "inactif").length
    return { total, actif, inactif }
  }, [ligues])

  const ententeCounts = useMemo(() => {
    const total = ententes.length
    const actif = ententes.filter((e) => String(e?.statut ?? "").toLowerCase() === "actif").length
    const inactif = ententes.filter((e) => String(e?.statut ?? "").toLowerCase() === "inactif").length
    return { total, actif, inactif }
  }, [ententes])

  const clubCounts = useMemo(() => {
    const total = clubs.length
    const actif = clubs.filter((c) => String(c?.statut ?? "").toLowerCase() === "actif").length
    const inactif = clubs.filter((c) => String(c?.statut ?? "").toLowerCase() === "inactif").length
    return { total, actif, inactif }
  }, [clubs])

  const equipeCounts = useMemo(() => {
    const total = equipes.length
    const actif = equipes.filter((e) => String(e?.statut ?? "").toLowerCase() === "actif").length
    const inactif = equipes.filter((e) => String(e?.statut ?? "").toLowerCase() === "inactif").length

    const masculin = equipes.filter((e) => {
      const g = String(e?.genre ?? "").toLowerCase()
      return g === "masculin" || g === "m" || g === "male"
    }).length

    const feminin = equipes.filter((e) => {
      const g = String(e?.genre ?? "").toLowerCase()
      return g === "feminin" || g === "féminin" || g === "f" || g === "female"
    }).length

    return { total, actif, inactif, masculin, feminin }
  }, [equipes])

  const athleteCounts = useMemo(() => {
    const total = athletes.length
    const inactif = athletes.filter((a) => String(a?.statut ?? "").toLowerCase() === "inactif").length

    const hommes = athletes.filter((a) => {
      const s = String(a?.sexe ?? "").toLowerCase()
      return s === "m" || s === "masculin" || s === "homme" || s === "male"
    }).length

    const femmes = athletes.filter((a) => {
      const s = String(a?.sexe ?? "").toLowerCase()
      return s === "f" || s === "feminin" || s === "féminin" || s === "femme" || s === "female"
    }).length

    return { total, hommes, femmes, inactif }
  }, [athletes])

  const coachCounts = useMemo(() => {
    const total = coachs.length

    const local = coachs.filter((c) => {
      const n = String(c?.niveau ?? "").toLowerCase()
      return n.includes("local")
    }).length

    const national = coachs.filter((c) => {
      const n = String(c?.niveau ?? "").toLowerCase()
      return n.includes("national")
    }).length

    const international = coachs.filter((c) => {
      const n = String(c?.niveau ?? "").toLowerCase()
      return n.includes("international")
    }).length

    return { total, local, national, international }
  }, [coachs])

  return (
    <div className="flex flex-col">
      <Header
        title="Tableau de bord"
        subtitle="Vue d'ensemble du referentiel federal FEBACO"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            title="Ligues"
            value={ligueCounts.total}
            icon={MapPin}
            href="/dashboard/ligues"
            detail={`Actifs ${ligueCounts.actif}  Inactifs ${ligueCounts.inactif}`}
          />
          <StatCard
            title="Ententes"
            value={ententeCounts.total}
            icon={Building2}
            href="/dashboard/ententes"
            detail={`Actifs ${ententeCounts.actif}  Inactifs ${ententeCounts.inactif}`}
          />
          <StatCard
            title="Clubs"
            value={clubCounts.total}
            icon={Shield}
            href="/dashboard/clubs"
            detail={`Actifs ${clubCounts.actif}  Inactifs ${clubCounts.inactif}`}
          />
          <StatCard
            title="Equipes"
            value={equipeCounts.total}
            icon={Layers}
            href="/dashboard/equipes"
            detail={`Masculin ${equipeCounts.masculin}  Féminin ${equipeCounts.feminin}  Inactifs ${equipeCounts.inactif}`}
          />
          <StatCard
            title="Athletes"
            value={athleteCounts.total}
            icon={Users}
            href="/dashboard/athletes"
            detail={`Hommes ${athleteCounts.hommes}  Femmes ${athleteCounts.femmes}  Inactifs ${athleteCounts.inactif}`}
          />
        </div>

        {/* Second row of stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Entraineurs"
            value={coachCounts.total}
            icon={UserCog}
            href="/dashboard/coachs"
            detail={`Local ${coachCounts.local}  National ${coachCounts.national}  International ${coachCounts.international}`}
          />
          <StatCard
            title="Arbitres"
            value={0}
            icon={Flag}
            href="/dashboard/arbitres"
          />
          <StatCard
            title="Officiels"
            value={0}
            icon={BadgeCheck}
            href="/dashboard/officiels"
          />
          <StatCard
            title="Medecins"
            value={0}
            icon={Stethoscope}
            href="/dashboard/medecins"
          />
        </div>

        {/* Additional info cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Repartition par province */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Repartition par province</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
                Aucune donnée
              </div>
            </CardContent>
          </Card>

          {/* Repartition par sexe */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Repartition des equipes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-chart-1" />
                    <span className="text-sm font-medium">Masculin</span>
                  </div>
                  <span className="text-2xl font-bold">{equipeCounts.masculin}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[0%] rounded-full bg-chart-1" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-chart-2" />
                    <span className="text-sm font-medium">Féminin</span>
                  </div>
                  <span className="text-2xl font-bold">{equipeCounts.feminin}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[0%] rounded-full bg-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
