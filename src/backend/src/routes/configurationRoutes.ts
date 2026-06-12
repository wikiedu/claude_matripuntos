import express, { Request, Response } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { z } from 'zod'

const router = express.Router()
import prisma from '../lib/prisma.js'
import { parseJsonField } from '../lib/jsonField.js'

// Audit v1.4 P2-D: `z.record(z.any())` let the client send any JSON shape,
// which got serialized into SQLite verbatim. We now constrain the multiplier
// table to a fixed set of numeric keys and activityTypes to a list of
// strings. Unknown keys are rejected so the frontend can't accidentally
// bloat the row.
const MULTIPLIER_KEYS = [
  'nightMult', 'weekendBonus', 'morningMult', 'dayMult', 'eveningMult',
  'durationShort', 'durationMedium', 'durationLong', 'durationVeryLong',
  'childrenMult1', 'childrenMult2', 'childrenMult3',
  'typeNecessary', 'typeHealth', 'typeLeisure', 'typeHighImpact',
] as const

const configSchema = z.object({
  tasksConfig: z.record(z.number().min(0).max(10)).optional(),
  multipliersConfig: z
    .object(Object.fromEntries(
      MULTIPLIER_KEYS.map(k => [k, z.number().min(0).max(10).optional()])
    ) as Record<typeof MULTIPLIER_KEYS[number], z.ZodOptional<z.ZodNumber>>)
    .strict()
    .optional(),
  activityTypes: z.array(z.string().max(50)).max(50).optional(),
})

// GET /api/configuration - Get couple's configuration
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    let config = await prisma.configuration.findUnique({
      where: { coupleId: req.coupleId },
    })

    // If no config exists, create default one
    if (!config) {
      config = await prisma.configuration.create({
        data: {
          coupleId: req.coupleId,
          tasksConfig: JSON.stringify({
            cocina: 2.0,
            limpieza: 1.5,
            compra: 1.5,
            logistica: 1.5,
            cuidado: 2.5,
            baños: 1.0,
          }),
          multipliersConfig: JSON.stringify({
            activityTypes: {
              salida: 1.0,
              viaje: 1.2,
              escapada: 0.85,
              deporte: 0.85,
              trabajo: 1.0,
              salud: 0.7,
              tramite: 0.7,
              evento: 1.4,
              otro: 1.0,
            },
            franja: {
              mañana: 1.3,
              normal: 1.0,
              tarde: 1.2,
              noche: 1.2,
              madrugada: 1.5,
            },
            duracion: {
              corta: 1.0,
              media: 1.1,
              larga: 1.25,
              muyLarga: 1.35,
            },
            hijos: {
              '0': 1.0,
              '1': 1.4,
              '2': 1.8,
              '3': 2.2,
            },
          }),
          activityTypes: JSON.stringify({
            salida: { base: 6, label: '🍻 Salida (amigos/social)' },
            viaje: { base: 8, label: '✈️ Viaje' },
            escapada: { base: 6, label: '💑 Escapada en pareja' },
            deporte: { base: 4, label: '🏃 Deporte / hobby' },
            trabajo: { base: 5, label: '💼 Trabajo / formación' },
            salud: { base: 3, label: '🏥 Salud / médico' },
            tramite: { base: 3, label: '📋 Trámite / gestión' },
            evento: { base: 8, label: '🎉 Evento especial (boda/despedida)' },
            otro: { base: 5, label: '📌 Otro' },
          }),
        },
      })
    }

    res.json({
      configuration: {
        id: config.id,
        coupleId: config.coupleId,
        tasksConfig: parseJsonField(config.tasksConfig, {}),
        multipliersConfig: parseJsonField(config.multipliersConfig, {}),
        activityTypes: parseJsonField(config.activityTypes, {}),
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch configuration'
    res.status(400).json({ error: message })
  }
})

