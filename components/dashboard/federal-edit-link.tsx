"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FederalEditLink({ href }: { href: string }) {
  const [allowed,setAllowed]=useState(false)
  useEffect(()=>{void fetch("/api/auth/me").then(r=>r.json()).then(j=>setAllowed(j?.user?.role==="federal"))},[])
  return allowed?<Button asChild><Link href={href}><Pencil/>Modifier</Link></Button>:null
}
