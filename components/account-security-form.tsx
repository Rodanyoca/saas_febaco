"use client"
import { useRef,useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
export function AccountSecurityForm({ activation=false }: { activation?:boolean }){
  const router=useRouter(),[error,setError]=useState(""),[busy,setBusy]=useState(false)
  const locked=useRef(false)
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(locked.current)return;locked.current=true;setBusy(true);setError("")
    const form=new FormData(event.currentTarget)
    try {
      const response=await fetch(activation?"/api/auth/activate":"/api/auth/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({[activation?"temporaryAccess":"currentPassword"]:form.get("current"),newPassword:form.get("next"),confirmation:form.get("confirmation")})})
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||"Modification impossible.")
      router.replace(["/dashboard","/dashboard/activites","/mon-compte"].includes(result.redirectTo)?result.redirectTo:"/dashboard");router.refresh()
    }catch(reason){setError(reason instanceof Error?reason.message:"Modification impossible.");locked.current=false;setBusy(false)}
  }
  return <form onSubmit={submit} className="space-y-5 rounded-xl border bg-card p-6"><h1 className="text-2xl font-semibold">{activation?"Activer votre compte":"Modifier votre mot de passe"}</h1><p className="text-sm text-muted-foreground">Choisissez une phrase personnelle de 12 à 128 caractères.</p>{[["current",activation?"Accès temporaire":"Mot de passe actuel"],["next","Nouveau mot de passe"],["confirmation","Confirmation"]].map(([name,label])=><label className="block space-y-2" key={name}><span>{label}</span><Input name={name} type="password" required maxLength={128} autoComplete={name==="current"?"current-password":"new-password"} disabled={busy}/></label>)}{error&&<p role="alert" className="text-destructive">{error}</p>}<Button disabled={busy}>{busy?"Enregistrement…":activation?"Activer le compte":"Enregistrer"}</Button></form>
}
