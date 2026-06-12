// Dominio auth: sesión, alta de pareja, propuestas de partner e invitaciones
// (las rutas de invitación V2 también cuelgan de /api/auth en el backend).
import { http } from './http'

// Auth endpoints
export const auth = {
  signup: (data: {
    email1: string
    password1: string
    name1: string
    email2: string
    password2: string
    name2: string
  }) =>
    http.request('/auth/signup', {
      method: 'POST',
      headers: { 'X-Want-Refresh': '1' }, // #9 — signup también opta a rotación
      body: JSON.stringify(data),
    }),

  // v2.7.5 audit 04 S1-6 — `X-Want-Refresh: 1` opt-in: el backend
  // responde con `refreshToken` además del access JWT. Si en el futuro
  // se reduce el TTL del access a 15m, ya tenemos rotación lista.
  login: (email: string, password: string) =>
    http.request('/auth/login', {
      method: 'POST',
      headers: { 'X-Want-Refresh': '1' },
      body: JSON.stringify({ email, password }),
    }),

  // v2.7.5 — revoca todos los refresh tokens activos del user.
  logout: () =>
    http.request('/auth/logout', { method: 'POST' }),

  demoAvailable: () => http.request('/auth/demo-available'),
  demoLogin: () => http.request('/auth/demo-login', { method: 'POST' }),

  getMe: () => http.request('/auth/me'),

  getCouple: () => http.request('/auth/couple'),

  invite: (toEmail: string) =>
    http.request('/auth/invite', { method: 'POST', body: JSON.stringify({ toEmail }) }),

  acceptInvite: (token: string, email: string, password: string, name: string) =>
    http.request('/auth/accept-invite', { method: 'POST', headers: { 'X-Want-Refresh': '1' }, body: JSON.stringify({ token, email, password, name }) }),

  rejectInvite: (token: string) =>
    http.request('/auth/reject-invite', { method: 'POST', body: JSON.stringify({ token }) }),

  proposePartner: (partnerEmail: string) =>
    http.request('/auth/propose-partner', { method: 'POST', body: JSON.stringify({ partnerEmail }) }),

  acceptProposal: (invitationId: string) =>
    http.request('/auth/accept-proposal', { method: 'POST', body: JSON.stringify({ invitationId }) }),

  rejectProposal: (invitationId: string) =>
    http.request('/auth/reject-proposal', { method: 'POST', body: JSON.stringify({ invitationId }) }),

  getPendingProposals: () =>
    http.request('/auth/proposals', { method: 'GET' }),

  // Preview pública de una pareja por joinCode. No requiere auth.
  previewCouple: (code: string) =>
    http.request(`/auth/couple-preview/${encodeURIComponent(code)}`),

  registerWithCode: (data: {
    email: string
    password: string
    name: string
    joinCode: string
    language?: string
    ageConfirmed?: true
  }) =>
    http.request('/auth/register-with-code', {
      method: 'POST',
      headers: { 'X-Want-Refresh': '1' },
      body: JSON.stringify(data),
    }),
}

// Invitation endpoints (V2)
export const invitations = {
  invitePartner: (data: { inviteeEmail: string }) =>
    http.request('/auth/invite-partner', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  linkPartner: (data: { partnerEmail: string }) =>
    http.request('/auth/link-partner', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  validateToken: (token: string) =>
    http.request(`/auth/invitation/${token}`),

  acceptInvitation: (token: string) =>
    http.request('/auth/accept-invitation', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  registerWithInvitation: (data: any) =>
    http.request('/auth/register-with-invitation', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  pendingLinkRequests: () =>
    http.request('/auth/pending-link-requests'),

  acceptLinkPartner: (invitationId: string) =>
    http.request('/auth/accept-link-partner', {
      method: 'POST',
      body: JSON.stringify({ invitationId }),
    }),

  rejectLinkPartner: (invitationId: string) =>
    http.request('/auth/reject-link-partner', {
      method: 'POST',
      body: JSON.stringify({ invitationId }),
    }),
}
