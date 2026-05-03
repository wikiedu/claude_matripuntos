// v2.0.5 — Image proof routes for task logs.
// Flag: TASK_PROOF_ENABLED (default ON).
//
// Diseño MVP: el frontend sube la imagen a su propio almacenamiento (cloud o
// data-URL pequeña) y nos pasa la URL. NO almacenamos binarios en BD.
// Validamos longitud máxima (10 KB de URL = ya muy generoso para data-urls
// pequeñas; rechazamos data-urls > 500 KB).

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth.js'
import { writeBucket, readBucket } from '../middleware/rateLimiter.js'
import prisma from '../lib/prisma.js'

const router = Router()
router.use(authenticateToken)

function isFlagEnabled(): boolean {
  return process.env.TASK_PROOF_ENABLED !== 'false'
}
router.use((_req, res, next) => {
  if (!isFlagEnabled()) return res.status(404).json({ error: 'Not found' })
  next()
})

const MAX_DATA_URL_BYTES = 500 * 1024 // 500 KB
const MAX_HTTPS_URL_LEN  = 2048

const schema = z.object({
  proofImageUrl: z.string().min(1).refine((s) => {
    if (s.startsWith('https://')) return s.length <= MAX_HTTPS_URL_LEN
    if (s.startsWith('data:image/')) return s.length <= MAX_DATA_URL_BYTES
    return false
  }, 'URL inválida (debe ser https:// o data:image/* <500KB)'),
})

// POST /api/task-logs/:logId/proof
router.post('/:logId/proof', writeBucket, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })

  const log = await prisma.taskLog.findUnique({ where: { id: req.params.logId } })
  if (!log || log.coupleId !== coupleId) return res.status(404).json({ error: 'Not found' })
  if (log.completedBy && log.completedBy !== userId) {
    return res.status(403).json({ error: 'Solo quien marcó la tarea puede subir prueba' })
  }

  const updated = await prisma.taskLog.update({
    where: { id: log.id },
    data: {
      proofImageUrl: parsed.data.proofImageUrl,
      proofUploadedAt: new Date(),
    },
  })
  res.json({ taskLog: updated })
})

// DELETE /api/task-logs/:logId/proof
router.delete('/:logId/proof', writeBucket, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const log = await prisma.taskLog.findUnique({ where: { id: req.params.logId } })
  if (!log || log.coupleId !== coupleId) return res.status(404).json({ error: 'Not found' })
  if (log.completedBy && log.completedBy !== userId) {
    return res.status(403).json({ error: 'Solo quien subió la prueba puede borrarla' })
  }

  await prisma.taskLog.update({
    where: { id: log.id },
    data: {
      proofImageUrl: null,
      proofUploadedAt: null,
    },
  })
  res.status(204).end()
})

// GET /api/task-logs/:logId/proof — lectura visible al partner para verificar
router.get('/:logId/proof', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const log = await prisma.taskLog.findUnique({
    where: { id: req.params.logId },
    select: { id: true, coupleId: true, proofImageUrl: true, proofUploadedAt: true },
  })
  if (!log || log.coupleId !== coupleId) return res.status(404).json({ error: 'Not found' })
  res.json({
    proofImageUrl: log.proofImageUrl,
    proofUploadedAt: log.proofUploadedAt,
  })
})

export default router
