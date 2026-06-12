import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  markPasswordChanged,
  signInWithIdentifier as authSignIn,
  updatePassword,
} from '@/lib/auth'
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

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch profile:', error.message)
    return null
  }

  return data as Profile | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      return
    }

    const nextProfile = await fetchProfile(user.id)
    setProfile(nextProfile)
  }, [user])

  useEffect(() => {
    let mounted = true

    async function initAuth() {
      const { data: { session: initialSession } } = await supabase.auth.getSession()

      if (!mounted) return

      setSession(initialSession)
      setUser(initialSession?.user ?? null)

      if (initialSession?.user) {
        const userProfile = await fetchProfile(initialSession.user.id)
        if (mounted) setProfile(userProfile)
      }

      if (mounted) setLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession)
        setUser(nextSession?.user ?? null)

        if (nextSession?.user) {
          const userProfile = await fetchProfile(nextSession.user.id)
          if (mounted) setProfile(userProfile)
        } else {
          setProfile(null)
        }

        if (mounted) setLoading(false)
      },
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithIdentifier = useCallback(async (identifier: string, password: string) => {
    const data = await authSignIn(identifier, password)

    if (data.user) {
      const userProfile = await fetchProfile(data.user.id)
      setUser(data.user)
      setSession(data.session)
      setProfile(userProfile)
    }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
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
