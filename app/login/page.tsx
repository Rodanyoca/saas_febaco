"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Simulate authentication - will be replaced with real auth
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Demo credentials check
    if (formData.username === "admin" && formData.password === "admin") {
      router.push("/dashboard")
    } else {
      setError("Identifiants incorrects. Utilisez admin/admin pour la demo.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and branding */}
        <div className="text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg overflow-hidden">
            <Image
              src="/images/logo-febaco.png"
              alt="Logo FEBACO"
              width={96}
              height={96}
              className="object-contain"
              style={{ width: "auto", height: "auto" }}
              priority
            />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-sidebar-foreground">FEBACO</h1>
          <p className="mt-2 text-sidebar-muted text-sm">
            Systeme de Gestion de la Federation de Basketball du Congo
          </p>
        </div>

        {/* Login card */}
        <Card className="border-sidebar-border bg-sidebar-accent">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-sidebar-foreground">
              Connexion
            </CardTitle>
            <CardDescription className="text-center text-sidebar-muted">
              Accedez a la plateforme de gestion federale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="text-sm font-medium text-sidebar-foreground"
                >
                  Identifiant
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Entrez votre identifiant"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-muted"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-sidebar-foreground"
                >
                  Mot de passe
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Entrez votre mot de passe"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-muted pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-muted hover:text-sidebar-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-sidebar-muted">
              <p>Version 1.0 - Consultation uniquement</p>
              <p className="mt-1">Identifiants de demo: admin / admin</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-xs text-sidebar-muted">
            Plateforme de gestion du referentiel sportif de la FEBACO
          </p>
          <p className="text-xs text-sidebar-muted/70">
            Powered by <span className="font-semibold text-accent">DS Concept</span>
          </p>
        </div>
      </div>
    </div>
  )
}
