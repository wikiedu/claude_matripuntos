// V2 Types - Extended functionality

export interface UserProfileInput {
  surname?: string
  profilePhotoUrl?: string
  dateOfBirth?: string
  weeklyWorkHours?: number
  workMode?: 'presencial' | 'teletrabajo' | 'hibrido'
  workSchedule?: Record<string, { start: string; end: string }>
  taskPreferencesLoves?: string[]
  taskPreferencesDislikes?: string[]
}

export interface CoupleProfileInput {
  homeType?: 'piso' | 'casa' | 'otro'
  homeSizeM2?: number
  cohabitation?: {
    alwaysTogether?: boolean
    schedule?: string
  }
  externalServices?: {
    hasCleaner?: boolean
    cleanerDays?: string[]
    hasBabysitter?: boolean
    babysitterSchedule?: string
    otherServices?: string[]
  }
}

export interface ChildInput {
  name: string
  dateOfBirth: string
  livesWithUser1: boolean
  livesWithUser2: boolean
  hasSpecialNeeds?: boolean
}

export interface PetInput {
  name: string
  type: 'perro' | 'gato' | 'otro'
  quantity: number
}

export interface InvitationInput {
  inviteeEmail: string
}

export interface OnboardingData {
  userProfile: UserProfileInput
  coupleProfile?: CoupleProfileInput
  children?: ChildInput[]
  pets?: PetInput[]
}
