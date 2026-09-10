"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react"

export default function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({ email: "", password: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(String(json?.error ?? "Connexion impossible."))
        setIsLoading(false)
        return
      }

      const next = searchParams.get("next")
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
        ? next
        : "/dashboard"
      router.push(safeNext)
    } catch {
      setError("Connexion impossible.")
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#071c32] text-white lg:h-screen lg:min-h-[720px]">
      <div className="mx-auto grid min-h-screen max-w-[1920px] lg:h-full lg:grid-cols-[minmax(0,1.22fr)_minmax(430px,0.78fr)]">
        <section className="relative min-h-[430px] overflow-hidden sm:min-h-[520px] lg:min-h-0" aria-labelledby="hero-title">
          <Image
            src="/images/equipe-nationale-rdc.jpg"
            alt="Joueurs de l’équipe nationale de basketball de la RDC réunis derrière le drapeau congolais"
            fill
            priority
            sizes="(max-width: 1023px) 100vw, 62vw"
            className="object-cover object-[52%_42%] sm:object-[50%_40%] lg:object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,16,31,.08)_12%,rgba(3,16,31,.28)_52%,rgba(3,16,31,.96)_100%)] lg:bg-[linear-gradient(90deg,rgba(3,16,31,.14)_0%,rgba(3,16,31,.04)_54%,rgba(7,28,50,.96)_100%)]" />
          <div className="absolute left-0 top-0 h-1.5 w-full bg-[linear-gradient(90deg,#0b8fda_0_46%,#f7ce20_46%_53%,#cf1736_53%_100%)]" />

          <div className="relative flex h-full min-h-[430px] flex-col justify-between p-6 sm:min-h-[520px] sm:p-10 lg:min-h-0 lg:p-12 xl:p-16">
            <div className="flex items-center gap-3">
              <div className="relative size-14 overflow-hidden rounded-full bg-white p-1 shadow-xl ring-1 ring-white/40 sm:size-16">
                <Image src="/images/logo-febaco.png" alt="Logo FEBACO" fill sizes="64px" className="object-contain" />
              </div>
              <div>
                <p className="text-xl font-black tracking-[0.12em]">FEBACO</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75 sm:text-xs">République démocratique du Congo</p>
              </div>
            </div>

            <div className="max-w-2xl pb-1 lg:pb-0">
              <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#f7ce20] sm:text-sm">
                <span className="h-px w-8 bg-[#f7ce20]" aria-hidden="true" />
                Institution sportive nationale
              </p>
              <h1 id="hero-title" className="max-w-xl text-3xl font-black leading-[1.02] tracking-[-0.04em] text-balance min-[420px]:text-4xl sm:text-5xl sm:leading-[0.98] xl:text-6xl">
                Le basketball congolais, uni et ambitieux.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/82 sm:text-base sm:leading-7">
                Une plateforme nationale dédiée à la structuration, à l’identification et au développement du basketball congolais.
              </p>
            </div>
          </div>
        </section>

        <section className="relative flex items-center bg-[#071c32] px-6 py-10 sm:px-10 lg:px-12 lg:py-8 xl:px-16" aria-labelledby="login-title">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -right-24 top-16 size-64 rounded-full bg-[#0b8fda]/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-1 w-full bg-[linear-gradient(90deg,#0b8fda_0_52%,#f7ce20_52%_60%,#cf1736_60%_100%)] opacity-80" />
          </div>

          <div className="relative mx-auto w-full max-w-[460px]">
            <div className="mb-7">
              <p className="text-sm font-semibold text-[#62c8ff]">Fédération de Basketball du Congo</p>
              <h2 id="login-title" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Espace fédéral</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">Connectez-vous pour accéder à la plateforme de gestion fédérale.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div role="alert" aria-live="polite" className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-slate-100">Adresse e-mail</label>
                <Input id="email" name="email" type="email" autoComplete="email" placeholder="nom@febaco.cd" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-12 border-white/15 bg-white/[0.06] px-4 text-white placeholder:text-slate-500 focus-visible:border-[#62c8ff] focus-visible:ring-[#62c8ff]/30" required />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-slate-100">Mot de passe</label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Saisissez votre mot de passe" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="h-12 border-white/15 bg-white/[0.06] px-4 pr-12 text-white placeholder:text-slate-500 focus-visible:border-[#62c8ff] focus-visible:ring-[#62c8ff]/30" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={showPassword} className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62c8ff]">
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" size="lg" className="h-12 w-full bg-[#f0bd16] font-bold text-[#071c32] shadow-lg shadow-black/20 hover:bg-[#ffd43b] focus-visible:ring-[#f7ce20]/60" disabled={isLoading}>
                {isLoading ? <><Loader2 className="size-4 animate-spin motion-reduce:animate-none" />Connexion en cours…</> : <><LockKeyhole className="size-4" />Se connecter</>}
              </Button>
            </form>

            <div className="mt-7 flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs text-slate-400">
              <span>Version 1.0 · Consultation uniquement</span>
              <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1">Accès sécurisé</span>
            </div>

            <footer className="mt-8 text-center lg:mt-10">
              <p className="text-[11px] uppercase tracking-[0.13em] text-slate-500">Plateforme du référentiel sportif national</p>
              <p className="ds-signature mt-2 inline-block text-xs font-medium tracking-wide text-slate-400">Design by <span className="text-slate-200">DS Concept</span></p>
            </footer>
          </div>
        </section>
      </div>

      <style jsx>{`
        .ds-signature { background: linear-gradient(100deg, #94a3b8 20%, #ffffff 48%, #94a3b8 76%); background-size: 220% auto; color: transparent; -webkit-background-clip: text; background-clip: text; animation: signature-shine 8s ease-in-out infinite; }
        @keyframes signature-shine { 0%, 72%, 100% { background-position: 100% center; } 84% { background-position: 0% center; } }
        @media (prefers-reduced-motion: reduce) { .ds-signature { animation: none; background-position: center; } }
      `}</style>
    </main>
  )
}
