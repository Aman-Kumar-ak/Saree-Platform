import { Link } from 'react-router-dom'

export default function MobileBackButton({
  to = '/',
  label = 'Back',
  className = '',
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={`fixed left-4 top-[calc(env(safe-area-inset-top)+4.25rem)] z-30 inline-flex h-12 w-12 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 no-underline shadow-sm ring-1 ring-black/[0.03] transition [-webkit-tap-highlight-color:transparent] active:scale-[0.98] active:bg-stone-50 sm:hidden ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  )
}
