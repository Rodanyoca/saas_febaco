"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export type VerificationField = {
  label: string
  value: string
}

function computeAgeFromDateString(dateStr: string): string {
  const raw = String(dateStr ?? "").trim()
  if (!raw || raw === "-") return "-"

  const tryParse = (d: string): Date | null => {
    const dt = new Date(d)
    if (!Number.isNaN(dt.getTime())) return dt
    return null
  }

  const parsedDirect = tryParse(raw)
  if (parsedDirect) return String(Math.max(0, new Date().getFullYear() - parsedDirect.getFullYear()))

  const m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (m) {
    const dd = Number(m[1])
    const mm = Number(m[2])
    const yyyy = Number(m[3].length === 2 ? `20${m[3]}` : m[3])
    const dt = new Date(yyyy, mm - 1, dd)
    if (!Number.isNaN(dt.getTime())) {
      const now = new Date()
      let age = now.getFullYear() - dt.getFullYear()
      const monthDiff = now.getMonth() - dt.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dt.getDate())) age -= 1
      return String(Math.max(0, age))
    }
  }

  return "-"
}

export function AvatarUploadModal({
  open,
  onOpenChange,
  title,
  description,
  currentImageUrl,
  fallbackText,
  verificationFields,
  dateNaissanceForAge,
  onConfirm,
  onConfirmFile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  currentImageUrl?: string | null
  fallbackText: string
  verificationFields: VerificationField[]
  dateNaissanceForAge?: string
  onConfirm?: (localObjectUrl: string) => void
  onConfirmFile?: (file: File) => Promise<string>
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelectedUrl(null)
      setSelectedFile(null)
      setSubmitting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [open])

  const ageValue = useMemo(() => {
    if (!dateNaissanceForAge) return null
    return computeAgeFromDateString(dateNaissanceForAge)
  }, [dateNaissanceForAge])

  const fields = useMemo(() => {
    if (ageValue == null) return verificationFields
    return [...verificationFields, { label: "Âge", value: ageValue }]
  }, [ageValue, verificationFields])

  const previewSrc = selectedUrl || currentImageUrl || null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={previewSrc || undefined} alt={title} />
              <AvatarFallback className="text-base">{fallbackText}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const url = URL.createObjectURL(file)
                  setSelectedUrl(url)
                  setSelectedFile(file)
                }}
              />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                Choisir une photo
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">Formats acceptés: images (jpg, png, …).</p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-3">
            {fields.map((f) => (
              <div key={f.label} className="grid gap-2">
                <Label>{f.label}</Label>
                <Input value={f.value} readOnly />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={submitting || (!selectedUrl && !selectedFile)}
            onClick={async () => {
              if (submitting) return

              if (onConfirmFile) {
                if (!selectedFile) return
                try {
                  setSubmitting(true)
                  const url = await onConfirmFile(selectedFile)
                  onConfirm?.(url)
                  onOpenChange(false)
                } finally {
                  setSubmitting(false)
                }
                return
              }

              if (!selectedUrl) return
              onConfirm?.(selectedUrl)
              onOpenChange(false)
            }}
          >
            {submitting ? "Envoi..." : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
