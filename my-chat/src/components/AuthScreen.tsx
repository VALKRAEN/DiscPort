import { useState } from 'react'
import { supabase } from '../supabase'

type Mode = 'signin' | 'signup' | 'forgot'

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setInfo('')
  }

  async function submit() {
    setError('')
    setInfo('')
    setBusy(true)
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) setError(error.message)
      else if (!data.session) setInfo('Check your email and click the confirmation link, then sign in.')
    } else if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(
          error.message.toLowerCase().includes('not confirmed')
            ? 'Please confirm your email first. Check your inbox for the link.'
            : error.message
        )
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) setError(error.message)
      else setInfo('If an account exists for that email, a reset link is on its way.')
    }
    setBusy(false)
  }

  const title =
    mode === 'signin' ? 'Welcome back!' : mode === 'signup' ? 'Create an account' : 'Reset your password'
  const buttonLabel = mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Sign up' : 'Send reset link'

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#313338] p-4 text-gray-100">
      <div className="w-full max-w-sm bg-[#2b2d31] rounded-lg p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">{title}</h1>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && mode === 'forgot' && submit()}
          placeholder="Email"
          className="w-full rounded bg-[#1e1f22] px-3 py-2 outline-none"
        />
        {mode !== 'forgot' && (
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder={mode === 'signup' ? 'Password (8+ characters)' : 'Password'}
            className="w-full rounded bg-[#1e1f22] px-3 py-2 outline-none"
          />
        )}
        {mode === 'signin' && (
          <button onClick={() => switchMode('forgot')} className="text-sm text-indigo-400 hover:underline">
            Forgot your password?
          </button>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {info && <p className="text-sm text-green-400">{info}</p>}
        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 py-2 font-semibold"
        >
          {busy ? 'Please wait...' : buttonLabel}
        </button>
        {mode === 'forgot' ? (
          <button onClick={() => switchMode('signin')} className="w-full text-sm text-indigo-400 hover:underline">
            Back to sign in
          </button>
        ) : (
          <button
            onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            className="w-full text-sm text-indigo-400 hover:underline"
          >
            {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        )}
      </div>
    </div>
  )
}