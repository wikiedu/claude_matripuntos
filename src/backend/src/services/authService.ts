import jwt from 'jsonwebtoken'
import bcryptjs from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

config()

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
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
        secretKey: Math.random().toString(36).substring(2, 34),
        language,
        users: {
          create: [
            {
              email: email1,
              passwordHash: await hashPassword(password1),
              name: name1,
              role: 'user',
            },
            {
              email: email2,
              passwordHash: await hashPassword(password2),
              name: name2,
              role: 'user',
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
                despedida: 1.3,
              },
              franja: {
                mañana: 1.0,
                tarde: 1.1,
                noche: 1.2,
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
              }
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

    const token = generateToken(user.id, user.coupleId)

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        coupleId: user.coupleId,
        role: user.role,
        timezone: user.timezone,
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
