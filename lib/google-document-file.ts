import { getDriveUserClient } from "@/lib/google-clients"
import { uploadAvatarToDrive } from "@/lib/google-drive"

export const DOCUMENT_MAX_SIZE_BYTES=25*1024*1024
export function documentFolderId(){const value=String(process.env.GOOGLE_DRIVE_DOCUMENTS_FOLDER_ID??"").trim(),id=value.match(/\/folders\/([A-Za-z0-9_-]+)/)?.[1]||value;if(!/^[A-Za-z0-9_-]{10,200}$/.test(id))throw new Error("GOOGLE_DRIVE_DOCUMENTS_FOLDER_ID est absent ou invalide.");return id}
export async function uploadDocumentFile(documentId:string,title:string,file:File){if(file.size<5||file.size>DOCUMENT_MAX_SIZE_BYTES)throw new Error("Le PDF doit avoir une taille comprise entre 5 octets et 25 Mo.");const buffer=Buffer.from(await file.arrayBuffer());if(buffer.subarray(0,5).toString("ascii")!=="%PDF-")throw new Error("Le fichier doit être un PDF valide.");const safe=title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"_").slice(0,80)||"DOCUMENT";const uploaded=await uploadAvatarToDrive({folderId:documentFolderId(),fileName:`${documentId}_${safe}.pdf`,mimeType:"application/pdf",buffer});return{id:uploaded.fileId,name:uploaded.name,mimeType:"application/pdf",url:uploaded.webViewLink||uploaded.publicUrl}}
export async function rollbackDocumentFile(fileId:string){if(fileId)await getDriveUserClient().files.delete({fileId,supportsAllDrives:true})}
