import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

export async function createInvitation(
  fromUserId: string,
  toEmail: string,
  coupleIdIfAccepted?: string
) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

  const invitation = await prisma.invitation.create({
    data: {
      fromUserId,
      toEmail,
      token,
      type: 'email_invite',
      status: 'pending',
      coupleId: coupleIdIfAccepted,
      expiresAt,
    },
  })

  return invitation
}

export async function acceptEmailInvitation(token: string, newUserId: string) {
  const invitation = await prisma.invitation.findUnique({ where: { token } })

  if (!invitation) {
    throw new Error('Invitation not found')
  }

  if (invitation.status !== 'pending') {
    throw new Error(`Invitation already ${invitation.status}`)
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error('Invitation expired')
  }

  // Update invitation
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      status: 'accepted',
      toUserId: newUserId,
    },
  })

  // Create couple linking both users
  const couple = await prisma.couple.create({
    data: {
      users: {
        connect: [
          { id: invitation.fromUserId },
          { id: newUserId },
        ],
      },
    },
    include: { users: true },
  })

  return couple
}

export async function rejectInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({ where: { token } })

  if (!invitation) {
    throw new Error('Invitation not found')
  }

  if (invitation.status !== 'pending') {
    throw new Error(`Invitation already ${invitation.status}`)
  }

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: 'rejected' },
  })

  return invitation
}

export async function proposePartner(fromUserId: string, toUserId: string) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

  const invitation = await prisma.invitation.create({
    data: {
      fromUserId,
      toUserId,
      token,
      type: 'user_proposal',
      status: 'pending',
      expiresAt,
    },
  })

  return invitation
}

export async function acceptProposal(invitationId: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  })

  if (!invitation) {
    throw new Error('Proposal not found')
  }

  if (invitation.status !== 'pending') {
    throw new Error(`Proposal already ${invitation.status}`)
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error('Proposal expired')
  }

  // Update invitation
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: 'accepted' },
  })

  // Create couple
  const couple = await prisma.couple.create({
    data: {
      users: {
        connect: [
          { id: invitation.fromUserId },
          { id: invitation.toUserId! },
        ],
      },
    },
    include: { users: true },
  })

  return couple
}

export async function rejectProposal(invitationId: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  })

  if (!invitation) {
    throw new Error('Proposal not found')
  }

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: 'rejected' },
  })

  return invitation
}

export async function getInvitationByToken(token: string) {
  return prisma.invitation.findUnique({
    where: { token },
    include: {
      fromUser: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function getPendingProposalsForUser(userId: string) {
  return prisma.invitation.findMany({
    where: {
      toUserId: userId,
      type: 'user_proposal',
      status: 'pending',
      expiresAt: { gt: new Date() },
    },
    include: {
      fromUser: { select: { id: true, name: true, email: true } },
    },
  })
}
