import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Copy, CheckCircle, Trash2, ExternalLink } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { Button } from '../components/v2/primitives/Button'
import { Input } from '../components/v2/primitives/Input'
import { Pill } from '../components/v2/primitives/Pill'
import { Card } from '../components/v2/primitives/Card'
import { PremiumInterestModal } from '../components/v2/premium/PremiumInterestModal'
// v2.2.1 — RuleProposalCard ya no se usa: el flujo legacy de /api/rules
// (DEFAULT_RULES hardcoded) queda obsoleto frente al editor real de
// /api/configuration que sí persiste.
import { ProposalsPanel } from '../components/v2/consensus/ProposalsPanel'
import { RealRulesSection } from '../components/v2/consensus/RealRulesSection'
import { CoupleHealthCard } from '../components/v2/couple/CoupleHealthCard'
import { AvatarPicker } from '../components/v2/primitives/AvatarPicker'
import { AlertDialog } from '../components/v2/primitives/AlertDialog'
import { MyMoodWeek } from '../components/v2/profile/MyMoodWeek'
import { DeleteAccountWizard } from '../components/v2/wizards/DeleteAccountWizard'
import { LeaveCoupleWizard } from '../components/v2/wizards/LeaveCoupleWizard'
import { InstallAppCard } from '../components/v2/settings/InstallAppCard'
import { useConsent } from '../hooks/useConsent'
import { MOODS } from '../data/moods'
import { getMoodHistory } from '../services/apiClient'

type SectionSlug =
  | 'profile'
  | 'couple'
  | 'children'
  | 'notifications'
  | 'premium'
  | 'rules'
  | 'consensus'
  | 'language-theme'
  | 'privacy'

const SECTIONS: Array<{
  slug: SectionSlug
  emoji: string
  title: string
  subtitle: (ctx: { partnerName?: string; userName?: string; avatarEmoji?: string; childrenCount?: number }) => string
}> = [
  { slug: 'profile',         emoji: '👤', title: 'Perfil y avatar',      subtitle: (c) => `${c.userName ?? 'Tú'} · ${c.avatarEmoji ?? '🐼'}` },
  { slug: 'couple',          emoji: '💕', title: 'Pareja',                subtitle: (c) => c.partnerName ? `${c.partnerName} · vinculado` : 'Sin pareja' },
  { slug: 'children',        emoji: '👶', title: 'Hijos',                 subtitle: (c) => c.childrenCount ? `${c.childrenCount} ${c.childrenCount === 1 ? 'hijo/a' : 'hijos'} registrados` : 'Sin registrar · afecta al cálculo' },
  { slug: 'notifications',   emoji: '🔔', title: 'Notificaciones',        subtitle: () => 'Push, email, horarios' },
  { slug: 'premium',         emoji: '👑', title: 'Suscripción Premium',   subtitle: () => 'Gratis' },
  { slug: 'rules',           emoji: '📜', title: 'Reglas de puntos',      subtitle: () => 'Multiplicadores' },
  { slug: 'consensus',       emoji: '🤝', title: 'Propuestas pendientes',  subtitle: () => 'Cambios de configuración consensuados' },
  { slug: 'language-theme',  emoji: '🎨', title: 'Idioma y tema',         subtitle: () => 'Español · Oscuro' },
  { slug: 'privacy',         emoji: '🔒', title: 'Privacidad y datos',    subtitle: () => 'Exportar, eliminar' },
]

// -----------------------------------------------------------------------------
// Shared UI helpers
// -----------------------------------------------------------------------------

function SectionHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <button
        onClick={onBack}
        className="p-2 -ml-2 rounded-md hover:bg-surface-muted text-text-primary"
        aria-label="Volver"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h1 className="text-lg font-extrabold text-text-primary">{title}</h1>
    </div>
  )
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${checked ? 'bg-brand-amber' : 'bg-surface-muted border border-brd-subtle'}`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  )
}

function Banner({ type, message }: { type: 'success' | 'error'; message: string }) {
  const tone = type === 'success'
    ? 'bg-success/10 border-success/30 text-success'
    : 'bg-danger/10 border-danger/30 text-danger'
  return (
    <div className={`rounded-md border px-3 py-2 text-xs font-semibold ${tone} mb-3`}>
      {message}
    </div>
  )
}

function DoubleConfirmModal({
  open, title, firstMessage, secondMessage, confirmLabel, onCancel, onConfirm, isLoading,
}: {
  open: boolean
  title: string
  firstMessage: string
  secondMessage: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  isLoading?: boolean
}) {
  const [step, setStep] = useState<1 | 2>(1)

  useEffect(() => { if (open) setStep(1) }, [open])

  if (!open) return null
  const msg = step === 1 ? firstMessage : secondMessage
  return (
    <>
      <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[80]" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="double-confirm-title"
        className="fixed left-0 right-0 bottom-0 z-[81] max-w-[500px] mx-auto bg-surface-elevated border-t border-brd-purple rounded-t-xl p-4 pb-6"
      >
        <h3 id="double-confirm-title" className="text-base font-extrabold text-text-primary mb-2">{title}</h3>
        <p className="text-sm text-text-secondary mb-4">{msg}</p>
        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={onCancel}>Cancelar</Button>
          <Button
            variant="danger"
            fullWidth
            disabled={isLoading}
            onClick={() => {
              if (step === 1) setStep(2)
              else onConfirm()
            }}
          >
            {isLoading ? 'Procesando…' : step === 1 ? 'Continuar' : confirmLabel}
          </Button>
        </div>
      </div>
    </>
  )
}

// -----------------------------------------------------------------------------
// Section: Index
// -----------------------------------------------------------------------------

function SettingsIndex() {
  const nav = useNavigate()
  const { user, couple } = useAppStore()
  const partner = couple?.users?.find((u) => u.id !== user?.id)
  // Pull the children count so the Hijos row shows "2 hijos registrados" vs the
  // empty-state hint that flags the missing data (affects points calc).
  const { data: children } = useQuery<any[]>({
    queryKey: ['settings-children-count'],
    queryFn: () => apiClient.family.getChildren(),
  })
  const ctx = {
    partnerName: partner?.name,
    userName: user?.name,
    avatarEmoji: user?.avatarEmoji ?? '🐼',
    childrenCount: Array.isArray(children) ? children.length : 0,
  }

  const avatarEmoji = user?.avatarEmoji ?? '🐼'
  const avatarColor = user?.avatarColor ?? '#7c3aed'

  return (
    <div className="space-y-4">
      {/* Mini header with avatar */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-card border border-brd-subtle">
        <div
          className="flex-shrink-0 rounded-full flex items-center justify-center"
          style={{
            width: 72,
            height: 72,
            background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)`,
            fontSize: 36,
          }}
        >
          {avatarEmoji}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-extrabold text-text-primary truncate">{user?.name ?? 'Usuario'}</p>
          {user?.email && (
            <p className="text-xs text-text-secondary truncate">{user.email}</p>
          )}
        </div>
      </div>

      {/* E.2 Fase 2 — instalar PWA (solo si no está instalada ya) */}
      <InstallAppCard />

      {/* 7 Section rows */}
      <div className="space-y-2">
        {SECTIONS.map((s) => (
          <button
            key={s.slug}
            onClick={() => nav(`/settings/${s.slug}`)}
            className="w-full flex items-center gap-3 p-3 rounded-md bg-surface-card border border-brd-subtle hover:bg-surface-elevated text-left transition-colors"
          >
            <span className="text-[32px] leading-none flex-shrink-0">{s.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary">{s.title}</p>
              <p className="text-xs text-text-secondary truncate">{s.subtitle(ctx)}</p>
            </div>
            {s.slug === 'premium' && <Pill tone="amber">Upgrade</Pill>}
            <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Section: Profile
// -----------------------------------------------------------------------------

function ProfileSection({ onBack }: { onBack: () => void }) {
  const { user } = useAppStore()
  const [emoji, setEmoji] = useState(user?.avatarEmoji ?? '🐼')
  const [color, setColor] = useState(user?.avatarColor ?? '#7c3aed')
  const [mood, setMood]   = useState<string>(user?.currentMood ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function save() {
    setSaving(true); setError(null); setSuccess(null)
    try {
      await apiClient.profile.updateMe({
        avatarEmoji: emoji,
        avatarColor: color,
        ...(mood ? { currentMood: mood } : {}),
      })
      useAppStore.setState((s: any) => ({
        user: s.user ? { ...s.user, avatarEmoji: emoji, avatarColor: color, currentMood: mood || null } : s.user,
      }))
      setSuccess('Perfil actualizado')
      setTimeout(() => setSuccess(null), 2500)
    } catch (err: any) {
      setError(err?.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <SectionHeader title="Perfil y avatar" onBack={onBack} />
      {error   && <Banner type="error"   message={error} />}
      {success && <Banner type="success" message={success} />}

      <Card className="space-y-5">
        <div>
          <label className="text-xs font-semibold text-text-secondary block mb-1.5">Nombre</label>
          <Input value={user?.name ?? ''} disabled />
          <p className="text-[11px] italic text-text-tertiary mt-1">Para cambiar tu nombre, contacta soporte</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-text-secondary block mb-2">Avatar</label>
          <AvatarPicker
            emoji={emoji}
            color={color}
            onChange={({ emoji: e, color: c }) => { setEmoji(e); setColor(c) }}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-text-secondary block mb-1.5">Estado de ánimo</label>
          <select
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-purple"
          >
            <option value="">Sin estado</option>
            {MOODS.map((m) => (
              <option key={m.key} value={m.key}>{m.emoji} {m.label}</option>
            ))}
          </select>
        </div>

        <Button variant="primary" fullWidth onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </Card>

      <MyMoodWeekPanel />
    </div>
  )
}

// v1.6 — Panel "Mi mood — últimos 7 días" en perfil. Solo el del usuario.
function MyMoodWeekPanel() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid'
  const { data, isLoading } = useQuery({
    queryKey: ['mood-history', 7, tz],
    queryFn: () => getMoodHistory(7, tz),
    staleTime: 60_000,
  })
  return (
    <div className="mt-4">
      <MyMoodWeek history={data?.history ?? []} loading={isLoading} />
    </div>
  )
}

// -----------------------------------------------------------------------------
// Section: Couple
// -----------------------------------------------------------------------------

function CoupleSection({ onBack }: { onBack: () => void }) {
  const nav = useNavigate()
  const { user, couple, loadUserData } = useAppStore()
  const partner = couple?.users?.find((u) => u.id !== user?.id)

  const [error, setError] = useState<string | null>(null)
  const [unlinkOpen, setUnlinkOpen] = useState(false)

  // join-code share (v1.4): tracks lo que acabamos de copiar al clipboard
  // para dar feedback visual. "code" o "link" según el botón usado.
  const [justCopied, setJustCopied] = useState<'code' | 'link' | null>(null)
  const joinCode = couple?.joinCode ?? null
  const joinLink = joinCode
    ? `${window.location.origin}/signup?code=${encodeURIComponent(joinCode)}`
    : null

  async function copyText(text: string, which: 'code' | 'link') {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setJustCopied(which)
      setTimeout(() => setJustCopied(null), 2000)
    } catch {
      setError('No se pudo copiar automáticamente. Selecciona el texto y cópialo.')
    }
  }

  return (
    <div>
      <SectionHeader title="Pareja" onBack={onBack} />
      {error && <Banner type="error" message={error} />}

      {partner && (
        <div className="mb-4">
          <CoupleHealthCard
            userId={user?.id}
            partnerId={partner.id}
            joinCode={joinCode}
          />
        </div>
      )}

      {partner ? (
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
              style={{
                background: `linear-gradient(135deg, ${partner.avatarColor ?? '#7c3aed'}, ${partner.avatarColor ?? '#7c3aed'}dd)`,
              }}
            >
              {partner.avatarEmoji ?? '💕'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-extrabold text-text-primary">{partner.name}</p>
              <p className="text-xs text-text-secondary truncate">{partner.email}</p>
              <Pill tone="success" className="mt-1">💕 Vinculado</Pill>
            </div>
          </div>

          <div className="pt-2 border-t border-brd-subtle">
            <p className="text-xs text-text-tertiary mb-2">Ya tienes una pareja vinculada. Si quieres invitar a otra persona, primero desvincula.</p>
            <Button variant="ghost" fullWidth disabled>Invitar a otra persona</Button>
          </div>

          <div className="pt-2">
            <p className="text-xs font-semibold text-text-secondary mb-2">Zona de peligro</p>
            <Button variant="danger" fullWidth onClick={() => setUnlinkOpen(true)}>
              Salir de la pareja
            </Button>
            <p className="text-[11px] text-text-tertiary mt-1">
              Ambos quedaréis sin pareja activa. Conservaréis el histórico read-only.
            </p>
          </div>

          {/* v1.6.1 — LeaveCoupleWizard real, conectado a /api/couple/leave */}
          <LeaveCoupleWizard
            isOpen={unlinkOpen}
            partnerName={partner.name}
            onClose={() => setUnlinkOpen(false)}
            onLeft={async () => {
              setUnlinkOpen(false)
              // v2.6.1 audit 05 10.2 — antes hacíamos `window.location.href`
              // (full reload de la app) tras dejar la pareja. Eso descarta
              // el cache de React Query y el estado Zustand. Ahora
              // refrescamos el store y navegamos sin reload.
              try {
                await loadUserData(true)
              } catch {}
              nav('/dashboard')
            }}
          />
        </Card>
      ) : (
        <Card className="space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">💔</div>
            <p className="text-sm font-bold text-text-primary">Sin pareja</p>
            <p className="text-xs text-text-secondary">Invita a alguien para empezar a usar Matripuntos juntos.</p>
          </div>

          {/* v1.4 · Join code — única vía de invitación. Comparte el código o
              el enlace y quien lo use al registrarse entra directo a tu hogar. */}
          {joinCode && joinLink ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-text-primary">🔑 Código de pareja</p>
              <p className="text-[11px] text-text-secondary">
                Comparte este código por voz o mensaje. Quien lo use al registrarse entra directo a tu hogar.
              </p>
              <div className="flex items-center gap-2 rounded-md bg-surface-elevated border border-brd-subtle px-3 py-2">
                <span className="font-mono tracking-[0.3em] text-base font-bold text-text-primary flex-1">
                  {joinCode}
                </span>
                <button
                  onClick={() => copyText(joinCode, 'code')}
                  className="text-text-primary hover:text-brand-purple"
                  aria-label="Copiar código"
                >
                  {justCopied === 'code' ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <Button variant="ghost" fullWidth onClick={() => copyText(joinLink, 'link')}>
                <span className="flex items-center justify-center gap-2">
                  {justCopied === 'link' ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  {justCopied === 'link' ? 'Enlace copiado' : 'Copiar enlace completo'}
                </span>
              </Button>
            </div>
          ) : (
            <div className="rounded-md bg-brand-amber/10 border border-brand-amber/30 p-3 text-[11px] text-text-secondary">
              ⚠️ Aún no hay código de pareja. Vuelve a iniciar sesión para generarlo.
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Section: Notifications
// -----------------------------------------------------------------------------

// v2.2.4 — los flags localStorage PREFS_EMAIL_KEY/PREFS_QUIET_KEY de la versión
// previa quedan obsoletos: ahora todo persiste en backend via
// /api/profile/notification-preferences.

// v2.2.4 — Sección rediseñada según Claude Design canvas 10.
// 3 tiers (critical / digest / off) por categoría + quiet hours + digest hour.
// Persiste en backend via /api/profile/notification-preferences.

const NOTIF_CATEGORIES: Array<{ key: string; emoji: string; name: string; sub: string }> = [
  { key: 'request',      emoji: '📩', name: 'Peticiones recibidas',     sub: 'Cuando tu pareja te pide algo' },
  { key: 'negotiation',  emoji: '🤝', name: 'Negociación',              sub: 'Contraofertas que necesitan tu OK' },
  { key: 'calendar',     emoji: '📅', name: 'Calendario · 30 min antes', sub: 'Citas comunes' },
  { key: 'ruleProposal', emoji: '📜', name: 'Propuestas de reglas',     sub: 'Cambios de configuración a aceptar' },
  { key: 'achievements', emoji: '🏆', name: 'Logros y niveles',         sub: 'Solo en el resumen diario' },
  { key: 'streak',       emoji: '🔥', name: 'Rachas y "te falta poco"', sub: 'Off por defecto · gamification leve' },
]

const TIERS: Array<{ key: 'critical' | 'digest' | 'off'; label: string; tone: string }> = [
  { key: 'critical', label: 'Al momento',   tone: 'bg-success/15 text-success' },
  { key: 'digest',   label: 'Solo resumen', tone: 'bg-brand-purple/15 text-brand-purple' },
  { key: 'off',      label: 'No avisar',    tone: 'bg-surface-muted text-text-tertiary' },
]

function NotificationsSection({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery<{ preferences: any }>({
    queryKey: ['notification-preferences'],
    queryFn: () => apiClient.request('/profile/notification-preferences'),
  })
  const [saved, setSaved] = useState(false)

  const update = async (patch: any) => {
    const next = {
      ...data?.preferences,
      ...patch,
      categories: { ...(data?.preferences?.categories ?? {}), ...(patch.categories ?? {}) },
      quietHours: { ...(data?.preferences?.quietHours ?? {}), ...(patch.quietHours ?? {}) },
    }
    await apiClient.request('/profile/notification-preferences', {
      method: 'PUT',
      body: JSON.stringify(next),
    })
    queryClient.setQueryData(['notification-preferences'], { preferences: next })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  if (isLoading || !data) {
    return (
      <div>
        <SectionHeader title="Notificaciones" onBack={onBack} />
        <p className="text-text-tertiary text-sm">Cargando…</p>
      </div>
    )
  }

  const prefs = data.preferences

  return (
    <div className="space-y-4">
      <SectionHeader title="Notificaciones" onBack={onBack} />

      <Card className="bg-brand-purple/5 border-brand-purple/20">
        <p className="text-[11px] text-text-secondary leading-relaxed">
          Filosofía: <strong className="text-text-primary">3 tiers</strong>. <em>Al momento</em> llega siempre (incluso en silencio). <em>Solo resumen</em> se acumula en una notif diaria. <em>No avisar</em> nunca llega.
        </p>
      </Card>

      {/* Resumen diario */}
      <div>
        <h2 className="text-[10px] uppercase tracking-wide text-text-tertiary font-bold mb-2">Resumen diario</h2>
        <div
          className="rounded-xl p-3.5"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.08))',
            border: '1px solid rgba(99,102,241,0.35)',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base">📊</span>
            <p className="text-sm font-bold text-text-primary flex-1 m-0">Una sola noti al día</p>
            <input
              type="time"
              value={prefs.digestHour ?? '20:30'}
              onChange={(e) => update({ digestHour: e.target.value })}
              className="text-xs bg-surface-elevated border border-brd-subtle rounded px-2 py-1 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
            />
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Tú + tu pareja, totales del día, nivel y siguiente meta. Editable hora.
          </p>
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-xs text-text-tertiary">Activado</span>
            <Toggle
              checked={!!prefs.digestEnabled}
              onChange={(v) => update({ digestEnabled: v })}
            />
          </div>
        </div>
      </div>

      {/* Quiet hours */}
      <div>
        <h2 className="text-[10px] uppercase tracking-wide text-text-tertiary font-bold mb-2">Modo silencio</h2>
        <div
          className="rounded-xl p-3.5"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(168,85,247,0.06))',
            border: '1px solid rgba(99,102,241,0.25)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🌙</span>
            <p className="text-sm font-bold text-text-primary flex-1 m-0">Horas de silencio</p>
          </div>
          <p className="text-[11px] text-text-secondary mb-2">
            Solo las críticas pasan. El resto se acumula en el resumen.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-text-tertiary mb-1">Desde</label>
              <input
                type="time"
                value={prefs.quietHours?.start ?? '22:00'}
                onChange={(e) => update({ quietHours: { start: e.target.value } })}
                className="w-full bg-surface-elevated border border-brd-subtle rounded px-2 py-1.5 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-tertiary mb-1">Hasta</label>
              <input
                type="time"
                value={prefs.quietHours?.end ?? '09:00'}
                onChange={(e) => update({ quietHours: { end: e.target.value } })}
                className="w-full bg-surface-elevated border border-brd-subtle rounded px-2 py-1.5 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Categorías */}
      <div>
        <h2 className="text-[10px] uppercase tracking-wide text-text-tertiary font-bold mb-2">Categorías</h2>
        <div className="space-y-1.5">
          {NOTIF_CATEGORIES.map((c) => {
            const tier = (prefs.categories?.[c.key] as 'critical' | 'digest' | 'off') ?? 'off'
            return (
              <div
                key={c.key}
                className="flex items-center gap-2.5 rounded-xl p-2.5 bg-surface-card border border-brd-subtle"
              >
                <span className="text-base">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text-primary leading-tight">{c.name}</p>
                  <p className="text-[10px] text-text-tertiary leading-tight">{c.sub}</p>
                </div>
                <select
                  value={tier}
                  onChange={(e) => update({ categories: { [c.key]: e.target.value } })}
                  className="text-[10px] bg-surface-elevated border border-brd-subtle rounded px-2 py-1 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple flex-shrink-0"
                >
                  {TIERS.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      </div>

      {saved && (
        <p className="text-[11px] text-success text-center">✓ Guardado</p>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Section: Premium
// -----------------------------------------------------------------------------

function PremiumSection({ onBack }: { onBack: () => void }) {
  const [modalOpen, setModalOpen] = useState(false)
  return (
    <div>
      <SectionHeader title="Suscripción Premium" onBack={onBack} />
      <Card className="text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-full bg-grad-cta flex items-center justify-center text-4xl">👑</div>
        <div>
          <p className="text-sm text-text-secondary">Tu plan actual</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <p className="text-lg font-extrabold text-text-primary">Gratis</p>
            <Pill tone="amber">Upgrade</Pill>
          </div>
        </div>
        <ul className="text-left text-xs text-text-primary space-y-1.5 bg-surface-muted border border-brd-subtle rounded-md p-3">
          <li>✅ Rondas de negociación ilimitadas</li>
          <li>✅ Analítica avanzada completa</li>
          <li>✅ Histórico sin límite</li>
          <li>✅ Badge 👑 en tu perfil</li>
        </ul>
        <Button variant="primary" fullWidth onClick={() => setModalOpen(true)}>
          Avísame cuando salga
        </Button>
      </Card>

      <PremiumInterestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        source="settings_premium_cta"
      />
    </div>
  )
}

// -----------------------------------------------------------------------------
// Section: Rules
// -----------------------------------------------------------------------------

function ConsensusSection({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <SectionHeader title="Propuestas pendientes" onBack={onBack} />
      <Card className="mb-4">
        <p className="text-xs text-text-secondary leading-relaxed">
          Cambios de configuración propuestos por uno de los dos. Solo se aplican cuando el otro acepta.
        </p>
      </Card>
      <ProposalsPanel />
    </div>
  )
}

function RulesSection({ onBack }: { onBack: () => void }) {
  // v2.2.1 — sustituye el listado hardcoded de DEFAULT_RULES (banner WARN
  // "estado provisional") por el editor real de Configuration.tasksConfig +
  // multipliersConfig. Cada cambio pasa por consenso y SE APLICA al backend.
  return (
    <div>
      <SectionHeader title="Reglas de puntos" onBack={onBack} />
      <RealRulesSection />
    </div>
  )
}

// -----------------------------------------------------------------------------
// Section: Language & Theme
// -----------------------------------------------------------------------------

function LanguageThemeSection({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <SectionHeader title="Idioma y tema" onBack={onBack} />
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary">Idioma</p>
            <p className="text-xs text-text-secondary">Español</p>
          </div>
          <Pill tone="indigo">Próximamente</Pill>
        </div>
        <div className="h-px bg-brd-subtle" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary">Tema</p>
            <p className="text-xs text-text-secondary">Oscuro (único tema en v1.4)</p>
          </div>
          <Pill tone="indigo">Próximamente</Pill>
        </div>
      </Card>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Section: Privacy
// -----------------------------------------------------------------------------

function PrivacySection({ onBack }: { onBack: () => void }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const { logout } = useAppStore()
  const navigate = useNavigate()
  const { consent, setConsent } = useConsent()

  return (
    <div>
      <SectionHeader title="Privacidad y datos" onBack={onBack} />

      <Card className="space-y-4">
        {/* v1.6.1 — Toggle analítica */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-primary">Análisis de uso anónimo</p>
            <p className="text-[11px] text-text-tertiary">
              Nos ayuda a mejorar la app. Puedes cambiarlo cuando quieras.
            </p>
          </div>
          <input
            type="checkbox"
            checked={consent?.analytics ?? false}
            onChange={(e) => setConsent({ analytics: e.target.checked })}
            data-testid="toggle-analytics-settings"
            className="w-5 h-5"
          />
        </div>

        <div className="h-px bg-brd-subtle" />

        {/* v1.6.2 — Export portability (GDPR Art. 20) */}
        <Button
          variant="ghost"
          fullWidth
          data-testid="btn-export-data"
          onClick={async () => {
            try {
              const token = localStorage.getItem('auth_token')
              const res = await fetch(
                (import.meta.env.VITE_API_BASE ?? '') + '/api/account/export',
                { headers: { Authorization: `Bearer ${token}` } },
              )
              if (!res.ok) throw new Error('Error en export')
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `matripuntos-export-${Date.now()}.json`
              a.click()
              URL.revokeObjectURL(url)
            } catch (err: any) {
              setExportError(err?.message ?? 'No pudimos exportar tus datos')
            }
          }}
        >
          <span className="flex items-center justify-center gap-2">
            📥 Descargar mis datos (JSON)
          </span>
        </Button>

        <div className="h-px bg-brd-subtle" />

        {/* v1.6.1 — Eliminar cuenta (wizard real) */}
        <Button
          variant="danger"
          fullWidth
          onClick={() => setDeleteOpen(true)}
        >
          <span className="flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" />
            Eliminar mi cuenta
          </span>
        </Button>

        <div className="h-px bg-brd-subtle" />

        <div className="flex flex-col gap-1.5 items-center">
          <a
            href="/privacy" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-brand-purple hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Política de privacidad
          </a>
          <a
            href="/terms" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-brand-purple hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Términos de uso
          </a>
          <a
            href="/cookies" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-brand-purple hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Política de cookies
          </a>
        </div>
      </Card>

      <DeleteAccountWizard
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          setDeleteOpen(false)
          logout()
          navigate('/login')
        }}
      />

      <AlertDialog
        open={!!exportError}
        title="No se pudo exportar"
        message={exportError ?? ''}
        variant="danger"
        onClose={() => setExportError(null)}
      />
    </div>
  )
}


// -----------------------------------------------------------------------------
// Section: Children (Hijos)
//
// The Points Calculator uses number of children + special needs as a direct
// multiplier, so keeping this up to date is load-bearing for correct scoring.
// Every add/edit/delete notifies the partner on the backend.
// -----------------------------------------------------------------------------

interface ChildRecord {
  id: string
  name: string
  dateOfBirth: string
  livesWithUser1?: boolean
  livesWithUser2?: boolean
  hasSpecialNeeds?: boolean
}

function ageFromDate(dobIso: string): string {
  if (!dobIso) return ''
  const dob = new Date(dobIso)
  if (isNaN(dob.getTime())) return ''
  const now = new Date()
  let years = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years -= 1
  if (years < 0) return ''
  if (years === 0) {
    const months = Math.max(0, (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth()))
    return `${months} ${months === 1 ? 'mes' : 'meses'}`
  }
  return `${years} ${years === 1 ? 'año' : 'años'}`
}

function ChildrenSection({ onBack }: { onBack: () => void }) {
  const [editing, setEditing] = useState<ChildRecord | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ChildRecord | null>(null)
  const [loading, setLoading] = useState(false)

  const { data: children, refetch } = useQuery<ChildRecord[]>({
    queryKey: ['settings-children'],
    queryFn: () => apiClient.family.getChildren(),
  })

  function flash(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 2500)
  }

  async function handleSave(payload: Partial<ChildRecord>) {
    setLoading(true); setError(null)
    try {
      if (editing) {
        await apiClient.family.updateChild(editing.id, payload)
        flash('Hijo/a actualizado. Se notificó a tu pareja.')
      } else {
        await apiClient.family.addChild(payload)
        flash('Hijo/a añadido. Se notificó a tu pareja.')
      }
      setFormOpen(false)
      setEditing(null)
      await refetch()
    } catch (err: any) {
      setError(err?.message ?? 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setLoading(true); setError(null)
    try {
      await apiClient.family.deleteChild(confirmDelete.id)
      flash('Hijo/a eliminado. Se notificó a tu pareja.')
      setConfirmDelete(null)
      await refetch()
    } catch (err: any) {
      setError(err?.message ?? 'Error al eliminar')
    } finally {
      setLoading(false)
    }
  }

  const rows = children ?? []

  return (
    <div>
      <SectionHeader title="Hijos" onBack={onBack} />
      {error   && <Banner type="error"   message={error} />}
      {success && <Banner type="success" message={success} />}

      <Card className="mb-3 space-y-2">
        <p className="text-xs text-text-secondary leading-relaxed">
          Registrar a tus hijos es <strong className="text-text-primary">importante para el cálculo de puntos</strong>: cuantos más hijos a cargo durante una ausencia, mayor es el esfuerzo que asume la persona que se queda (x1.4 con 1, x1.8 con 2, x2.2 con 3+).
        </p>
        <p className="text-[11px] text-text-tertiary">
          Cualquier cambio se notifica automáticamente a tu pareja.
        </p>
      </Card>

      <div className="space-y-2 mb-3">
        {rows.length === 0 && (
          <Card className="text-center text-text-secondary text-xs py-6">
            👶 Todavía no hay hijos registrados.
          </Card>
        )}
        {rows.map((c) => (
          <Card key={c.id}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">👶</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{c.name}</p>
                <p className="text-[11px] text-text-secondary">
                  {ageFromDate(c.dateOfBirth)}
                  {c.hasSpecialNeeds ? ' · necesidades especiales' : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditing(c); setFormOpen(true) }}
                  className="text-[11px] font-semibold text-brand-purple px-2 py-1 rounded-md hover:bg-brand-purple/10"
                >
                  Editar
                </button>
                <button
                  onClick={() => setConfirmDelete(c)}
                  className="text-[11px] font-semibold text-danger px-2 py-1 rounded-md hover:bg-danger/10"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button
        fullWidth
        onClick={() => { setEditing(null); setFormOpen(true) }}
      >
        + Añadir hijo/a
      </Button>

      {formOpen && (
        <ChildFormModal
          initial={editing}
          loading={loading}
          onCancel={() => { setFormOpen(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <DoubleConfirmModal
          open={true}
          title={`Eliminar a ${confirmDelete.name}`}
          firstMessage="¿Seguro que quieres eliminar a este hijo/a?"
          secondMessage="Se notificará a tu pareja y los puntos futuros se calcularán sin esta persona."
          confirmLabel="Eliminar definitivamente"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
          isLoading={loading}
        />
      )}
    </div>
  )
}

function ChildFormModal({
  initial, loading, onCancel, onSave,
}: {
  initial: ChildRecord | null
  loading: boolean
  onCancel: () => void
  onSave: (payload: Partial<ChildRecord>) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [dob, setDob] = useState(initial?.dateOfBirth ? initial.dateOfBirth.slice(0, 10) : '')
  const [special, setSpecial] = useState<boolean>(Boolean(initial?.hasSpecialNeeds))
  const [err, setErr] = useState<string | null>(null)

  function submit() {
    if (!name.trim()) return setErr('El nombre es obligatorio')
    if (!dob) return setErr('La fecha de nacimiento es obligatoria')
    setErr(null)
    onSave({
      name: name.trim(),
      dateOfBirth: dob,
      hasSpecialNeeds: special,
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[80]" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="child-form-title"
        className="fixed left-0 right-0 bottom-0 z-[81] max-w-[500px] mx-auto bg-surface-elevated border-t border-brd-purple rounded-t-xl p-4 pb-6"
      >
        <h3 id="child-form-title" className="text-base font-extrabold text-text-primary mb-3">
          {initial ? 'Editar hijo/a' : 'Añadir hijo/a'}
        </h3>
        {err && <Banner type="error" message={err} />}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">Nombre</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Lucía" />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">Fecha de nacimiento</label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <label className="flex items-center gap-3 text-sm text-text-primary">
            <Toggle checked={special} onChange={setSpecial} />
            <span>Tiene necesidades especiales <span className="text-[11px] text-text-tertiary">(añade +0.3 al multiplicador)</span></span>
          </label>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="ghost" fullWidth onClick={onCancel}>Cancelar</Button>
          <Button fullWidth disabled={loading} onClick={submit}>
            {loading ? 'Guardando…' : (initial ? 'Guardar cambios' : 'Añadir')}
          </Button>
        </div>
      </div>
    </>
  )
}

// -----------------------------------------------------------------------------
// Orchestrator
// -----------------------------------------------------------------------------

export default function Settings() {
  const { section } = useParams<{ section?: string }>()
  const nav = useNavigate()
  const goIndex = () => nav('/settings')

  let content: JSX.Element
  switch (section as SectionSlug | undefined) {
    case 'profile':         content = <ProfileSection         onBack={goIndex} />; break
    case 'couple':          content = <CoupleSection          onBack={goIndex} />; break
    case 'children':        content = <ChildrenSection        onBack={goIndex} />; break
    case 'notifications':   content = <NotificationsSection   onBack={goIndex} />; break
    case 'premium':         content = <PremiumSection         onBack={goIndex} />; break
    case 'rules':           content = <RulesSection           onBack={goIndex} />; break
    case 'consensus':       content = <ConsensusSection       onBack={goIndex} />; break
    case 'language-theme':  content = <LanguageThemeSection   onBack={goIndex} />; break
    case 'privacy':         content = <PrivacySection         onBack={goIndex} />; break
    default:                content = <SettingsIndex />
  }

  return (
    <div className="max-w-[500px] mx-auto px-4 py-4 pb-24 text-text-primary">
      {content}
    </div>
  )
}
