import { Link } from 'react-router-dom'

export default function MobileBackButton({
  to = '/',
  label = 'Back',
  className = '',
  variant = 'fixed',
}) {
  const positionClass =
    variant === 'inline'
      ? 'inline-flex sm:hidden'
      : 'fixed left-1/2 top-[calc(env(safe-area-inset-top)+4.25rem)] -translate-x-1/2 sm:hidden'

  return (
    <Link
      to={to}
      aria-label={label}
      className={`${positionClass} group relative z-30 h-12 w-12 rounded-full border border-stone-200 bg-white p-0 text-stone-700 no-underline shadow-sm ring-1 ring-black/[0.03] transition [-webkit-tap-highlight-color:transparent] active:scale-[0.98] active:bg-stone-50 ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute left-1/2 top-1/2 block h-5 w-5 -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  )
}
