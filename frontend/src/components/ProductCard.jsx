import { Link } from 'react-router-dom'

export function ProductCard({ product }) {
  const img = product.images?.[0]
  const price = typeof product.price === 'number' ? product.price : 0

  return (
    <article className="group overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm ring-1 ring-black/[0.03] transition duration-200 [contain:layout] active:scale-[0.98] sm:group-hover:border-stone-300 sm:group-hover:shadow-md">
      <Link
        to={`/product/${product.slug}`}
        className="block min-h-[44px] no-underline text-inherit outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 [-webkit-tap-highlight-color:transparent]"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-gradient-to-b from-stone-100 to-stone-200/80">
          {img ? (
            <img
              src={img}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 sm:group-hover:scale-[1.02]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-stone-500">
              No image
            </div>
          )}
        </div>
        <div className="p-3 text-left sm:p-3.5">
          <h2 className="line-clamp-2 text-[13px] font-medium leading-snug text-stone-900 sm:text-sm">
            {product.name}
          </h2>
          <p className="mt-1.5 text-[13px] font-semibold tabular-nums text-stone-800 sm:text-sm">
            ₹{price.toLocaleString('en-IN')}
          </p>
        </div>
      </Link>
    </article>
  )
}
