import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Copy, CheckCircle, Loader, Download, Trash2, ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { Button } from '../components/v2/primitives/Button'
import { Input } from '../components/v2/primitives/Input'
import { Pill } from '../components/v2/primitives/Pill'
import { Card } from '../components/v2/primitives/Card'
import { PremiumInterestModal } from '../components/v2/premium/PremiumInterestModal'
import { RuleProposalCard } from '../components/RuleProposalCard'
import { CoupleHealthCard } from '../components/v2/couple/CoupleHealthCard'
import { AvatarPicker } from '../components/v2/primitives/AvatarPicker'
import { MyMoodWeek } from '../components/v2/profile/MyMoodWeek'
import { MOODS } from '../data/moods'
import { getMoodHistory } from '../services/apiClient'

type SectionSlug =
  | 'profile'
  | 'couple'
  | 'children'
  | 'notifications'
  | 'premium'
  | 'rules'
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
      <div className="fixed left-0 right-0 bottom-0 z-[81] max-w-[500px] mx-auto bg-surface-elevated border-t border-brd-purple rounded-t-xl p-4 pb-6">
        <h3 className="text-base font-extrabold text-text-primary mb-2">{title}</h3>
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
  const { user, couple } = useAppStore()
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
              Desvincular pareja
            </Button>
          </div>

          <DoubleConfirmModal
            open={unlinkOpen}
            title="Desvincular pareja"
            firstMessage={`¿Seguro que quieres desvincularte de ${partner.name}?`}
            secondMessage="Esta acción no se puede deshacer. Perderás el acceso al historial compartido."
            confirmLabel="Confirmar desvinculación"
            onCancel={() => setUnlinkOpen(false)}
            onConfirm={() => {
              // No backend endpoint yet — show help text via error banner
              setUnlinkOpen(false)
              setError('Disponible en v1.5 — contacta soporte para desvincular ahora')
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

const PREFS_EMAIL_KEY = 'matripuntos.prefs.email'
const PREFS_QUIET_KEY = 'matripuntos.prefs.quietHours'

function NotificationsSection({ onBack }: { onBack: () => void }) {
  const [emailOn, setEmailOn] = useState(() => {
    const raw = localStorage.getItem(PREFS_EMAIL_KEY)
    return raw === null ? true : raw === 'true'
  })
  const [quietFrom, setQuietFrom] = useState('22:00')
  const [quietTo, setQuietTo] = useState('08:00')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_QUIET_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.from) setQuietFrom(parsed.from)
        if (parsed.to)   setQuietTo(parsed.to)
      }
    } catch { /* ignore */ }
  }, [])

  function saveEmail(v: boolean) {
    setEmailOn(v)
    localStorage.setItem(PREFS_EMAIL_KEY, String(v))
  }

  function saveQuiet(from: string, to: string) {
    setQuietFrom(from); setQuietTo(to)
    localStorage.setItem(PREFS_QUIET_KEY, JSON.stringify({ from, to }))
  }

  return (
    <div>
      <SectionHeader title="Notificaciones" onBack={onBack} />
      <Card className="space-y-4">
        {/* Push — disabled v1.4 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary">Notificaciones push</p>
            <p className="text-[11px] text-text-tertiary">Disponible en v2.1</p>
          </div>
          <Toggle checked={false} onChange={() => {}} disabled />
        </div>

        <div className="h-px bg-brd-subtle" />

        {/* Email */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary">Notificaciones por email</p>
            <p className="text-[11px] text-text-secondary">Resúmenes semanales y alertas importantes</p>
          </div>
          <Toggle checked={emailOn} onChange={saveEmail} />
        </div>

        <div className="h-px bg-brd-subtle" />

        {/* Quiet hours */}
        <div>
          <p className="text-sm font-bold text-text-primary mb-1">Horas de silencio</p>
          <p className="text-[11px] text-text-secondary mb-3">No recibirás notificaciones en este rango</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-text-secondary block mb-1">Desde</label>
              <input
                type="time"
                value={quietFrom}
                onChange={(e) => saveQuiet(e.target.value, quietTo)}
                className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-purple"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-text-secondary block mb-1">Hasta</label>
              <input
                type="time"
                value={quietTo}
                onChange={(e) => saveQuiet(quietFrom, e.target.value)}
                className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-purple"
              />
            </div>
          </div>
        </div>
      </Card>
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

function RulesSection({ onBack }: { onBack: () => void }) {
  const { user } = useAppStore()
  const { data: rulesData, isLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: () => apiClient.rules.getAll(),
  })

  const rules = rulesData?.rules ?? []
  const pendingProposals = (rulesData?.proposals ?? []).filter((p: any) => p.status === 'pending')

  return (
    <div>
      <SectionHeader title="Reglas de puntos" onBack={onBack} />

      <Card className="mb-4">
        <p className="text-xs text-text-secondary leading-relaxed">
          Las reglas del sistema de puntos acordadas por la pareja. Cualquiera puede proponer un cambio — el otro debe aprobar.
        </p>
      </Card>

      {isLoading && (
        <div className="flex items-center gap-2 text-text-tertiary text-xs py-4">
          <Loader className="w-4 h-4 animate-spin" /> Cargando…
        </div>
      )}

      {!isLoading && (
        <>
          <div className="space-y-2 mb-4">
            {rules.length === 0 && (
              <Card><p className="text-xs text-text-tertiary text-center">No hay reglas acordadas aún.</p></Card>
            )}
            {rules.map((rule: any) => (
              <div
                key={rule.key}
                className="flex gap-3 items-start rounded-md p-3 bg-surface-card border border-brd-subtle"
              >
                <div className="text-lg">📌</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-text-primary">{rule.description}</div>
                  <div className="text-[11px] text-brand-amber mt-0.5">{String(rule.value ?? 'automático')}</div>
                  <Pill tone="success" className="mt-1">✓ Acordado</Pill>
                </div>
              </div>
            ))}
          </div>

          {pendingProposals.length > 0 && (
            <div className="space-y-3 mb-4">
              <p className="text-[10px] uppercase tracking-wide text-brand-amber font-bold">⏳ Propuestas pendientes</p>
              {pendingProposals.map((p: any) => (
                <RuleProposalCard key={p.id} proposal={p} currentUserId={user?.id ?? ''} />
              ))}
            </div>
          )}
        </>
      )}
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
  const [error, setError] = useState<string | null>(null)

  // Export/delete endpoints do not exist in backend yet — buttons are disabled.
  const exportAvailable = false
  const deleteAvailable = false

  return (
    <div>
      <SectionHeader title="Privacidad y datos" onBack={onBack} />
      {error && <Banner type="error" message={error} />}

      <Card className="space-y-3">
        {/* Export */}
        <div>
          <Button
            variant="ghost"
            fullWidth
            disabled={!exportAvailable}
            onClick={() => { /* No-op — not available */ }}
          >
            <span className="flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Exportar mis datos (JSON)
            </span>
          </Button>
          {!exportAvailable && (
            <p className="text-[11px] text-text-tertiary mt-1 text-center">Próximamente</p>
          )}
        </div>

        {/* Delete account */}
        <div>
          <Button
            variant="danger"
            fullWidth
            disabled={!deleteAvailable}
            onClick={() => setDeleteOpen(true)}
          >
            <span className="flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" />
              Eliminar mi cuenta
            </span>
          </Button>
          {!deleteAvailable && (
            <p className="text-[11px] text-text-tertiary mt-1 text-center">Próximamente</p>
          )}
        </div>

        <div className="h-px bg-brd-subtle" />

        <a
          href="/tos"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-xs text-brand-purple hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Términos y condiciones
        </a>
      </Card>

      <DoubleConfirmModal
        open={deleteOpen}
        title="Eliminar cuenta"
        firstMessage="¿Seguro que quieres eliminar tu cuenta?"
        secondMessage="Esta acción es irreversible. Tus datos serán eliminados permanentemente."
        confirmLabel="Eliminar definitivamente"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false)
          setError('Funcionalidad próximamente — contacta soporte si necesitas eliminar tu cuenta ahora.')
        }}
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
      <div className="fixed left-0 right-0 bottom-0 z-[81] max-w-[500px] mx-auto bg-surface-elevated border-t border-brd-purple rounded-t-xl p-4 pb-6">
        <h3 className="text-base font-extrabold text-text-primary mb-3">
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
