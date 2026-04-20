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
const OTP_SUSPEND_FALLBACK_MS = 2 * 60 * 1000

function nowMs() {
  return Date.now()
}

function getFriendlyOtpError(error) {
  const code = String(error?.code || '').toLowerCase()
  const message = String(error?.message || '').toLowerCase()

  if (
    code.includes('invalid-verification-code') ||
    code.includes('code-expired') ||
    message.includes('invalid verification code') ||
    message.includes('code has expired')
  ) {
    return 'The OTP is incorrect or expired. Please check the code and try again.'
  }

  if (code.includes('too-many-requests')) {
    return 'Too many attempts. Please wait a moment and request a new OTP.'
  }

  if (code.includes('network-request-failed') || message.includes('network')) {
    return 'Network issue while verifying OTP. Please check your connection and try again.'
  }

  return 'Could not verify OTP right now. Please try again.'
}

function isSuspensionMessage(value) {
  const lower = String(value || '').toLowerCase()
  return lower.includes('temporarily suspended') || lower.includes('try again in')
}

function getPhoneValidationErrorMessage(status, payload) {
  if (status === 429) {
    return payload?.error || 'Too many attempts. Please wait and try again.'
  }
  if (status >= 500) {
    return 'Service is temporarily unavailable. Please try again in a moment.'
  }
  if (status === 0) {
    return 'Could not reach the server. Please check your connection and try again.'
  }
  return payload?.error || 'Could not validate phone right now. Please try again.'
}

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
  const [sendCooldownUntil, setSendCooldownUntil] = useState(0)
  const [verifyCooldownUntil, setVerifyCooldownUntil] = useState(0)
  const [liveNowMs, setLiveNowMs] = useState(() => nowMs())
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
    setSendCooldownUntil(0)
    setVerifyCooldownUntil(0)
  }

  function applySuspension(retryAfterSec, fallbackMessage) {
    const waitMs =
      Number.isFinite(Number(retryAfterSec)) && Number(retryAfterSec) > 0
        ? Number(retryAfterSec) * 1000
        : OTP_SUSPEND_FALLBACK_MS
    const until = nowMs() + waitMs
    setSendCooldownUntil(until)
    setVerifyCooldownUntil(until)
    setError(
      fallbackMessage ||
        `Too many attempts. Please wait ${Math.ceil(waitMs / 1000)}s and try again.`
    )
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

    const sendRemainingSec =
      sendCooldownUntil > liveNowMs
        ? Math.ceil((sendCooldownUntil - liveNowMs) / 1000)
        : 0
    if (sendRemainingSec > 0) {
      setError(`Please wait ${sendRemainingSec}s before requesting another OTP.`)
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

      if (validateRes.status === 429) {
        applySuspension(
          validateData.retryAfterSec,
          validateData.error || 'Too many OTP requests. Please wait before trying again.'
        )
        setBusy(false)
        return
      }

      if (!validateRes.ok) {
        setError(getPhoneValidationErrorMessage(validateRes.status, validateData))
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
      } else if (e?.code === 'auth/too-many-requests') {
        applySuspension(null, 'Too many OTP requests. Please wait 2 minutes and retry.')
      } else {
        setError('Could not send OTP right now. Please try again.')
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

    const verifyRemainingSec =
      verifyCooldownUntil > liveNowMs
        ? Math.ceil((verifyCooldownUntil - liveNowMs) / 1000)
        : 0
    if (verifyRemainingSec > 0) {
      setError(`Too many OTP attempts. Please wait ${verifyRemainingSec}s.`)
      return
    }

    const digits = phone.replace(/\D/g, '').slice(-10)
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
        if (r.status === 429) {
          applySuspension(
            data.retryAfterSec,
            data.error || 'Account is temporarily suspended. Please wait and retry.'
          )
          return
        }
        if (r.status >= 500) {
          setError('Service is temporarily unavailable. Please try again.')
          return
        }
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
      try {
        const reportRes = await fetch(apiUrl('/api/auth/otp-failure'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: digits }),
        })
        const reportData = await reportRes.json().catch(() => ({}))
        if (reportRes.status === 429) {
          applySuspension(
            reportData.retryAfterSec,
            reportData.error ||
              'Too many incorrect OTP attempts. Please wait 2 minutes and try again.'
          )
          return
        }
      } catch {
        /* ignore reporting errors */
      }
      setError(getFriendlyOtpError(e))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveNowMs(Date.now())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const sendCooldownRemainingSec =
    sendCooldownUntil > liveNowMs
      ? Math.ceil((sendCooldownUntil - liveNowMs) / 1000)
      : 0
  const verifyCooldownRemainingSec =
    verifyCooldownUntil > liveNowMs
      ? Math.ceil((verifyCooldownUntil - liveNowMs) / 1000)
      : 0
  const activeCooldownSec = Math.max(
    sendCooldownRemainingSec,
    verifyCooldownRemainingSec
  )
  const liveCooldownMessage =
    activeCooldownSec > 0
      ? 'Account is temporarily suspended. Please try again after cooldown.'
      : null
  const displayError =
    !liveCooldownMessage && error && !isSuspensionMessage(error) ? error : null

  return (
    <div className="min-h-svh bg-[#fafaf9] px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-md">
        <MobileBackButton to="/" label="Back to home" variant="inline" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
          Account
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Sign in with your phone. New here? Use Sign up and verify with OTP.
        </p>

        <div className="relative mt-6 grid grid-cols-2 rounded-full border border-stone-200 bg-white p-1.5 shadow-sm">
          <span
            aria-hidden
            className={`pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 z-0 w-[calc(50%-0.75rem)] rounded-full bg-stone-900 shadow-[0_8px_20px_rgba(20,20,20,0.28)] transition-transform duration-300 ease-out ${
              mode === 'signup' ? 'translate-x-[calc(100%+0.75rem)]' : 'translate-x-0'
            }`}
          />
          <button
            type="button"
            className={`z-10 rounded-full py-2.5 text-sm font-semibold transition-colors duration-300 touch-manipulation ${
              mode === 'login'
                ? 'text-white'
                : 'text-stone-600 active:bg-stone-50'
            }`}
            onClick={() => setModeAndReset('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`z-10 rounded-full py-2.5 text-sm font-semibold transition-colors duration-300 touch-manipulation ${
              mode === 'signup'
                ? 'text-white'
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
                disabled={busy || sendCooldownRemainingSec > 0}
                onClick={sendOtp}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-stone-900 text-sm font-semibold text-white touch-manipulation disabled:opacity-60 active:opacity-90"
              >
                {busy
                  ? 'Sending...'
                  : sendCooldownRemainingSec > 0
                    ? `Retry in ${sendCooldownRemainingSec}s`
                    : 'Send OTP'}
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
                disabled={busy || verifyCooldownRemainingSec > 0}
                onClick={verifyOtp}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-stone-900 text-sm font-semibold text-white touch-manipulation disabled:opacity-60 active:opacity-90"
              >
                {busy
                  ? 'Verifying...'
                  : verifyCooldownRemainingSec > 0
                    ? `Retry in ${verifyCooldownRemainingSec}s`
                    : 'Verify & continue'}
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

          {liveCooldownMessage ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {liveCooldownMessage}
            </p>
          ) : displayError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {displayError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
