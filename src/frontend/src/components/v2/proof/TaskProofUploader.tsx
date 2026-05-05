// v2.0.5 — Image proof opcional al completar una tarea.
//
// MVP: convertimos el File local a data-URL si es <500 KB; rechazamos el resto
// con un aviso para que el usuario use HTTPS hosting. La idea es no almacenar
// binarios en BD; preferimos que en el futuro sea una URL https://. Por ahora
// el data-URL pequeño cubre el caso "foto del baño limpio comprimida".

import { useState } from 'react'
import { useTaskProof, useUploadTaskProof, useDeleteTaskProof } from '../../../hooks/useTaskProof'

const MAX_BYTES = 500 * 1024

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'))
    reader.readAsDataURL(file)
  })
}

interface Props {
  logId: string
  canEdit: boolean       // sólo el owner del log
  compact?: boolean
}

export function TaskProofUploader({ logId, canEdit, compact = false }: Props) {
  const { data, isLoading } = useTaskProof(logId)
  const upload = useUploadTaskProof()
  const remove = useDeleteTaskProof()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (isLoading) return null

  const url = data?.proofImageUrl ?? null
  const uploadedAt = data?.proofUploadedAt

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    if (file.size > MAX_BYTES) {
      setError(`Archivo demasiado grande (${(file.size / 1024).toFixed(0)} KB). Máx 500 KB.`)
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Solo imágenes.')
      return
    }
    try {
      setBusy(true)
      const dataUrl = await fileToDataUrl(file)
      await upload.mutateAsync({ logId, proofImageUrl: dataUrl })
    } catch (err: any) {
      setError(err?.message ?? 'Error al subir')
    } finally {
      setBusy(false)
    }
  }

  if (!url && !canEdit) {
    return null  // partner sin permiso para editar y sin foto: no mostrar nada
  }

  // v2.6.2 audit 06 S1-14 — repintado con tokens dark del v2.
  return (
    <div className={compact ? 'mt-1' : 'mt-2 p-2 rounded border border-brd-subtle bg-surface-muted'}>
      {url ? (
        <div className="flex items-start gap-2">
          <img
            src={url}
            alt="Prueba de tarea completada"
            className={compact ? 'w-12 h-12 rounded object-cover' : 'w-24 h-24 rounded object-cover'}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-secondary">
              Subida {uploadedAt ? new Date(uploadedAt).toLocaleString() : ''}
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={() => remove.mutate(logId)}
                disabled={remove.isPending}
                className="text-xs text-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger rounded"
              >
                Quitar foto
              </button>
            )}
          </div>
        </div>
      ) : (
        <label className="text-xs cursor-pointer text-brand-amber hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber rounded">
          📸 Añadir foto de prueba (opcional)
          <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" disabled={busy} />
        </label>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
}

export default TaskProofUploader
