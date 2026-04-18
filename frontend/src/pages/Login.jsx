import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth'
import MobileBackButton from '../components/MobileBackButton.jsx'
import { apiUrl } from '../config/api.js'
import {
  getFirebaseAuth,
  isFirebaseClientConfigured,
} from '../config/firebaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'

const IN_10 = /^[6-9]\d{9}$/
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default function Login() {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const fromRaw = location.state?.from
  const from =
    typeof fromRaw === 'string' &&
    fromRaw.startsWith('/') &&
    !fromRaw.startsWith('/login')
      ? fromRaw
      : '/'

  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('phone')
  const [confirmation, setConfirmation] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const verifierRef = useRef(null)

  useEffect(() => {
    document.title = 'Login · Shop'
    return () => {
      const t = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = t ? `${t} · Shop` : 'Shop'
    }
  }, [])

  useEffect(
    () => () => {
      try {
        verifierRef.current?.clear?.()
      } catch {
        /* ignore */
      }
      verifierRef.current = null
    },
    []
  )

  function setModeAndReset(next) {
    setMode(next)
    setStep('phone')
    setConfirmation(null)
    setOtp('')
    setError(null)
  }

  async function sendOtp() {
    setError(null)
    if (!isFirebaseClientConfigured()) {
      setError(
        'Firebase client is not configured. Add VITE_FIREBASE_* keys to frontend/.env.'
      )
      return
    }
    const digits = phone.replace(/\D/g, '').slice(-10)
    if (!IN_10.test(digits)) {
      setError('Enter a valid 10-digit Indian mobile number.')
      return
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name to sign up.')
      return
    }
    setBusy(true)
    try {
      const validateRes = await fetch(apiUrl('/api/auth/validate-phone'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: digits,
          mode: mode === 'signup' ? 'signup' : 'login',
        }),
      })
      const validateData = await validateRes.json().catch(() => ({}))

      if (!validateRes.ok) {
        setError(validateData.error || 'Phone validation failed')
        setBusy(false)
        return
      }

      const auth = getFirebaseAuth()
      if (!verifierRef.current) {
        verifierRef.current = new RecaptchaVerifier(
          auth,
          'recaptcha-container',
          { size: 'invisible' }
        )
      }
      const e164 = `+91${digits}`
      const conf = await signInWithPhoneNumber(auth, e164, verifierRef.current)
      setConfirmation(conf)
      setStep('otp')
    } catch (e) {
      try {
        verifierRef.current?.clear?.()
      } catch {
        /* ignore */
      }
      verifierRef.current = null

      if (
        e?.code === 'auth/cancelled-popup-request' ||
        e?.code === 'auth/popup-closed-by-user'
      ) {
        setError('reCAPTCHA was cancelled. Please try again.')
      } else {
        setError(
          e?.message || 'Could not send OTP. Check Firebase Auth settings.'
        )
      }
    } finally {
      setBusy(false)
    }
  }

  async function verifyOtp() {
    setError(null)
    if (!confirmation) {
      setError('Request OTP again.')
      return
    }
    const code = otp.replace(/\D/g, '').slice(0, 6)
    if (code.length < 6) {
      setError('Enter the 6-digit OTP.')
      return
    }
    setBusy(true)
    try {
      const cred = await confirmation.confirm(code)
      const requestBody = {
        name: name.trim(),
        signup: mode === 'signup',
      }

      async function completeFirebaseLogin(forceRefresh = false) {
        const idToken = await cred.user.getIdToken(forceRefresh)
        const response = await fetch(apiUrl('/api/auth/firebase'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            ...requestBody,
          }),
        })
        const payload = await response.json().catch(() => ({}))
        return { response, payload }
      }

      let { response: r, payload: data } = await completeFirebaseLogin(true)

      if (!r.ok && r.status >= 500) {
        await delay(450)
        ;({ response: r, payload: data } = await completeFirebaseLogin(true))
      }

      if (!r.ok) {
        const hint =
          data.message ||
          (Array.isArray(data.missing) && data.missing.length
            ? `Missing: ${data.missing.join(', ')}`
            : null)
        throw new Error(hint || data.error || 'Could not complete login')
      }
      setSession(data.token, data.user)
      if (data.user?.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } catch (e) {
      setError(e?.message || 'Invalid OTP or login failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-svh bg-[#fafaf9] px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-md">
        <MobileBackButton to="/" label="Back to home" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-stone-900">
          Account
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Sign in with your phone. New here? Use Sign up and verify with OTP.
        </p>

        <div className="mt-6 flex rounded-full border border-stone-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition touch-manipulation ${
              mode === 'login'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 active:bg-stone-50'
            }`}
            onClick={() => setModeAndReset('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition touch-manipulation ${
              mode === 'signup'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 active:bg-stone-50'
            }`}
            onClick={() => setModeAndReset('signup')}
          >
            Sign up
          </button>
        </div>

        <div className="mt-8 space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          {mode === 'signup' ? (
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-medium text-stone-600"
              >
                Full name
              </label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-200 px-3 text-base text-stone-900 outline-none focus:border-stone-400 focus:ring-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          ) : null}

          {step === 'phone' ? (
            <>
              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-medium text-stone-600"
                >
                  Mobile number
                </label>
                <input
                  id="phone"
                  name="phone"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-200 px-3 text-base text-stone-900 outline-none focus:border-stone-400 focus:ring-2"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  placeholder="10-digit number"
                />
              </div>
              <div id="recaptcha-container" />
              <button
                type="button"
                disabled={busy}
                onClick={sendOtp}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-stone-900 text-sm font-semibold text-white touch-manipulation disabled:opacity-60 active:opacity-90"
              >
                {busy ? 'Sending…' : 'Send OTP'}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-stone-600">
                Enter the code sent to{' '}
                <span className="font-medium text-stone-900">+91{phone}</span>
              </p>
              <div>
                <label
                  htmlFor="otp"
                  className="block text-xs font-medium text-stone-600"
                >
                  OTP
                </label>
                <input
                  id="otp"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-200 px-3 text-base tracking-widest text-stone-900 outline-none focus:border-stone-400 focus:ring-2"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="6-digit code"
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={verifyOtp}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-stone-900 text-sm font-semibold text-white touch-manipulation disabled:opacity-60 active:opacity-90"
              >
                {busy ? 'Verifying…' : 'Verify & continue'}
              </button>
              <button
                type="button"
                className="w-full py-2 text-sm font-medium text-stone-600 touch-manipulation active:underline"
                onClick={() => {
                  setStep('phone')
                  setConfirmation(null)
                  setOtp('')
                }}
              >
                Change number
              </button>
            </>
          )}

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
