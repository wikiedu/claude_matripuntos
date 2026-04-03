import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { z } from 'zod'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const configSchema = z.object({
  tasksConfig: z.record(z.number()).optional(),
  multipliersConfig: z.record(z.any()).optional(),
  activityTypes: z.record(z.any()).optional(),
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
              deporte: 0.8,
              trabajo: 1.1,
              salud: 0.65,
              tramite: 0.85,
              evento: 1.15,
              otro: 1.0,
            },
            franja: {
              mañana: 1.0,
              tarde: 1.2,
              noche: 1.5,
              madrugada: 1.8,
            },
            duracion: {
              corta: 1.0,
              media: 1.15,
              larga: 1.35,
            },
            hijos: {
              '0': 1.0,
              '1': 1.4,
              '2': 1.8,
              '3': 2.2,
            },
          }),
          activityTypes: JSON.stringify({
            salida: { base: 8, label: '🍻 Salida (amigos/social)' },
            viaje: { base: 10, label: '✈️ Viaje' },
            escapada: { base: 6, label: '💑 Escapada en pareja' },
            deporte: { base: 4, label: '🏃 Deporte / hobby' },
            trabajo: { base: 5, label: '💼 Trabajo / formación' },
            salud: { base: 3, label: '🏥 Salud / médico' },
            tramite: { base: 3, label: '📋 Trámite / gestión' },
            evento: { base: 12, label: '🎉 Evento especial' },
            otro: { base: 5, label: '📌 Otro' },
          }),
        },
      })
    }

    res.json({
      configuration: {
        id: config.id,
        coupleId: config.coupleId,
        tasksConfig: JSON.parse(config.tasksConfig || '{}'),
        multipliersConfig: JSON.parse(config.multipliersConfig || '{}'),
        activityTypes: JSON.parse(config.activityTypes || '{}'),
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
        tasksConfig: JSON.parse(config.tasksConfig || '{}'),
        multipliersConfig: JSON.parse(config.multipliersConfig || '{}'),
        activityTypes: JSON.parse(config.activityTypes || '{}'),
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
          deporte: 0.8,
          trabajo: 1.1,
          salud: 0.65,
          tramite: 0.85,
          evento: 1.15,
          otro: 1.0,
        },
        franja: {
          mañana: 1.0,
          tarde: 1.2,
          noche: 1.5,
          madrugada: 1.8,
        },
        duracion: {
          corta: 1.0,
          media: 1.15,
          larga: 1.35,
        },
        hijos: {
          '0': 1.0,
          '1': 1.4,
          '2': 1.8,
          '3': 2.2,
        },
      },
      activityTypes: {
        salida: { base: 8, label: '🍻 Salida (amigos/social)' },
        viaje: { base: 10, label: '✈️ Viaje' },
        escapada: { base: 6, label: '💑 Escapada en pareja' },
        deporte: { base: 4, label: '🏃 Deporte / hobby' },
        trabajo: { base: 5, label: '💼 Trabajo / formación' },
        salud: { base: 3, label: '🏥 Salud / médico' },
        tramite: { base: 3, label: '📋 Trámite / gestión' },
        evento: { base: 12, label: '🎉 Evento especial' },
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
        tasksConfig: JSON.parse(config.tasksConfig),
        multipliersConfig: JSON.parse(config.multipliersConfig),
        activityTypes: JSON.parse(config.activityTypes),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset configuration'
    res.status(400).json({ error: message })
  }
})

export default router
