import type { Profile } from '@/lib/types'

const MEMORY_TTL_MS = 5 * 60_000
const STORAGE_KEY = 'homs:profile-cache:v1'

interface StoredProfile {
  profile: Profile
  cachedAt: number
}

let memory: StoredProfile | null = null

function readStorage(userId: string): Profile | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredProfile
    if (parsed?.profile?.id !== userId) return null
    if (Date.now() - parsed.cachedAt > MEMORY_TTL_MS) return null
    return parsed.profile
  } catch {
    return null
  }
}

function writeStorage(profile: Profile) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ profile, cachedAt: Date.now() } satisfies StoredProfile),
    )
  } catch {
    // ignore quota / private mode
  }
}

export function getCachedProfile(userId: string): Profile | null {
  if (memory && memory.profile.id === userId && Date.now() - memory.cachedAt < MEMORY_TTL_MS) {
    return memory.profile
  }
  const stored = readStorage(userId)
  if (stored) {
    memory = { profile: stored, cachedAt: Date.now() }
    return stored
  }
  return null
}

export function setCachedProfile(profile: Profile) {
  memory = { profile, cachedAt: Date.now() }
  writeStorage(profile)
}

export function clearCachedProfile() {
  memory = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
