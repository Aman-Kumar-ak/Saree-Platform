import { Link } from 'react-router-dom'

export default function LoginPromptModal() {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm px-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-xl text-center">
          {/* Icon */}
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-stone-900"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>

          {/* Content */}
          <h2 className="text-lg font-semibold text-stone-900 mb-2">
            Sign in to continue
          </h2>
          <p className="text-sm text-stone-600 mb-6">
            Please log in or create an account to proceed with your order.
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <Link
              to="/login"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white [-webkit-tap-highlight-color:transparent] active:opacity-90 transition"
            >
              Sign In / Sign Up
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
