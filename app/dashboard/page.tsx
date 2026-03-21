import { Header } from "@/components/dashboard/header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { stats } from "@/lib/demo-data"

export default function DashboardPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="Tableau de bord"
        subtitle="Vue d'ensemble du référentiel fédéral FECOBASKET"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            title="Ligues"
            value={stats.ligues}
            icon={MapPin}
            href="/dashboard/ligues"
          />
          <StatCard
            title="Ententes"
            value={stats.ententes}
            icon={Building2}
            href="/dashboard/ententes"
          />
          <StatCard
            title="Clubs"
            value={stats.clubs}
            icon={Shield}
            href="/dashboard/clubs"
          />
          <StatCard
            title="Équipes"
            value={stats.equipes}
            icon={Layers}
          />
          <StatCard
            title="Athlètes"
            value={stats.athletes}
            icon={Users}
            href="/dashboard/athletes"
          />
        </div>

        {/* Second row of stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Entraîneurs"
            value={stats.coachs}
            icon={UserCog}
            href="/dashboard/coachs"
          />
          <StatCard
            title="Arbitres"
            value={stats.arbitres}
            icon={Flag}
            href="/dashboard/arbitres"
          />
          <StatCard
            title="Officiels"
            value={stats.officiels}
            icon={BadgeCheck}
            href="/dashboard/officiels"
          />
          <StatCard
            title="Médecins"
            value={stats.medecins}
            icon={Stethoscope}
            href="/dashboard/medecins"
          />
        </div>

        {/* Additional info cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Répartition par province */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Répartition par province</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { province: "Kinshasa", clubs: 4, athletes: 137 },
                  { province: "Haut-Katanga", clubs: 2, athletes: 84 },
                  { province: "Sud-Kivu", clubs: 1, athletes: 44 },
                  { province: "Kongo Central", clubs: 1, athletes: 20 },
                ].map((item) => (
                  <div
                    key={item.province}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium">{item.province}</span>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{item.clubs} clubs</span>
                      <span>{item.athletes} athlètes</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Répartition par sexe */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Répartition des athlètes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-chart-1" />
                    <span className="text-sm font-medium">Hommes</span>
                  </div>
                  <span className="text-2xl font-bold">6</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[60%] rounded-full bg-chart-1" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-chart-2" />
                    <span className="text-sm font-medium">Femmes</span>
                  </div>
                  <span className="text-2xl font-bold">4</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[40%] rounded-full bg-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Accès rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Rechercher un athlète", href: "/dashboard/athletes", icon: Users },
                { label: "Consulter les clubs", href: "/dashboard/clubs", icon: Shield },
                { label: "Liste des arbitres", href: "/dashboard/arbitres", icon: Flag },
                { label: "Encadrement technique", href: "/dashboard/coachs", icon: UserCog },
              ].map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 hover:border-primary/50"
                >
                  <action.icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{action.label}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
