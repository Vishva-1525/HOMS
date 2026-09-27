/**
 * Transactional email with provider fallback: SMTP (e.g. Gmail app password) → Brevo → Resend.
 *
 * Secrets:
 *   SMTP_USER, SMTP_PASS            required for SMTP; SMTP_HOST defaults to smtp.gmail.com
 *   SMTP_PORT                       defaults to 465 (implicit TLS — Supabase blocks 25/587)
 *   BREVO_API_KEY                   optional fallback (sender must be verified in Brevo)
 *   RESEND_API_KEY                  optional fallback
 *   MAIL_FROM                       sender address; defaults to SMTP_USER
 *   MAIL_FROM_NAME                  defaults to "SVCE HOMS"
 */

export interface MailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export class MailNotConfiguredError extends Error {
  constructor() {
    super('Email delivery is not configured')
  }
}

const SMTP_TIMEOUT_MS = 20_000

function env(name: string): string {
  return (Deno.env.get(name) ?? '').trim()
}

function senderAddress(): string {
  return env('MAIL_FROM') || env('SMTP_USER')
}

function senderName(): string {
  return env('MAIL_FROM_NAME') || 'SVCE HOMS'
}

export function isMailConfigured(): boolean {
  return Boolean(
    (env('SMTP_USER') && env('SMTP_PASS')) || env('BREVO_API_KEY') || env('RESEND_API_KEY'),
  )
}

export async function sendMail(message: MailMessage): Promise<string> {
  const errors: string[] = []

  if (env('SMTP_USER') && env('SMTP_PASS')) {
    try {
      await sendViaSmtp(message)
      return 'smtp'
    } catch (err) {
      errors.push(`smtp: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (env('BREVO_API_KEY')) {
    try {
      await sendViaBrevo(message)
      return 'brevo'
    } catch (err) {
      errors.push(`brevo: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (env('RESEND_API_KEY')) {
    try {
      await sendViaResend(message)
      return 'resend'
    } catch (err) {
      errors.push(`resend: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (errors.length === 0) throw new MailNotConfiguredError()
  throw new Error(errors.join(' | '))
}

// ---------------------------------------------------------------------------
// Brevo / Resend (HTTP)
// ---------------------------------------------------------------------------

async function sendViaBrevo(message: MailMessage): Promise<void> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env('BREVO_API_KEY'),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName(), email: senderAddress() },
      to: [{ email: message.to }],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
}

async function sendViaResend(message: MailMessage): Promise<void> {
  const from = senderAddress() || 'onboarding@resend.dev'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${senderName()} <${from}>`,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
}

// ---------------------------------------------------------------------------
// SMTP over implicit TLS
// ---------------------------------------------------------------------------

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function b64(value: string): string {
  const bytes = encoder.encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function wrap76(value: string): string {
  return value.replace(/.{1,76}/g, '$&\r\n').trimEnd()
}

function encodeHeader(value: string): string {
  // deno-lint-ignore no-control-regex
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${b64(value)}?=`
}

function buildMime(message: MailMessage, from: string): string {
  const boundary = `homs-${crypto.randomUUID()}`
  const domain = from.split('@')[1] ?? 'localhost'
  const headers = [
    `From: ${encodeHeader(senderName())} <${from}>`,
    `To: <${message.to}>`,
    `Subject: ${encodeHeader(message.subject)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64(message.text)),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64(message.html)),
    `--${boundary}--`,
  ]

  return `${headers.join('\r\n')}\r\n\r\n${body.join('\r\n')}`
}

class SmtpConnection {
  private buffer = ''

  constructor(private readonly conn: Deno.TlsConn) {}

  private async readLine(): Promise<string> {
    while (!this.buffer.includes('\r\n')) {
      const chunk = new Uint8Array(4096)
      const n = await this.conn.read(chunk)
      if (n === null) throw new Error('SMTP connection closed unexpectedly')
      this.buffer += decoder.decode(chunk.subarray(0, n))
    }
    const index = this.buffer.indexOf('\r\n')
    const line = this.buffer.slice(0, index)
    this.buffer = this.buffer.slice(index + 2)
    return line
  }

  async expect(...codes: number[]): Promise<string> {
    const lines: string[] = []
    for (;;) {
      const line = await this.readLine()
      lines.push(line)
      if (line.length < 4 || line[3] !== '-') break
    }
    const reply = lines.join('\n')
    const code = Number(reply.slice(0, 3))
    if (!codes.includes(code)) throw new Error(`SMTP ${reply}`)
    return reply
  }

  async write(data: string): Promise<void> {
    const bytes = encoder.encode(data)
    let offset = 0
    while (offset < bytes.length) {
      offset += await this.conn.write(bytes.subarray(offset))
    }
  }

  async command(line: string, ...codes: number[]): Promise<string> {
    await this.write(`${line}\r\n`)
    return this.expect(...codes)
  }

  close(): void {
    try {
      this.conn.close()
    } catch {
      // already closed
    }
  }
}

async function sendViaSmtp(message: MailMessage): Promise<void> {
  const host = env('SMTP_HOST') || 'smtp.gmail.com'
  const port = Number(env('SMTP_PORT') || '465')
  const user = env('SMTP_USER')
  const pass = env('SMTP_PASS').replace(/\s+/g, '')
  const from = senderAddress()

  const conn = await Deno.connectTls({ hostname: host, port })
  const smtp = new SmtpConnection(conn)
  let timer: ReturnType<typeof setTimeout> | undefined

  const session = (async () => {
    await smtp.expect(220)
    await smtp.command('EHLO homs.svce.ac.in', 250)
    await smtp.command('AUTH LOGIN', 334)
    await smtp.command(b64(user), 334)
    await smtp.command(b64(pass), 235)
    await smtp.command(`MAIL FROM:<${from}>`, 250)
    await smtp.command(`RCPT TO:<${message.to}>`, 250, 251)
    await smtp.command('DATA', 354)

    const payload = buildMime(message, from)
      .split('\r\n')
      .map((line) => (line.startsWith('.') ? `.${line}` : line))
      .join('\r\n')
    await smtp.write(`${payload}\r\n.\r\n`)
    await smtp.expect(250)

    try {
      await smtp.command('QUIT', 221)
    } catch {
      // message already accepted
    }
  })()

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('SMTP timed out')), SMTP_TIMEOUT_MS)
  })

  session.catch(() => {})

  try {
    await Promise.race([session, timeout])
  } finally {
    clearTimeout(timer)
    smtp.close()
  }
}
