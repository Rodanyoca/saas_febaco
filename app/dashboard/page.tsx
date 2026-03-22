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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Pie, PieChart, Cell } from "recharts"

export default function DashboardPage() {
  const [ligues, setLigues] = useState<{ statut?: string }[]>([])
  const [ententes, setEntentes] = useState<{ statut?: string }[]>([])
  const [clubs, setClubs] = useState<{ statut?: string }[]>([])
  const [equipes, setEquipes] = useState<{ statut?: string; genre?: string }[]>([])
  const [athletes, setAthletes] = useState<{ statut?: string; sexe?: string; province?: string }[]>([])
  const [coachs, setCoachs] = useState<{ statut?: string; niveau?: string }[]>([])

  const DetailStat = ({
    label,
    value,
    valueClassName,
  }: {
    label: string
    value: number
    valueClassName?: string
  }) => (
    <div className="flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <span className={valueClassName ?? "text-[12px] font-semibold text-foreground tabular-nums"}>
        {value}
      </span>
    </div>
  )

  const DetailRow = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-wrap items-center gap-2">
      {children}
    </div>
  )

  const DetailRowNoWrap = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
      {children}
    </div>
  )

  const Sep = () => <span className="h-3 w-px bg-border" />

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

  const athletesByProvince = useMemo(() => {
    const normalize = (v: unknown) => String(v ?? "").trim()
    const map = new Map<string, number>()

    for (const a of athletes) {
      const province = normalize(a?.province) || "-"
      map.set(province, (map.get(province) ?? 0) + 1)
    }

    return Array.from(map.entries())
      .map(([province, count]) => ({ province, count }))
      .sort((a, b) => b.count - a.count)
  }, [athletes])

  const athletesByProvinceChart = useMemo(() => {
    const colorForIndex = (index: number, total: number) => {
      const hue = Math.round((index * 360) / Math.max(total, 1))
      return `hsl(${hue} 70% 50%)`
    }

    const provincesAlpha = Array.from(
      new Set(athletesByProvince.map((i) => i.province))
    ).sort((a, b) => a.localeCompare(b, "fr"))

    const colorByProvince = new Map(
      provincesAlpha.map((p, index) => [p, colorForIndex(index, provincesAlpha.length)])
    )

    const data = athletesByProvince.map((item) => ({
      ...item,
      fill: colorByProvince.get(item.province) ?? "hsl(var(--chart-1))",
    }))

    const config: ChartConfig = Object.fromEntries(
      data.map((item) => [item.province, { label: item.province }])
    )

    return { data, config }
  }, [athletesByProvince])

  return (
    <div className="flex flex-col">
      <Header
        title="Tableau de bord"
        subtitle="Vue d'ensemble du referentiel federal FEBACO"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Ligues"
            value={ligueCounts.total}
            icon={MapPin}
            href="/dashboard/ligues"
            detail={
              <DetailRow>
                <DetailStat label="Actifs" value={ligueCounts.actif} valueClassName="text-[12px] font-semibold text-orange-700 tabular-nums" />
                <Sep />
                <DetailStat label="Inactifs" value={ligueCounts.inactif} valueClassName="text-[12px] font-semibold text-zinc-700 tabular-nums" />
              </DetailRow>
            }
          />
          <StatCard
            title="Ententes"
            value={ententeCounts.total}
            icon={Building2}
            href="/dashboard/ententes"
            detail={
              <DetailRow>
                <DetailStat label="Actifs" value={ententeCounts.actif} valueClassName="text-[12px] font-semibold text-orange-700 tabular-nums" />
                <Sep />
                <DetailStat label="Inactifs" value={ententeCounts.inactif} valueClassName="text-[12px] font-semibold text-zinc-700 tabular-nums" />
              </DetailRow>
            }
          />
          <StatCard
            title="Clubs"
            value={clubCounts.total}
            icon={Shield}
            href="/dashboard/clubs"
            detail={
              <DetailRow>
                <DetailStat label="Actifs" value={clubCounts.actif} valueClassName="text-[12px] font-semibold text-orange-700 tabular-nums" />
                <Sep />
                <DetailStat label="Inactifs" value={clubCounts.inactif} valueClassName="text-[12px] font-semibold text-zinc-700 tabular-nums" />
              </DetailRow>
            }
          />
          <StatCard
            title="Equipes"
            value={equipeCounts.total}
            icon={Layers}
            href="/dashboard/equipes"
            detail={
              <DetailRow>
                <DetailStat label="Masculin" value={equipeCounts.masculin} valueClassName="text-[12px] font-semibold text-sky-700 tabular-nums" />
                <Sep />
                <DetailStat label="Féminin" value={equipeCounts.feminin} valueClassName="text-[12px] font-semibold text-fuchsia-700 tabular-nums" />
                <Sep />
                <DetailStat label="Inactifs" value={equipeCounts.inactif} valueClassName="text-[12px] font-semibold text-zinc-700 tabular-nums" />
              </DetailRow>
            }
          />
          <StatCard
            title="Athletes"
            value={athleteCounts.total}
            icon={Users}
            href="/dashboard/athletes"
            detail={
              <DetailRowNoWrap>
                <DetailStat label="Hommes" value={athleteCounts.hommes} valueClassName="text-[12px] font-semibold text-indigo-700 tabular-nums" />
                <Sep />
                <DetailStat label="Femmes" value={athleteCounts.femmes} valueClassName="text-[12px] font-semibold text-rose-700 tabular-nums" />
                <Sep />
                <DetailStat label="Inactifs" value={athleteCounts.inactif} valueClassName="text-[12px] font-semibold text-zinc-700 tabular-nums" />
              </DetailRowNoWrap>
            }
          />
          <StatCard
            title="Entraineurs"
            value={coachCounts.total}
            icon={UserCog}
            href="/dashboard/coachs"
            detail={
              <DetailRow>
                <DetailStat label="Local" value={coachCounts.local} valueClassName="text-[12px] font-semibold text-amber-800 tabular-nums" />
                <Sep />
                <DetailStat label="National" value={coachCounts.national} valueClassName="text-[12px] font-semibold text-violet-800 tabular-nums" />
                <Sep />
                <DetailStat label="International" value={coachCounts.international} valueClassName="text-[12px] font-semibold text-cyan-800 tabular-nums" />
              </DetailRow>
            }
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nombre d’athlètes par province</CardTitle>
          </CardHeader>
          <CardContent>
            {athletesByProvinceChart.data.length === 0 ? (
              <div className="h-[480px] flex items-center justify-center text-sm text-muted-foreground">
                Aucune donnée
              </div>
            ) : (
              <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[520px_1fr] lg:items-start">
                <ChartContainer
                  config={athletesByProvinceChart.config}
                  className="h-[480px] w-full max-w-[520px] aspect-auto"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          nameKey="province"
                          formatter={(value, name) => (
                            <div className="flex w-full items-center justify-between gap-4">
                              <span className="text-muted-foreground">{name}</span>
                              <span className="font-mono font-medium tabular-nums">{Number(value).toLocaleString()}</span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Pie
                      data={athletesByProvinceChart.data}
                      dataKey="count"
                      nameKey="province"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={1}
                      strokeWidth={2}
                    >
                      {athletesByProvinceChart.data.map((entry) => (
                        <Cell key={entry.province} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>

                <div className="flex-1 lg:justify-self-end lg:w-full lg:max-w-[420px]">
                  <div className="flex items-center justify-between lg:justify-end lg:gap-6">
                    <p className="text-sm font-medium">Légende</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {athletesByProvinceChart.data.length} provinces
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {athletesByProvinceChart.data.map((item) => (
                      <div key={item.province} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-[2px] shrink-0"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="text-xs text-foreground truncate">{item.province}</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground tabular-nums">
                          {item.count.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
