import { useEffect } from 'react'
import MobileBackButton from './MobileBackButton.jsx'

export function LegalPage({ title, intro, sections }) {
  useEffect(() => {
    document.title = `${title} · Shop`
    return () => {
      const t = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = t ? `${t} · Shop` : 'Shop'
    }
  }, [title])

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-8 sm:px-6 sm:py-8 sm:pb-10">
      <MobileBackButton to="/" label="Back to shop" variant="inline" />
      <article className="mt-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm ring-1 ring-black/[0.02] sm:p-7">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 sm:text-[15px]">
          {intro}
        </p>

        <div className="mt-6 space-y-5">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                {section.heading}
              </h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-stone-700">
                {section.points.map((point) => (
                  <p key={point}>{point}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </main>
  )
}
