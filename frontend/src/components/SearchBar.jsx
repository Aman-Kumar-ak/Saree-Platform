import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createShopHref } from '../lib/shopQuery.js'

export function SearchBar({
  initialValue = '',
  placeholder = 'Search sarees under Rs. 1000, cotton saree, Banarasi...',
  className = '',
  submitLabel = 'Search',
}) {
  const navigate = useNavigate()
  const [value, setValue] = useState(initialValue)

  function handleSubmit(event) {
    event.preventDefault()
    const nextValue = value.trim()
    navigate(
      createShopHref({
        search: nextValue,
      })
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-2 rounded-[1.9rem] border border-[#e9dcc9] bg-[linear-gradient(135deg,rgba(249,241,229,0.96),rgba(244,233,219,0.92))] p-2.5 shadow-[0_18px_42px_rgba(41,29,22,0.09)] sm:flex-row sm:items-center ${className}`}
    >
      <label className="sr-only" htmlFor="catalog-search">
        Search catalog
      </label>
      <div className="flex flex-1 items-center gap-3 rounded-[1.35rem] bg-white/88 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 text-stone-500"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id="catalog-search"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="w-full border-0 bg-transparent p-0 text-sm text-stone-900 outline-none placeholder:text-stone-400 sm:text-[15px]"
        />
      </div>
      <button
        type="submit"
        className="inline-flex min-h-[50px] items-center justify-center rounded-[1.35rem] bg-stone-950 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 sm:min-w-[10rem]"
      >
        {submitLabel}
      </button>
    </form>
  )
}
