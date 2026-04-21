import jwt from 'jsonwebtoken'
import bcryptjs from 'bcryptjs'
import crypto from 'crypto'
import { config } from 'dotenv'

config()

import prisma from '../lib/prisma.js'
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET env var must be set and at least 32 characters long')
}
const JWT_EXPIRY = '7d'

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcryptjs.genSalt(10)
  return bcryptjs.hash(password, salt)
}

// Verify password
export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcryptjs.compare(password, hash)
}

// Generate JWT token
export const generateToken = (userId: string, coupleId: string): string => {
  return jwt.sign(
    { userId, coupleId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  )
}

// Verify JWT token
export const verifyToken = (token: string): { userId: string; coupleId: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; coupleId: string }
    return decoded
  } catch (error) {
    return null
  }
}

// Signup a single user.
// If a pending email invitation exists for this address, link the new user
// to the inviter's existing couple and auto-accept the invitation (B1 fix).
// Otherwise, create a solo couple so the user has a coupleId from day 1.
export async function signupUser(
  email: string,
  password: string,
  name: string,
  language: string = 'es'
) {
  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      throw new Error('Email already registered')
    }

    const passwordHash = await hashPassword(password)

    // B1: If there's a pending email invitation for this address, attach the new
    // user to the inviter's couple instead of creating a new solo couple.
    // Prefer invitation.coupleId (the couple at time of invite) over
    // fromUser.coupleId so a inviter who later switches couples doesn't drag
    // the signup into the wrong group.
    const pendingInvite = await prisma.invitation.findFirst({
      where: {
        toEmail: email,
        type: 'email_invite',
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      include: { fromUser: { select: { id: true, coupleId: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const targetCoupleId = pendingInvite?.coupleId ?? pendingInvite?.fromUser?.coupleId ?? null
    if (pendingInvite && targetCoupleId) {
      const inviterCouple = await prisma.couple.findUnique({
        where: { id: targetCoupleId },
        include: { users: true },
      })
      if (inviterCouple && inviterCouple.users.length < 2) {
        const linkedUser = await prisma.user.create({
          data: {
            email,
            passwordHash,
            name,
            coupleId: inviterCouple.id,
            roleInHome: 'equal',
            timezone: 'Europe/Madrid',
            hasCompletedOnboarding: false,
            notificationsPush: true,
            notificationsEmail: true,
          },
          select: { id: true, email: true, name: true, coupleId: true },
        })
        await prisma.invitation.update({
          where: { id: pendingInvite.id },
          data: { status: 'accepted', toUserId: linkedUser.id },
        })
        // Notify the inviter so they see the link happened in real time.
        if (pendingInvite.fromUserId) {
          await prisma.notification.create({
            data: {
              coupleId: inviterCouple.id,
              userId: pendingInvite.fromUserId,
              type: 'PARTNER_JOINED',
              title: '🎉 Tu pareja se ha unido',
              message: `${name} ha creado su cuenta y ya estáis vinculados.`,
              isRead: false,
            },
          })
        }
        return linkedUser
      }
    }

    // Create a solo couple so all couple-scoped features work immediately
    const couple = await prisma.couple.create({
      data: {
        secretKey: crypto.randomBytes(16).toString('hex'),
        language,
        configurations: {
          create: {
            tasksConfig: JSON.stringify({ cocina: 2.0, baños: 1.5, limpieza: 1.5, compra: 1.0, logistica: 1.0, cuidado: 1.5 }),
            multipliersConfig: JSON.stringify({
              franja: { mañana: 1.3, normal: 1.0, tarde: 1.2, noche: 1.2, madrugada: 1.5 },
              duracion: { corta: 1.0, media: 1.1, larga: 1.25, muyLarga: 1.35 },
              hijos: { 0: 1.0, 1: 1.4, 2: 1.8, 3: 2.2 },
              impacto: { necesaria: 0.7, salud: 0.85, social: 1.0, alto: 1.4 },
            }),
            activityTypes: JSON.stringify([]),
          },
        },
        subscriptions: { create: { plan: 'free' } },
      },
    })

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        coupleId: couple.id,
        roleInHome: 'equal',
        timezone: 'Europe/Madrid',
        hasCompletedOnboarding: false,
        notificationsPush: true,
        notificationsEmail: true,
      },
      select: { id: true, email: true, name: true, coupleId: true },
    })

    // Tasks start empty — users add their own from the catalog or create new ones.

    // Create basic event categories so RequestActivity works
    const eventCats = [
      { name: 'Gastronomía', emoji: '🍽️', basePoints: 10 },
      { name: 'Escapadas & Viajes', emoji: '✈️', basePoints: 18 },
      { name: 'Ocio & Cultura', emoji: '🎭', basePoints: 7 },
      { name: 'Deporte & Bienestar', emoji: '🏋️', basePoints: 6 },
      { name: 'Familia & Social', emoji: '👨‍👩‍👧', basePoints: 8 },
      { name: 'Trabajo & Obligaciones', emoji: '🏢', basePoints: 7 },
      { name: 'Ocio Personal', emoji: '🎮', basePoints: 6 },
    ]
    for (const cat of eventCats) {
      await prisma.category.create({
        data: { coupleId: couple.id, name: cat.name, emoji: cat.emoji, type: 'event', basePoints: cat.basePoints, isCustom: false, isActive: true },
      })
    }

    // Create basic achievements
    const achievements = [
      { type: 'couple', name: 'Primer Evento', description: 'Acuerda tu primer evento', icon: '🎉', rarity: 'common', condition: JSON.stringify({ type: 'events_accepted', threshold: 1 }) },
      { type: 'couple', name: 'Colaborador', description: 'Acuerda 5 eventos', icon: '👥', rarity: 'rare', condition: JSON.stringify({ type: 'events_accepted', threshold: 5 }) },
      { type: 'couple', name: 'Acumulador', description: 'Gana 50 puntos totales', icon: '⭐', rarity: 'common', condition: JSON.stringify({ type: 'points_earned', threshold: 50 }) },
    ]
    for (const ach of achievements) {
      await prisma.achievement.create({ data: { coupleId: couple.id, ...ach } })
    }

    return user
  } catch (error) {
    throw error
  }
}

// Signup a new couple
export const signupCouple = async (
  email1: string,
  password1: string,
  name1: string,
  email2: string,
  password2: string,
  name2: string,
  language: string = 'es'
) => {
  try {
    // Check if emails already exist
    const existingUsers = await prisma.user.findMany({
      where: {
        email: {
          in: [email1, email2]
        }
      }
    })

    if (existingUsers.length > 0) {
      const existingEmails = existingUsers.map(u => u.email).join(', ')
      throw new Error(`Email(s) already registered: ${existingEmails}`)
    }

    // Create couple
    const couple = await prisma.couple.create({
      data: {
        secretKey: crypto.randomBytes(16).toString('hex'),
        language,
        users: {
          create: [
            {
              email: email1,
              passwordHash: await hashPassword(password1),
              name: name1,
            },
            {
              email: email2,
              passwordHash: await hashPassword(password2),
              name: name2,
            }
          ]
        },
        configurations: {
          create: {
            tasksConfig: JSON.stringify({
              cocina: 2.0,
              baños: 1.5,
              limpieza: 1.5,
              compra: 1.0,
              logistica: 1.0,
              cuidado: 1.5,
            }),
            multipliersConfig: JSON.stringify({
              activityTypes: {
                cena: 1.0,
                viaje: 1.2,
                despedida: 1.4,
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
                0: 1.0,
                1: 1.4,
                2: 1.8,
                3: 2.2,
              },
              impacto: {
                necesaria: 0.7,
                salud: 0.85,
                social: 1.0,
                alto: 1.4,
              },
            }),
          }
        },
        subscriptions: {
          create: {
            plan: 'free',
          }
        }
      },
      include: {
        users: true,
      }
    })

    return couple
  } catch (error) {
    throw error
  }
}

// Login user
export const loginUser = async (email: string, password: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { couple: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const passwordValid = await verifyPassword(password, user.passwordHash)
    if (!passwordValid) {
      throw new Error('Invalid password')
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    const token = generateToken(user.id, user.coupleId ?? '')

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        coupleId: user.coupleId,
        role: user.roleInHome,
        timezone: user.timezone,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
      }
    }
  } catch (error) {
    throw error
  }
}

// Get user by ID
export const getUserById = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { couple: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    return user
  } catch (error) {
    throw error
  }
}

// Get couple data
export const getCoupleData = async (coupleId: string) => {
  try {
    const couple = await prisma.couple.findUnique({
      where: { id: coupleId },
      include: {
        users: true,
        configurations: true,
      }
    })

    if (!couple) {
      throw new Error('Couple not found')
    }

    return couple
  } catch (error) {
    throw error
  }
}
