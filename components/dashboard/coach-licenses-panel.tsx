"use client"

import { ActorLicenseHistoryTable } from "@/components/dashboard/actor-license-history-table"

export function CoachLicensesPanel({ actorId }: { actorId: string }) {
  return <ActorLicenseHistoryTable actorId={actorId} typeId="TAC002" />
}
