import { protectedPage } from "@/lib/auth/guard"
import { notFound } from "next/navigation";import { getSessionUser } from "@/lib/auth-session";import { loadActivityDetail } from "@/lib/activities";import { ActivityDetail } from "@/components/administration/activity-detail"
export const dynamic="force-dynamic";async function ActivityPage({params}:{params:Promise<{id:string}>}){const detail=await loadActivityDetail(decodeURIComponent((await params).id));if(!detail)notFound();const user=await getSessionUser();return <ActivityDetail detail={detail} canEdit={user?.role==="federal"}/>}

export default function ProtectedPage(props: Parameters<typeof ActivityPage>[0]) { return protectedPage("/dashboard/activites", () => ActivityPage(props)) }
