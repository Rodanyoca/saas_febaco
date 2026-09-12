import type { SheetRow } from "@/lib/google-sheets";
import { CompetitionParticipationError } from "@/lib/competition-participants";
const clean=(value:unknown)=>String(value??"").trim();
export function requireMutableEdition(rows:SheetRow[],competitionId:string){
 const row=rows.find(item=>clean(item.id_competition)===competitionId);
 if(!row)throw new CompetitionParticipationError("COMPETITION_INTROUVABLE","L’édition n’existe pas.",404);
 if(clean(row.statut).toUpperCase()==="TERMINEE")throw new CompetitionParticipationError("EDITION_CLOTUREE","Cette édition est clôturée et consultable uniquement en historique.",409);
 return row;
}
