import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  markPasswordChanged,
  signInWithIdentifier as authSignIn,
  updatePassword,
} from '@/lib/auth'
import {
  clearCachedProfile,
  getCachedProfile,
  setCachedProfile,
} from '@/lib/profile-cache'
import { studentNeedsPasswordChange } from '@/lib/routes'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/lib/types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  role: UserRole | null
  loading: boolean
  needsPasswordChange: boolean
  signInWithIdentifier: (identifier: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  changePassword: (newPassword: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const PROFILE_SELECT = 'id, role, full_name, phone, password_changed, created_at'

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Failed to fetch profile:', error.message)
      return null
    }

    const profile = data as Profile | null
    if (profile) setCachedProfile(profile)
    return profile
  } catch (err) {
    console.error('Failed to fetch profile:', err)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const profileRequestId = useRef(0)

  const applyProfile = useCallback(async (userId: string, preferCache: boolean) => {
    const requestId = ++profileRequestId.current

    if (preferCache) {
      const cached = getCachedProfile(userId)
      if (cached) {
        setProfile(cached)
        setLoading(false)
      }
    }

    const nextProfile = await fetchProfile(userId)
    if (requestId !== profileRequestId.current) return

    if (nextProfile) {
      setProfile(nextProfile)
      setLoading(false)
      return
    }

    // Keep cached profile if network fails; otherwise stop boot spinner.
    setProfile((prev) => prev ?? getCachedProfile(userId))
    setLoading(false)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      return
    }
    await applyProfile(user.id, false)
  }, [user, applyProfile])

  useEffect(() => {
    let mounted = true

    // Immediate session restore — do NOT await profile inside onAuthStateChange
    // (that blocks the Supabase client and freezes "Loading your account...").
    void supabase.auth.getSession().then(({ data: { session: initial } }) => {
      if (!mounted) return
      setSession(initial)
      setUser(initial?.user ?? null)

      if (initial?.user) {
        void applyProfile(initial.user.id, true)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return

      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      if (nextSession?.user) {
        // Defer profile I/O outside the auth callback lock.
        const userId = nextSession.user.id
        queueMicrotask(() => {
          if (!mounted) return
          void applyProfile(userId, true)
        })
      } else {
        profileRequestId.current += 1
        clearCachedProfile()
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [applyProfile])

  const signInWithIdentifier = useCallback(async (identifier: string, password: string) => {
    const data = await authSignIn(identifier, password)

    if (data.user) {
      setUser(data.user)
      setSession(data.session)
      const cached = getCachedProfile(data.user.id)
      if (cached) setProfile(cached)
      const userProfile = await fetchProfile(data.user.id)
      setProfile(userProfile ?? cached)
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    profileRequestId.current += 1
    setSession(null)
    setUser(null)
    setProfile(null)
    clearCachedProfile()

    const { error } = await supabase.auth.signOut()
    if (error) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
      throw error
    }
  }, [])

  const changePassword = useCallback(async (newPassword: string) => {
    if (!user) throw new Error('Not authenticated')

    await updatePassword(newPassword)
    await markPasswordChanged(user.id)

    const updatedProfile = await fetchProfile(user.id)
    setProfile(updatedProfile)
  }, [user])

  const needsPasswordChange = studentNeedsPasswordChange(profile)

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      role: profile?.role ?? null,
      loading,
      needsPasswordChange,
      signInWithIdentifier,
      signOut,
      changePassword,
      refreshProfile,
    }),
    [
      session,
      user,
      profile,
      loading,
      needsPasswordChange,
      signInWithIdentifier,
      signOut,
      changePassword,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
