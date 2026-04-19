export function buildDrivePublicUrl(fileId: string): string {
  const id = encodeURIComponent(String(fileId))
  return `/api/media/drive?id=${id}`
}
