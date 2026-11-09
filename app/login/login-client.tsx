"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react"

import { Label } from "@/components/ui/label"
import styles from "./login.module.css"

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
        : (["/dashboard", "/dashboard/activites", "/mon-compte"].includes(json.redirectTo) ? json.redirectTo : "/dashboard")
      router.push(json.redirectTo === "/activation" ? "/activation" : safeNext)
    } catch {
      setError("Connexion impossible.")
      setIsLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="institution-title">
        <Image src="/images/equipe-nationale-rdc.jpg" alt="Joueurs de l’équipe nationale de basketball de la RDC réunis derrière le drapeau congolais" fill priority sizes="(max-width: 1023px) 100vw, 62vw" className={styles.heroImage} />
        <div className={styles.heroShade} />
        <div className={styles.heroInner}>
          <div className={styles.brandLockup}>
            <div className={styles.brandLogo}>
              <Image src="/images/logo-febaco.png" alt="Logo de la Fédération de Basketball du Congo" fill sizes="64px" className={styles.brandLogoImage} />
            </div>
            <div>
              <p className={styles.brandName}>FEBACO</p>
            </div>
          </div>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Fédération sportive nationale</p>
            <h1 id="institution-title">Ensemble, portons plus haut les couleurs de la RDC.</h1>
            <p className={styles.introduction}>Une plateforme fédérale dédiée aux structures, aux acteurs et au développement du basketball congolais.</p>
          </div>
        </div>
        <div className={styles.nationalLine} aria-hidden="true" />
      </section>

      <aside className={styles.loginPanel} aria-labelledby="login-title">
        <div className={styles.panelContent}>
          <div className={styles.mobileBrand}><Image src="/images/logo-febaco.png" alt="FEBACO" width={48} height={48} /><strong>FEBACO</strong></div>
          <div className={styles.welcome}>
            <p className={styles.panelEyebrow}>Fédération de Basketball du Congo</p>
            <h2 id="login-title">Espace institutionnel</h2>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} aria-busy={isLoading}>
            <div className={styles.field}>
              <Label htmlFor="email">Adresse e-mail</Label>
              <div className={styles.inputWrap}>
                <Input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} disabled={isLoading} aria-invalid={Boolean(error)} required />
              </div>
            </div>

            <div className={styles.field}>
              <Label htmlFor="password">Mot de passe</Label>
              <div className={styles.inputWrap}>
                <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} disabled={isLoading} aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} required />
                <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className={styles.messageSlot}>
              {error && <p id="login-error" className={styles.error} role="alert">{error}</p>}
            </div>
            <Button type="submit" className={styles.submit} disabled={isLoading}>
              {isLoading && <LoaderCircle className={styles.spinner} aria-hidden="true" />}
              {!isLoading && <LockKeyhole aria-hidden="true" />}
              {isLoading ? "Connexion en cours…" : "Se connecter"}
            </Button>
          </form>

          <nav aria-label="Informations institutionnelles" className={styles.legalLinks}>
            <Link href="/confidentialite">Politique de confidentialité</Link>
            <Link href="/conditions-utilisation">Conditions d’utilisation</Link>
          </nav>
          <p className={styles.platformLabel}>Plateforme du référentiel sportif national</p>
          <p className={styles.signature} aria-label="Design par DS Concept"><span>Design by</span><strong>DS Concept</strong></p>
        </div>
      </aside>
    </main>
  )
}
