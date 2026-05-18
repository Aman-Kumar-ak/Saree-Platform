import { Link } from 'react-router-dom'

const showcaseSurfaceClasses = [
  'from-emerald-50 via-teal-50 to-stone-100',
  'from-rose-50 via-orange-50 to-stone-100',
  'from-amber-50 via-orange-50 to-stone-100',
  'from-stone-100 via-stone-50 to-stone-200',
]

export function CategoryShowcase({ items = [] }) {
  if (!items.length) return null
  const mediaFrameHeightClass = 'h-[30rem] sm:h-[31.5rem] lg:h-[33rem]'

  return (
    <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 pt-2 scrollbar-none snap-x snap-mandatory scroll-px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pt-0 lg:grid-cols-4">
      {items.map((item, index) => (
        <Link
          key={item.id}
          to={item.href}
          className="group flex w-[84vw] flex-none snap-center flex-col overflow-hidden rounded-[1.8rem] bg-[#fcfaf6] text-stone-900 no-underline ring-1 ring-stone-200/90 shadow-[0_18px_36px_rgba(45,33,21,0.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(45,33,21,0.12)] sm:w-auto sm:flex-auto"
        >
          <div className="px-4 pt-4">
            <div
              className={`relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${showcaseSurfaceClasses[index % showcaseSurfaceClasses.length]} ${mediaFrameHeightClass}`}
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover object-top transform-gpu transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.08]"
                />
              ) : (
                <div className="h-full w-full bg-[linear-gradient(135deg,_#f0dfd1,_#f5efe7)]" />
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <span className="inline-flex w-fit items-center rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-600 ring-1 ring-stone-200">
              {item.productCount} styles
            </span>
            <h3 className="mt-4 font-['Georgia','Times_New_Roman',serif] text-[1.7rem] leading-[1.03] text-stone-950">
              {item.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              {item.description}
            </p>
            <span className="mt-auto inline-flex items-center pt-5 text-sm font-semibold text-stone-900 transition group-hover:text-amber-800">
              Explore collection
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
