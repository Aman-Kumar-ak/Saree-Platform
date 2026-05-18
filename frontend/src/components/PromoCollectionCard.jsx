import { Link } from 'react-router-dom'

const surfaceClasses = {
  amber: 'from-amber-50 via-orange-50 to-stone-100',
  rose: 'from-rose-50 via-pink-50 to-stone-100',
  emerald: 'from-emerald-50 via-teal-50 to-stone-100',
  sky: 'from-sky-50 via-cyan-50 to-stone-100',
  stone: 'from-stone-100 via-stone-50 to-stone-200',
}

const accentPillClasses = {
  amber: 'bg-amber-100 text-amber-800 ring-amber-200/80',
  rose: 'bg-rose-100 text-rose-800 ring-rose-200/80',
  emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-200/80',
  sky: 'bg-sky-100 text-sky-800 ring-sky-200/80',
  stone: 'bg-stone-200 text-stone-700 ring-stone-300/80',
}

export function PromoCollectionCard({
  item,
  className = '',
  variant = 'default',
}) {
  if (!item) return null

  const surfaceClass = surfaceClasses[item.accentFrom] ?? surfaceClasses.rose
  const pillClass = accentPillClasses[item.accentFrom] ?? accentPillClasses.rose
  const isFeatured = variant === 'featured'
  const mediaFrameHeightClass = isFeatured
    ? 'h-[24rem] sm:h-[31.5rem] lg:h-[33rem]'
    : 'h-[22rem] sm:h-[31.5rem] lg:h-[33rem]'

  return (
    <Link
      to={item.href}
      className={`group flex h-[40rem] flex-none flex-col overflow-hidden rounded-[1.8rem] bg-[#fcfaf6] text-stone-900 no-underline ring-1 ring-stone-200/90 shadow-[0_18px_38px_rgba(48,34,24,0.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(48,34,24,0.12)] sm:h-full ${className}`}
    >
      <div className="px-4 pt-4 sm:px-5">
        <div
          className={`relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${surfaceClass} ${mediaFrameHeightClass}`}
        >
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              className="h-full w-full object-cover object-top transform-gpu transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.08]"
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,_#eadccd,_#f7f2eb)]" />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-4 pt-3 sm:px-6 sm:pb-6">
        {item.eyebrow ? (
          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ring-1 ${pillClass}`}
          >
            {item.eyebrow}
          </span>
        ) : null}

        <h3
          className={`mt-4 font-['Georgia','Times_New_Roman',serif] leading-[1.02] text-stone-950 ${
            isFeatured ? 'text-[1.9rem] lg:text-[2.2rem]' : 'text-[1.7rem] lg:text-[1.95rem]'
          }`}
        >
          {item.title}
        </h3>

        {item.description ? (
          <p
            className={`mt-3 min-h-[3.5rem] text-stone-600 ${
              isFeatured ? 'text-[15px] leading-relaxed' : 'text-sm leading-relaxed'
            }`}
          >
            {item.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3.5 py-1.5 text-xs font-semibold text-stone-700 ring-1 ring-stone-200">
            {item.productCount} styles
          </span>
          <span className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-stone-950 px-4 text-sm font-semibold text-white transition group-hover:bg-stone-800">
            {item.ctaLabel ?? 'Explore edit'}
          </span>
        </div>
      </div>
    </Link>
  )
}
