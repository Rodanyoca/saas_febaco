"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  MapPin,
  Building2,
  Shield,
  Users,
  UserCog,
  Flag,
  BadgeCheck,
  Stethoscope,
  ArrowRightLeft,
  Trophy,
  UserCheck,
  ListChecks,
  ClipboardList,
  ListOrdered,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

type NavItem = { name: string; href: string; icon: React.ComponentType<{ className?: string }> }

const navigationDashboard: NavItem[] = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
]

const navigationTerritoriale: NavItem[] = [
  { name: "Ligues", href: "/dashboard/ligues", icon: MapPin },
  { name: "Ententes", href: "/dashboard/ententes", icon: Building2 },
  { name: "Clubs", href: "/dashboard/clubs", icon: Shield },
]

const navigationActeurs: NavItem[] = [
  { name: "Athletes", href: "/dashboard/athletes", icon: Users },
  { name: "Entraineurs", href: "/dashboard/coachs", icon: UserCog },
  { name: "Arbitres", href: "/dashboard/arbitres", icon: Flag },
  { name: "Officiels", href: "/dashboard/officiels", icon: BadgeCheck },
  { name: "Medecins", href: "/dashboard/medecins", icon: Stethoscope },
]

const navigationCompetition: NavItem[] = [
  { name: "Toutes les compétitions", href: "/dashboard/competitions", icon: Trophy },
  { name: "Participants", href: "/dashboard/competitions-participants", icon: UserCheck },
  { name: "Équipes engagées", href: "/dashboard/competitions-unites", icon: ListChecks },
  { name: "Résultats", href: "/dashboard/competitions-resultats", icon: ClipboardList },
  { name: "Classements", href: "/dashboard/competitions-classement", icon: ListOrdered },
]

const navigationEquipeNationale: NavItem[] = [
  { name: "Équipes nationales", href: "/dashboard/equipe-nationale", icon: Flag },
  { name: "Sélections", href: "/dashboard/equipe-nationale-selections", icon: UserCheck },
  { name: "Compétitions EN", href: "/dashboard/equipe-nationale-competitions", icon: Trophy },
  { name: "Participants EN", href: "/dashboard/equipe-nationale-participants", icon: Users },
  { name: "Résultats EN", href: "/dashboard/equipe-nationale-resultats", icon: ClipboardList },
]

function NavLink({ item, collapsed, pathname }: { item: NavItem; collapsed: boolean; pathname: string }) {
  const isDashboardRoot = item.href === "/dashboard"
  const isActive = isDashboardRoot
    ? pathname === "/dashboard"
    : pathname === item.href || pathname.startsWith(item.href + "/")

  return (
    <Link
      key={item.name}
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
      )}
      title={collapsed ? item.name : undefined}
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span>{item.name}</span>}
    </Link>
  )
}

function NavGroup({
  title,
  items,
  open,
  setOpen,
  collapsed,
  pathname,
}: {
  title: string
  items: NavItem[]
  open: boolean
  setOpen: (v: boolean) => void
  collapsed: boolean
  pathname: string
}) {
  if (collapsed) {
    return (
      <>
        {items.map((item) => (
          <NavLink key={item.name} item={item} collapsed={collapsed} pathname={pathname} />
        ))}
      </>
    )
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
      >
        <span className="uppercase tracking-wide">{title}</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open ? (
        <div className="pl-2 space-y-1">
          {items.map((item) => (
            <NavLink key={item.name} item={item} collapsed={collapsed} pathname={pathname} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [openTerritoriale, setOpenTerritoriale] = useState(true)
  const [openActeurs, setOpenActeurs] = useState(true)
  const [openCompetition, setOpenCompetition] = useState(true)
  const [openEquipeNationale, setOpenEquipeNationale] = useState(true)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white overflow-hidden">
                <Image
                  src="/images/logo-febaco.png"
                  alt="Logo FEBACO"
                  width={40}
                  height={40}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>
              <span className="text-lg font-bold text-sidebar-foreground">
                FEBACO
              </span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white overflow-hidden">
              <Image
                src="/images/logo-febaco.png"
                alt="Logo FEBACO"
                width={40}
                height={40}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navigationDashboard.map((item) => (
            <NavLink key={item.name} item={item} collapsed={collapsed} pathname={pathname} />
          ))}

          <NavGroup
            title="Structure territoriale"
            items={navigationTerritoriale}
            open={openTerritoriale}
            setOpen={setOpenTerritoriale}
            collapsed={collapsed}
            pathname={pathname}
          />

          <NavGroup
            title="Acteurs"
            items={navigationActeurs}
            open={openActeurs}
            setOpen={setOpenActeurs}
            collapsed={collapsed}
            pathname={pathname}
          />

          <NavGroup
            title="Competition"
            items={navigationCompetition}
            open={openCompetition}
            setOpen={setOpenCompetition}
            collapsed={collapsed}
            pathname={pathname}
          />

          <NavLink
            item={{ name: "Transferts", href: "/dashboard/transferts", icon: ArrowRightLeft }}
            collapsed={collapsed}
            pathname={pathname}
          />

          <NavGroup
            title="Equipe nationale"
            items={navigationEquipeNationale}
            open={openEquipeNationale}
            setOpen={setOpenEquipeNationale}
            collapsed={collapsed}
            pathname={pathname}
          />
        </nav>
      </div>
    </aside>
  )
}
