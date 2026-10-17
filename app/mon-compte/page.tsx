import { AccountSecurityForm } from "@/components/account-security-form"
import { getSessionUser } from "@/lib/auth-session"
import { redirect } from "next/navigation"
export default async function Page(){const user=await getSessionUser();if(!user)redirect("/login");if(user.doitChangerMotDePasse)redirect("/activation");return <main className="mx-auto max-w-lg p-6"><p className="mb-6 font-bold">FEBACO · {user.nom}</p><AccountSecurityForm/></main>}
