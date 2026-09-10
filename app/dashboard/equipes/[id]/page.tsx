import { TerritorialDetail } from "@/components/dashboard/territorial-detail"
export default async function Page({params}:{params:Promise<{id:string}>}){return <TerritorialDetail kind="equipes" id={decodeURIComponent((await params).id)}/>}
