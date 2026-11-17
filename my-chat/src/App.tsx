import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from './types'
import AuthScreen from './components/AuthScreen'
import ProfileForm from './components/ProfileForm'
import PasswordForm from './components/PasswordForm'
import Chat from './Chat'

type View = 'chat' | 'editProfile' | 'password'

function Loading() {
  return <div className="h-screen flex items-center justify-center bg-[#313338] text-gray-400">Loading...</div>
}

function SendResetButton({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle')
  const [error, setError] = useState('')

  async function send() {
    setError('')
    setState('busy')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) {
      setError(error.message)
      setState('idle')
    } else {
      setState('sent')
    }
  }

  return (
    <>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {state === 'sent' ? (
        <p className="text-sm text-green-400">Email sent. Check your inbox (and spam).</p>
      ) : (
        <button
          onClick={send}
          disabled={state === 'busy'}
          className="w-full rounded bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 py-2 font-semibold"
        >
          {state === 'busy' ? 'Sending...' : 'Email me a reset link'}
        </button>
      )}
    </>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [view, setView] = useState<View>('chat')
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

  // Reset screens when signed out (e.g. an expired reset link)
  useEffect(() => {
    if (sessionLoaded && !session) {
      setRecovering(false)
      setView('chat')
    }
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

  if (view === 'editProfile') {
    return (
      <ProfileForm
        userId={session.user.id}
        initial={profile}
        onSaved={p => {
          setProfile(p)
          setView('chat')
        }}
        onCancel={() => setView('chat')}
        onChangePassword={() => setView('password')}
      />
    )
  }

  if (view === 'password') {
    return (
      <div className="h-screen flex items-center justify-center bg-[#313338] text-gray-100">
        <div className="w-full max-w-sm bg-[#2b2d31] rounded-lg p-8 space-y-4 text-center">
          <h1 className="text-2xl font-bold">Change password</h1>
          <p className="text-sm text-gray-400">
            We'll email a link to <span className="text-gray-100">{session.user.email}</span>. Click it
            to choose a new password.
          </p>
          <SendResetButton email={session.user.email ?? ''} />
          <button
            onClick={() => setView('editProfile')}
            className="w-full rounded bg-white/10 hover:bg-white/20 py-2"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <Chat
      profile={profile}
      onEditProfile={() => setView('editProfile')}
      onSignOut={() => supabase.auth.signOut()}
    />
  )
}