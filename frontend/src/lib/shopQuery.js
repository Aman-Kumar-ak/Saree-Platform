export function buildShopQuery(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return
    searchParams.set(key, String(value))
  })

  return searchParams.toString()
}

export function createShopHref(params = {}) {
  const query = buildShopQuery(params)
  return query ? `/shop?${query}` : '/shop'
}

function formatPrice(value) {
  if (value == null || Number.isNaN(Number(value))) return ''
  return `Rs. ${Number(value).toLocaleString('en-IN')}`
}

export function describeShopState(applied = {}, explicitSearch = '') {
  const search = explicitSearch || applied.search || ''
  const categoryName = applied.categoryName || ''
  const priceMin = applied.priceMin
  const priceMax = applied.priceMax

  if (categoryName && priceMin != null && priceMax != null) {
    return {
      title: `${categoryName} from ${formatPrice(priceMin)} to ${formatPrice(priceMax)}`,
      description: `Showing ${categoryName.toLowerCase()} within your selected price range.`,
    }
  }

  if (categoryName && priceMax != null) {
    return {
      title: `${categoryName} under ${formatPrice(priceMax)}`,
      description: `Smart results for ${categoryName.toLowerCase()} within your budget.`,
    }
  }

  if (categoryName && priceMin != null) {
    return {
      title: `${categoryName} above ${formatPrice(priceMin)}`,
      description: `Curated ${categoryName.toLowerCase()} above your selected starting price.`,
    }
  }

  if (categoryName) {
    return {
      title: categoryName,
      description: `Browse ${categoryName.toLowerCase()} from your latest collection results.`,
    }
  }

  if (priceMin != null && priceMax != null) {
    return {
      title: `Styles from ${formatPrice(priceMin)} to ${formatPrice(priceMax)}`,
      description: 'Filtered by your selected budget range.',
    }
  }

  if (priceMax != null) {
    return {
      title: `Styles under ${formatPrice(priceMax)}`,
      description: 'Filtered by a maximum price so shoppers can find the right budget quickly.',
    }
  }

  if (priceMin != null) {
    return {
      title: `Styles above ${formatPrice(priceMin)}`,
      description: 'Filtered by a minimum price for more premium product discovery.',
    }
  }

  if (search) {
    return {
      title: `Results for "${search}"`,
      description: 'The catalog is interpreting your words and price intent together.',
    }
  }

  return {
    title: 'Shop All Sarees',
    description: 'Browse by category, price, and search intent from one smart catalog view.',
  }
}

export const QUICK_PRICE_FILTERS = [
  { label: 'Under Rs. 699', params: { priceMax: 699 } },
  { label: 'Under Rs. 999', params: { priceMax: 999 } },
  { label: 'Under Rs. 1499', params: { priceMax: 1499 } },
]
