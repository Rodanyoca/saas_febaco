import { isAuthorizationActive } from "./authorization"
import type { User, UserAuthorization } from "../users/types"
export function postLoginRoute(user:User,grants:readonly UserAuthorization[]){
  if(user.doitChangerMotDePasse)return "/activation"
  const active=grants.filter(g=>g.idUser===user.idUser&&isAuthorizationActive(g))
  if(user.estSuperAdmin||active.some(g=>g.idBlocAutorisation==="AUT-SPT"))return "/dashboard"
  if(active.some(g=>g.idBlocAutorisation==="AUT-ADM"))return "/dashboard/activites"
  return "/mon-compte"
}