// PUT /api/configuration - Update couple's configuration
router.put('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const data = configSchema.parse(req.body)

    // Find or create configuration
    let config = await prisma.configuration.findUnique({
      where: { coupleId: req.coupleId },
    })

    if (!config) {
      config = await prisma.configuration.create({
        data: {
          coupleId: req.coupleId,
          tasksConfig: JSON.stringify(data.tasksConfig || {}),
          multipliersConfig: JSON.stringify(data.multipliersConfig || {}),
          activityTypes: JSON.stringify(data.activityTypes || {}),
        },
      })
    } else {
      config = await prisma.configuration.update({
        where: { coupleId: req.coupleId },
        data: {
          ...(data.tasksConfig && { tasksConfig: JSON.stringify(data.tasksConfig) }),
          ...(data.multipliersConfig && { multipliersConfig: JSON.stringify(data.multipliersConfig) }),
          ...(data.activityTypes && { activityTypes: JSON.stringify(data.activityTypes) }),
        },
      })
    }

    res.json({
      message: 'Configuration updated successfully',
      configuration: {
        id: config.id,
        coupleId: config.coupleId,
        tasksConfig: parseJsonField(config.tasksConfig, {}),
        multipliersConfig: parseJsonField(config.multipliersConfig, {}),
        activityTypes: parseJsonField(config.activityTypes, {}),
        updatedAt: config.updatedAt,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to update configuration'
    res.status(400).json({ error: message })
  }
})

// POST /api/configuration/reset - Reset to defaults
router.post('/reset', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const defaultConfig = {
      tasksConfig: {
        cocina: 2.0,
        limpieza: 1.5,
        compra: 1.5,
        logistica: 1.5,
        cuidado: 2.5,
        baños: 1.0,
      },
      multipliersConfig: {
        activityTypes: {
          salida: 1.0,
          viaje: 1.2,
          escapada: 0.85,
          deporte: 0.85,
          trabajo: 1.0,
          salud: 0.7,
          tramite: 0.7,
          evento: 1.4,
          otro: 1.0,
        },
        franja: {
          mañana: 1.3,
          normal: 1.0,
          tarde: 1.2,
          noche: 1.2,
          madrugada: 1.5,
        },
        duracion: {
          corta: 1.0,
          media: 1.1,
          larga: 1.25,
          muyLarga: 1.35,
        },
        hijos: {
          '0': 1.0,
          '1': 1.4,
          '2': 1.8,
          '3': 2.2,
        },
      },
      activityTypes: {
        salida: { base: 6, label: '🍻 Salida (amigos/social)' },
        viaje: { base: 8, label: '✈️ Viaje' },
        escapada: { base: 6, label: '💑 Escapada en pareja' },
        deporte: { base: 4, label: '🏃 Deporte / hobby' },
        trabajo: { base: 5, label: '💼 Trabajo / formación' },
        salud: { base: 3, label: '🏥 Salud / médico' },
        tramite: { base: 3, label: '📋 Trámite / gestión' },
        evento: { base: 8, label: '🎉 Evento especial (boda/despedida)' },
        otro: { base: 5, label: '📌 Otro' },
      },
    }

    const config = await prisma.configuration.upsert({
      where: { coupleId: req.coupleId },
      create: {
        coupleId: req.coupleId,
        tasksConfig: JSON.stringify(defaultConfig.tasksConfig),
        multipliersConfig: JSON.stringify(defaultConfig.multipliersConfig),
        activityTypes: JSON.stringify(defaultConfig.activityTypes),
      },
      update: {
        tasksConfig: JSON.stringify(defaultConfig.tasksConfig),
        multipliersConfig: JSON.stringify(defaultConfig.multipliersConfig),
        activityTypes: JSON.stringify(defaultConfig.activityTypes),
      },
    })

    res.json({
      message: 'Configuration reset to defaults',
      configuration: {
        id: config.id,
        coupleId: config.coupleId,
        tasksConfig: parseJsonField(config.tasksConfig, {}),
        multipliersConfig: parseJsonField(config.multipliersConfig, {}),
        activityTypes: parseJsonField(config.activityTypes, {}),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset configuration'
    res.status(400).json({ error: message })
  }
})

export default router
