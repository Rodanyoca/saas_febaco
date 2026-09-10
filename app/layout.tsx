import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'FEBACO - Federation de Basketball du Congo',
  description: 'Systeme de Gestion de la Federation de Basketball du Congo - Powered by DS Concept',
  generator: 'FEBACO',
  icons: {
    icon: [{ url: '/images/logo-febaco.png', type: 'image/png' }],
    shortcut: '/images/logo-febaco.png',
    apple: '/images/logo-febaco.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
