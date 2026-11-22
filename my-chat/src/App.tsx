import './settings' // applies your saved theme and accent before anything draws
import { signOutCleanly } from './pwa' // also registers the service worker
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from './types'
import AuthScreen from './components/AuthScreen'
import ProfileForm from './components/ProfileForm'
import PasswordForm from './components/PasswordForm'
import Chat from './Chat'

function Loading() {
  return <div className="h-screen flex items-center justify-center bg-[#313338] text-gray-400">Loading...</div>
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  // True when the user arrived by clicking a password reset link
  const [recovering, setRecovering] = useState(() => window.location.hash.includes('type=recovery'))

  // Track who is signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoaded(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Reset when signed out (e.g. an expired reset link)
  useEffect(() => {
    if (sessionLoaded && !session) setRecovering(false)
  }, [sessionLoaded, session])

  // Load that user's profile
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setProfileLoaded(false)
      return
    }
    setProfileLoaded(false)
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data as Profile | null)
        setProfileLoaded(true)
      })
  }, [userId])

  if (!sessionLoaded) return <Loading />
  if (!session) return <AuthScreen />

  if (recovering) {
    return (
      <PasswordForm
        onDone={() => {
          window.history.replaceState(null, '', window.location.pathname)
          setRecovering(false)
        }}
      />
    )
  }

  if (!profileLoaded) return <Loading />
  if (!profile) return <ProfileForm userId={session.user.id} onSaved={setProfile} />

  return (
    <Chat
      profile={profile}
      email={session.user.email ?? ''}
      onProfileSaved={setProfile}
     onSignOut={signOutCleanly}
    />
  )
}