import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import LoginPromptModal from '../components/LoginPromptModal.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Profile() {
  const { user, ready, logout } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    document.title = 'My Profile · Shop'
    return () => {
      const t = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = t ? `${t} · Shop` : 'Shop'
    }
  }, [])

  if (ready && !user) {
    return <LoginPromptModal />
  }

  if (!ready) {
    return (
      <LoadingState
        title="Loading profile..."
        description="Checking your account details."
      />
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-8 sm:px-6 sm:py-8 lg:pb-10">
      <div className="space-y-4">
        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-800 p-5 text-stone-50 shadow-xl shadow-stone-900/10 sm:p-7">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{user.name}</h1>
            <p className="text-sm font-medium text-stone-300 sm:text-base">{user.phone}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-stone-50 p-4 shadow-sm ring-1 ring-black/[0.02] sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Quick Actions
            </p>
            <span className="hidden text-xs text-stone-500 sm:inline">Tap to open</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Link
              to="/orders"
              className="group flex min-h-[68px] items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-900 no-underline transition active:scale-[0.99] hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
            >
              <span>
                <span className="block text-xs uppercase tracking-wide text-stone-500">Orders</span>
                <span className="mt-1 block">My Orders</span>
              </span>
              <span className="text-stone-500 transition group-hover:text-stone-700">Open</span>
            </Link>
            <Link
              to="/address"
              className="group flex min-h-[68px] items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-900 no-underline transition active:scale-[0.99] hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
            >
              <span>
                <span className="block text-xs uppercase tracking-wide text-stone-500">Address</span>
                <span className="mt-1 block">Saved Addresses</span>
              </span>
              <span className="text-stone-500 transition group-hover:text-stone-700">Open</span>
            </Link>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="group flex min-h-[68px] items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 text-left text-sm font-semibold text-red-700 transition active:scale-[0.99] hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100 hover:shadow-md"
            >
              <span>
                <span className="block text-xs uppercase tracking-wide text-red-400">Session</span>
                <span className="mt-1 block">Log out</span>
              </span>
              <span className="text-red-500 transition group-hover:text-red-700">Exit</span>
            </button>
          </div>
        </section>

        <ConfirmDialog
          open={showLogoutConfirm}
          title="Log out?"
          message="You will be signed out of your account on this device."
          confirmLabel="Log out"
          onConfirm={() => {
            setShowLogoutConfirm(false)
            logout()
          }}
          onClose={() => setShowLogoutConfirm(false)}
        />
      </div>
    </main>
  )
}
