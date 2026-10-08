import NationalTeamsWorkspace from "@/components/dashboard/national-teams-workspace"

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params
  return <NationalTeamsWorkspace teamId={decodeURIComponent(id)}/>
}
