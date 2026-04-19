import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import CachedImage from './CachedImage.jsx'
import { WishlistButton } from './WishlistButton.jsx'

export function ProductCard({ product }) {
  const { addOrUpdate, lines } = useCart()
  const { addToast } = useToast()
  const img = product.images?.[0]
  const imageVersion = product.updatedAt ?? product.createdAt ?? ''
  const price = typeof product.price === 'number' ? product.price : 0
  const isOutOfStock =
    typeof product.stock === 'number' ? product.stock < 1 : false
  const cartLine = lines.find((line) => line.productId === String(product._id))
  const isInCart = Boolean(cartLine)

  function handleQuickAdd(event) {
    event.preventDefault()
    event.stopPropagation()
    if (isOutOfStock) return

    addOrUpdate({
      productId: product._id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.images?.[0] ?? '',
      quantity: 1,
    })
    addToast(`${product.name} added to cart`, 'success', 2200)
  }

  return (
    <article
      className={`group overflow-hidden rounded-2xl border transition duration-200 [contain:layout] ${
        isOutOfStock
          ? 'border-stone-200/50 bg-stone-50/50 ring-1 ring-black/[0.02] opacity-60'
          : 'border-stone-200/90 bg-white shadow-sm ring-1 ring-black/[0.03] sm:group-hover:border-stone-300 sm:group-hover:shadow-md'
      }`}
    >
      <div className="relative">
        <div className="relative">
          <Link
            to={`/product/${product.slug}`}
            aria-label={`View ${product.name}`}
            className="absolute inset-0 z-10 block min-h-[44px] no-underline text-inherit outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 [-webkit-tap-highlight-color:transparent]"
          />
          <div className="relative aspect-[2/3] w-full overflow-hidden bg-gradient-to-b from-stone-100 to-stone-200/80">
            {img ? (
              <CachedImage
                key={`${img}-${imageVersion}`}
                src={img}
                version={imageVersion}
                alt={product.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full"
                imageClassName={`h-full w-full object-cover will-change-transform transition-[transform,filter,opacity] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isOutOfStock ? 'grayscale' : 'sm:group-hover:scale-[1.09]'
                }`}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-2 text-center text-xs text-stone-500">
                No image
              </div>
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                <div className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white">
                  Out of stock
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 z-20">
              <button
                type="button"
                aria-label={
                  isOutOfStock
                    ? 'Out of stock'
                    : isInCart
                      ? 'Added to cart'
                      : 'Quick add to cart'
                }
                disabled={isOutOfStock}
                onClick={handleQuickAdd}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-md backdrop-blur-sm transition [-webkit-tap-highlight-color:transparent] active:scale-[0.96] ${
                  isOutOfStock
                    ? 'border-white/80 bg-white/95 text-stone-700 opacity-60 cursor-not-allowed'
                    : isInCart
                      ? 'border-emerald-400 bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.28)]'
                      : 'border-white/80 bg-white/95 text-stone-700 hover:border-white hover:text-stone-950'
                }`}
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
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  <path d="M12 10v4" />
                  <path d="M10 12h4" />
                </svg>
              </button>
            </div>
            <div className="absolute bottom-3 right-3 z-20">
              <WishlistButton
                product={product}
                className="h-10 w-10 bg-white/95 shadow-md"
                iconClassName="h-5 w-5"
              />
            </div>
          </div>
        </div>
        <Link
          to={`/product/${product.slug}`}
          className="block no-underline text-inherit"
        >
          <div className="p-3 text-left sm:p-3.5">
            <h2 className="line-clamp-2 text-[13px] font-medium leading-snug text-stone-900 sm:text-sm">
              {product.name}
            </h2>
            <p
              className={`mt-1.5 text-[13px] font-semibold tabular-nums ${
                isOutOfStock ? 'text-stone-400' : 'text-stone-800'
              }`}
            >
              {isOutOfStock ? 'Out of stock' : `₹${price.toLocaleString('en-IN')}`}
            </p>
          </div>
        </Link>
      </div>
    </article>
  )
}
