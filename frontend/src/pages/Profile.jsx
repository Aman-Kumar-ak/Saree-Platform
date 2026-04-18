import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import LoginPromptModal from '../components/LoginPromptModal.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Profile() {
  const { user, ready, logout } = useAuth()

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
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-sm text-stone-600">Loading...</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Manage your account and quick links.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <section className="rounded-3xl border border-stone-200 bg-stone-50 p-5 shadow-sm ring-1 ring-black/[0.02]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Quick Update
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link
              to="/orders"
              className="flex min-h-[60px] items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-900 no-underline transition active:scale-[0.99] hover:border-stone-300 hover:shadow-sm"
            >
              <span>My Orders</span>
              <span className="text-stone-500">Open</span>
            </Link>
            <Link
              to="/address"
              className="flex min-h-[60px] items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-900 no-underline transition active:scale-[0.99] hover:border-stone-300 hover:shadow-sm"
            >
              <span>Addresses</span>
              <span className="text-stone-500">Open</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex min-h-[60px] items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition active:scale-[0.99] hover:border-red-300 hover:bg-red-100"
            >
              <span>Log out</span>
              <span className="text-red-500">Exit</span>
            </button>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm ring-1 ring-black/[0.02]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Account
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[13px] font-medium text-stone-500">Name</p>
                <p className="mt-1 text-lg font-semibold text-stone-900">{user.name}</p>
              </div>
              {user.email ? (
                <div>
                  <p className="text-[13px] font-medium text-stone-500">Email</p>
                  <p className="mt-1 text-sm text-stone-700">{user.email}</p>
                </div>
              ) : null}
              <div>
                <p className="text-[13px] font-medium text-stone-500">Phone</p>
                <p className="mt-1 text-sm text-stone-700">{user.phone}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
