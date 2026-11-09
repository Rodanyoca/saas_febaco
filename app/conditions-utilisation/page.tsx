import Link from "next/link"

export const metadata = { title: "Conditions d’utilisation — FEBACO" }

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-background px-6 py-16 text-foreground">
      <article className="mx-auto max-w-3xl space-y-6">
        <p className="text-sm text-muted-foreground">Fédération de Basketball du Congo</p>
        <h1 className="text-3xl font-bold">Conditions d’utilisation</h1>
        <p>Les conditions d’utilisation de la plateforme FEBACO seront publiées prochainement.</p>
        <Link href="/login" className="inline-block rounded text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Retour à la connexion</Link>
      </article>
    </main>
  )
}
