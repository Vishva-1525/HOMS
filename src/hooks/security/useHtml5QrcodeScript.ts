import { useEffect, useState } from 'react'

const HTML5_QRCODE_CDN =
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'

let scriptPromise: Promise<void> | null = null

function loadHtml5QrcodeScript(): Promise<void> {
  if (typeof Html5Qrcode !== 'undefined') {
    return Promise.resolve()
  }

  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${HTML5_QRCODE_CDN}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load QR scanner')))
      return
    }

    const script = document.createElement('script')
    script.src = HTML5_QRCODE_CDN
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load QR scanner'))
    document.body.appendChild(script)
  })

  return scriptPromise
}

export function useHtml5QrcodeScript() {
  const [ready, setReady] = useState(typeof Html5Qrcode !== 'undefined')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (ready) return

    loadHtml5QrcodeScript()
      .then(() => setReady(true))
      .catch((err: Error) => setError(err.message))
  }, [ready])

  return { ready, error }
}
