import { Link } from 'react-router-dom'
import { ProductCard } from './ProductCard.jsx'

export function ProductRail({
  title,
  description,
  actionHref,
  actionLabel = 'View all',
  products = [],
}) {
  if (!products.length) return null

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h3 className="font-['Georgia','Times_New_Roman',serif] text-[1.8rem] text-stone-950">
            {title}
          </h3>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-stone-600 sm:text-[15px]">
              {description}
            </p>
          ) : null}
        </div>
        {actionHref ? (
          <Link
            to={actionHref}
            className="hidden rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 no-underline sm:inline-flex"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>

      <ul className="mt-6 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product._id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  )
}
