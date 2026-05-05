// v1.6.7 Sprint 2 final S1-8 — Email transactional via Resend.
// API key opcional: si no está configurada, las funciones de envío hacen
// no-op + log en consola (mismo patrón que telemetry). En producción Render
// configura RESEND_API_KEY. Pruebas locales usan el modo sin SMTP.

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM = process.env.RESEND_FROM ?? 'Matripuntos <noreply@matripuntos.app>'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
  tags?: { name: string; value: string }[]
}

interface SendEmailResult {
  ok: boolean
  id?: string
  error?: string
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (!RESEND_API_KEY) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[email] dev mode (sin RESEND_API_KEY):', params.subject, '→', params.to)
    }
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        tags: params.tags,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>')
      console.error(`[email] resend ${res.status}:`, text.slice(0, 500))
      return { ok: false, error: `resend ${res.status}` }
    }

    const json: any = await res.json().catch(() => null)
    return { ok: true, id: json?.id }
  } catch (e: any) {
    console.error('[email] resend send failed:', e?.message)
    return { ok: false, error: e?.message ?? 'send failed' }
  }
}

// Plantillas — mantener simples y testeables. Asunto y body en español.

export function deleteAccountCodeEmail(code: string, userName: string): { subject: string; html: string; text: string } {
  return {
    subject: 'Tu código para eliminar la cuenta',
    text: `Hola ${userName},\n\nTu código de confirmación es: ${code}\n\nVigencia: 15 minutos. Si no fuiste tú, ignora este mensaje.\n\nMatripuntos`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f0a1e;color:#fff;border-radius:16px">
<h1 style="font-size:18px;margin:0 0 12px">Confirma la eliminación de tu cuenta</h1>
<p style="color:rgba(255,255,255,0.85);margin:0 0 16px">Hola ${userName},</p>
<p style="color:rgba(255,255,255,0.85);margin:0 0 16px">Tu código de confirmación:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:0.2em;text-align:center;margin:24px 0;color:#fbbf24">${code}</p>
<p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0 0 8px">Vigencia: 15 minutos.</p>
<p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0">Si no fuiste tú, ignora este mensaje. Tu cuenta seguirá activa.</p>
</div>`,
  }
}

export function inviteEmail(inviterName: string, link: string): { subject: string; html: string; text: string } {
  return {
    subject: `${inviterName} te invita a Matripuntos`,
    text: `${inviterName} ha creado una pareja en Matripuntos y quiere que te unas.\n\nÚnete con este enlace:\n${link}\n\n¿Qué es Matripuntos? Una app para parejas que gamifica las tareas del hogar y eventos del día a día.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f0a1e;color:#fff;border-radius:16px">
<h1 style="font-size:20px;margin:0 0 12px">${inviterName} te ha invitado 💕</h1>
<p style="color:rgba(255,255,255,0.85);margin:0 0 16px">${inviterName} ha creado una pareja en Matripuntos y quiere que te unas.</p>
<p style="margin:24px 0;text-align:center"><a href="${link}" style="background:#fbbf24;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Unirme a la pareja</a></p>
<p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0">¿Qué es Matripuntos? Una app para parejas que gamifica el equilibrio de las tareas del hogar.</p>
</div>`,
  }
}

// v2.4 audit 04 S1-4 — password reset email helper.
export function passwordResetEmail(userName: string, link: string): { subject: string; html: string; text: string } {
  return {
    subject: 'Restablecer tu contraseña',
    text: `Hola ${userName},\n\nHemos recibido una solicitud para restablecer tu contraseña en Matripuntos.\n\nAbre este enlace para crear una nueva (caduca en 1 hora):\n${link}\n\nSi no fuiste tú, ignora este mensaje. Tu contraseña actual sigue válida.\n\nMatripuntos`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f0a1e;color:#fff;border-radius:16px">
<h1 style="font-size:20px;margin:0 0 12px">Restablecer contraseña</h1>
<p style="color:rgba(255,255,255,0.85);margin:0 0 16px">Hola ${userName},</p>
<p style="color:rgba(255,255,255,0.85);margin:0 0 16px">Hemos recibido una solicitud para restablecer tu contraseña.</p>
<p style="margin:24px 0;text-align:center"><a href="${link}" style="background:#fbbf24;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Crear nueva contraseña</a></p>
<p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0 0 8px">El enlace caduca en 1 hora.</p>
<p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0">Si no fuiste tú, ignora este mensaje. Tu contraseña actual sigue válida.</p>
</div>`,
  }
}

// Wrapper específico para password reset usado por el endpoint /forgot-password.
export async function sendPasswordResetEmail(
  to: string,
  userName: string,
  tokenPlaintext: string,
): Promise<SendEmailResult> {
  const base = process.env.PASSWORD_RESET_BASE_URL ?? 'https://matripuntos.com/reset-password'
  const link = `${base}?token=${encodeURIComponent(tokenPlaintext)}`
  const tpl = passwordResetEmail(userName || 'amiga/o', link)
  return sendEmail({ to, subject: tpl.subject, html: tpl.html, text: tpl.text })
}
