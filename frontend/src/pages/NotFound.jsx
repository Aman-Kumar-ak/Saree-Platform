import { Link } from 'react-router-dom'
import MobileBackButton from '../components/MobileBackButton.jsx'

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 pb-28 sm:px-6 sm:py-10 sm:pb-16">
      <MobileBackButton to="/" label="Back to shop" variant="inline" />
      <section className="mt-4 rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm ring-1 ring-black/[0.02] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">
          Page not found
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 sm:text-base">
          The link may be incorrect or the page may have moved.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-stone-900 px-5 text-sm font-semibold text-white no-underline"
        >
          Go to home
        </Link>
      </section>
    </main>
  )
}
