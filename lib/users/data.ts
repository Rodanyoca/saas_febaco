import { readUsersTables, createGoogleUsersSheetsAdapter } from "./google-adapter"
import { UsersRepository } from "./repository"
import { DirectoryCache, type Directory } from "../auth/directory-cache"
import { onDirectoryInvalidation } from "./cache-invalidation"

const directory = new DirectoryCache(async (): Promise<Directory> => {
  const tables=await readUsersTables(["USERS","USER_AUTORISATIONS"]), repo=new UsersRepository(createGoogleUsersSheetsAdapter(tables))
  const [users,authorizations]=await Promise.all([repo.getUsers(),repo.getUserAuthorizations()])
  const grants=new Map<string,typeof authorizations>()
  for(const item of authorizations) grants.set(item.idUser,[...(grants.get(item.idUser)||[]),item])
  return {byId:new Map(users.map(user=>[user.idUser,user])),byEmail:new Map(users.map(user=>[user.email,user])),grants}
})
onDirectoryInvalidation(()=>directory.invalidate())
export async function getUserById(id:string,fresh=false){return (await directory.get(fresh)).byId.get(id)||null}
export async function getUserByEmail(email:string,fresh=false){return (await directory.get(fresh)).byEmail.get(email.trim().toLowerCase())||null}
export async function getAuthorizationsForUser(id:string){return (await directory.get()).grants.get(id)||[]}
export async function getAuthenticationSnapshot(email:string){
  const tables=await readUsersTables(["USERS","USER_AUTORISATIONS","AUTH_TENTATIVES"]),adapter=createGoogleUsersSheetsAdapter(tables),repo=new UsersRepository(adapter)
  const [user,attempts,authorizations]=await Promise.all([repo.getUserByEmail(email),repo.getAuthAttempts(),repo.getUserAuthorizations()])
  return {user,attempts,authorizations:authorizations.filter(item=>item.idUser===user?.idUser),adapter}
}
