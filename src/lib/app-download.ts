/** Public APK URL — set VITE_APK_DOWNLOAD_URL in production when hosting the release file. */
export function getApkDownloadUrl(): string {
  const fromEnv = import.meta.env.VITE_APK_DOWNLOAD_URL?.trim()
  if (fromEnv) return fromEnv
  const base = import.meta.env.BASE_URL ?? '/'
  return `${base}${base.endsWith('/') ? '' : '/'}homs.apk`
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}
