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
import { Progress } from "@/components/ui/progress"

export default function DashboardPage() {
  const [ligues, setLigues] = useState<{ statut?: string }[]>([])
  const [ententes, setEntentes] = useState<{ statut?: string }[]>([])
  const [clubs, setClubs] = useState<{ statut?: string }[]>([])
  const [equipes, setEquipes] = useState<{ statut?: string; genre?: string }[]>([])
  const [athletes, setAthletes] = useState<{ statut?: string; sexe?: string; province?: string }[]>([])
  const [coachs, setCoachs] = useState<{ statut?: string; niveau?: string; sexe?: string }[]>([])
  const [arbitres, setArbitres] = useState<{ statut?: string; sexe?: string }[]>([])
  const [officiels, setOfficiels] = useState<{ statut?: string; sexe?: string }[]>([])
  const [medecins, setMedecins] = useState<{ statut?: string; sexe?: string }[]>([])

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
    <div className="flex w-full flex-nowrap items-center justify-between gap-2">
      {children}
    </div>
  )

  const Sep = () => <span className="h-3 w-px bg-border" />

  useEffect(() => {
    let canceled = false
    const load = async () => {
      try {
        const [
          liguesRes,
          ententesRes,
          clubsRes,
          equipesRes,
          athletesRes,
          coachsRes,
          arbitresRes,
          officielsRes,
          medecinsRes,
        ] = await Promise.all([
          fetch("/api/ligues", { cache: "no-store" }),
          fetch("/api/ententes", { cache: "no-store" }),
          fetch("/api/clubs", { cache: "no-store" }),
          fetch("/api/equipes", { cache: "no-store" }),
          fetch("/api/athletes", { cache: "no-store" }),
          fetch("/api/coachs", { cache: "no-store" }),
          fetch("/api/arbitres", { cache: "no-store" }),
          fetch("/api/officiels", { cache: "no-store" }),
          fetch("/api/medecins", { cache: "no-store" }),
        ])

        const [
          liguesJson,
          ententesJson,
          clubsJson,
          equipesJson,
          athletesJson,
          coachsJson,
          arbitresJson,
          officielsJson,
          medecinsJson,
        ] = await Promise.all([
          liguesRes.json(),
          ententesRes.json(),
          clubsRes.json(),
          equipesRes.json(),
          athletesRes.json(),
          coachsRes.json(),
          arbitresRes.json(),
          officielsRes.json(),
          medecinsRes.json(),
        ])

        if (!canceled) {
          setLigues(Array.isArray(liguesJson?.ligues) ? liguesJson.ligues : [])
          setEntentes(Array.isArray(ententesJson?.ententes) ? ententesJson.ententes : [])
          setClubs(Array.isArray(clubsJson?.clubs) ? clubsJson.clubs : [])
          setEquipes(Array.isArray(equipesJson?.equipes) ? equipesJson.equipes : [])
          setAthletes(Array.isArray(athletesJson?.athletes) ? athletesJson.athletes : [])
          setCoachs(Array.isArray(coachsJson?.coachs) ? coachsJson.coachs : [])
          setArbitres(Array.isArray(arbitresJson?.arbitres) ? arbitresJson.arbitres : [])
          setOfficiels(Array.isArray(officielsJson?.officiels) ? officielsJson.officiels : [])
          setMedecins(Array.isArray(medecinsJson?.medecins) ? medecinsJson.medecins : [])
        }
      } catch {
        if (!canceled) {
          setLigues([])
          setEntentes([])
          setClubs([])
          setEquipes([])
          setAthletes([])
          setCoachs([])
          setArbitres([])
          setOfficiels([])
          setMedecins([])
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

  const dataCompleteness = useMemo(() => {
    const isFilled = (v: unknown) => {
      if (v == null) return false
      if (typeof v === "number") return Number.isFinite(v)
      const s = String(v).trim()
      if (!s) return false
      const l = s.toLowerCase()
      return l !== "-" && l !== "n/a" && l !== "na" && l !== "null" && l !== "undefined"
    }

    const compute = (rows: Record<string, unknown>[]) => {
      if (!rows || rows.length === 0) return { filled: 0, total: 0, pct: 0 }

      let total = 0
      let filled = 0

      for (const r of rows) {
        const obj = (r ?? {}) as Record<string, unknown>
        const keys = Object.keys(obj).filter((k) => k !== "__key")
        total += keys.length
        for (const k of keys) {
          if (isFilled(obj[k])) filled += 1
        }
      }

      const pct = total === 0 ? 0 : Math.round((filled / total) * 100)
      return { filled, total, pct }
    }

    const liguesC = compute(ligues as unknown as Record<string, unknown>[])
    const ententesC = compute(ententes as unknown as Record<string, unknown>[])
    const clubsC = compute(clubs as unknown as Record<string, unknown>[])
    const equipesC = compute(equipes as unknown as Record<string, unknown>[])
    const athletesC = compute(athletes as unknown as Record<string, unknown>[])
    const coachsC = compute(coachs as unknown as Record<string, unknown>[])
    const officielsC = compute(officiels as unknown as Record<string, unknown>[])
    const medecinsC = compute(medecins as unknown as Record<string, unknown>[])
    const arbitresC = compute(arbitres as unknown as Record<string, unknown>[])

    const globalFilled =
      liguesC.filled +
      ententesC.filled +
      clubsC.filled +
      equipesC.filled +
      athletesC.filled +
      coachsC.filled +
      officielsC.filled +
      medecinsC.filled +
      arbitresC.filled

    const globalTotal =
      liguesC.total +
      ententesC.total +
      clubsC.total +
      equipesC.total +
      athletesC.total +
      coachsC.total +
      officielsC.total +
      medecinsC.total +
      arbitresC.total

    const globalPct = globalTotal === 0 ? 0 : Math.round((globalFilled / globalTotal) * 100)

    return {
      global: { filled: globalFilled, total: globalTotal, pct: globalPct },
      items: [
        { label: "Ligues", value: liguesC },
        { label: "Ententes", value: ententesC },
        { label: "Clubs", value: clubsC },
        { label: "Équipes", value: equipesC },
        { label: "Athlètes", value: athletesC },
        { label: "Entraîneurs", value: coachsC },
        { label: "Officiels", value: officielsC },
        { label: "Médecins", value: medecinsC },
        { label: "Arbitres", value: arbitresC },
      ],
    }
  }, [arbitres, athletes, clubs, coachs, equipes, ententes, ligues, medecins, officiels])

  const coachCounts = useMemo(() => {
    const total = coachs.length

    const hommes = coachs.filter((c) => {
      const s = String(c?.sexe ?? "").toLowerCase()
      return s === "m" || s === "masculin" || s === "homme" || s === "male"
    }).length

    const femmes = coachs.filter((c) => {
      const s = String(c?.sexe ?? "").toLowerCase()
      return s === "f" || s === "feminin" || s === "féminin" || s === "femme" || s === "female"
    }).length

    return { total, hommes, femmes }
  }, [coachs])

  const arbitreSexCounts = useMemo(() => {
    const hommes = arbitres.filter((a) => {
      const s = String(a?.sexe ?? "").toLowerCase()
      return s === "m" || s === "masculin" || s === "homme" || s === "male"
    }).length

    const femmes = arbitres.filter((a) => {
      const s = String(a?.sexe ?? "").toLowerCase()
      return s === "f" || s === "feminin" || s === "féminin" || s === "femme" || s === "female"
    }).length

    return { hommes, femmes }
  }, [arbitres])

  const officielSexCounts = useMemo(() => {
    const hommes = officiels.filter((o) => {
      const s = String(o?.sexe ?? "").toLowerCase()
      return s === "m" || s === "masculin" || s === "homme" || s === "male"
    }).length

    const femmes = officiels.filter((o) => {
      const s = String(o?.sexe ?? "").toLowerCase()
      return s === "f" || s === "feminin" || s === "féminin" || s === "femme" || s === "female"
    }).length

    return { hommes, femmes }
  }, [officiels])

  const medecinSexCounts = useMemo(() => {
    const hommes = medecins.filter((m) => {
      const s = String(m?.sexe ?? "").toLowerCase()
      return s === "m" || s === "masculin" || s === "homme" || s === "male"
    }).length

    const femmes = medecins.filter((m) => {
      const s = String(m?.sexe ?? "").toLowerCase()
      return s === "f" || s === "feminin" || s === "féminin" || s === "femme" || s === "female"
    }).length

    return { hommes, femmes }
  }, [medecins])

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
                <DetailStat label="Femmes" value={athleteCounts.femmes} valueClassName="text-[12px] font-semibold text-rose-700 tabular-nums" />
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
              <DetailRowNoWrap>
                <DetailStat label="Hommes" value={coachCounts.hommes} valueClassName="text-[12px] font-semibold text-indigo-700 tabular-nums" />
                <DetailStat label="Femmes" value={coachCounts.femmes} valueClassName="text-[12px] font-semibold text-rose-700 tabular-nums" />
              </DetailRowNoWrap>
            }
          />
          <StatCard
            title="Arbitres"
            value={arbitres.length}
            icon={Flag}
            href="/dashboard/arbitres"
            detail={
              <DetailRowNoWrap>
                <DetailStat label="Hommes" value={arbitreSexCounts.hommes} valueClassName="text-[12px] font-semibold text-indigo-700 tabular-nums" />
                <DetailStat label="Femmes" value={arbitreSexCounts.femmes} valueClassName="text-[12px] font-semibold text-rose-700 tabular-nums" />
              </DetailRowNoWrap>
            }
          />
          <StatCard
            title="Officiels"
            value={officiels.length}
            icon={BadgeCheck}
            href="/dashboard/officiels"
            detail={
              <DetailRowNoWrap>
                <DetailStat label="Hommes" value={officielSexCounts.hommes} valueClassName="text-[12px] font-semibold text-indigo-700 tabular-nums" />
                <DetailStat label="Femmes" value={officielSexCounts.femmes} valueClassName="text-[12px] font-semibold text-rose-700 tabular-nums" />
              </DetailRowNoWrap>
            }
          />
          <StatCard
            title="Medecins"
            value={medecins.length}
            icon={Stethoscope}
            href="/dashboard/medecins"
            detail={
              <DetailRowNoWrap>
                <DetailStat label="Hommes" value={medecinSexCounts.hommes} valueClassName="text-[12px] font-semibold text-indigo-700 tabular-nums" />
                <DetailStat label="Femmes" value={medecinSexCounts.femmes} valueClassName="text-[12px] font-semibold text-rose-700 tabular-nums" />
              </DetailRowNoWrap>
            }
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Complétude des données</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Taux de complétude total</p>
                  <p className="text-2xl font-semibold tabular-nums">{dataCompleteness.global.pct}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Cellules remplies</p>
                  <p className="text-sm font-medium tabular-nums">
                    {dataCompleteness.global.filled} / {dataCompleteness.global.total}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <Progress value={dataCompleteness.global.pct} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {dataCompleteness.items.map((it) => (
                <div key={it.label} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{it.label}</p>
                    <p className="text-sm font-semibold tabular-nums">{it.value.pct}%</p>
                  </div>
                  <div className="mt-2">
                    <Progress value={it.value.pct} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                    {it.value.filled} / {it.value.total} cellules
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
