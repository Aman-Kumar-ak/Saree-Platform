export default function LoadingState({
  title = 'Loading...',
  description = 'Please wait while we prepare this screen.',
  className = '',
}) {
  return (
    <div className={`flex min-h-[45svh] items-center justify-center px-4 py-8 ${className}`.trim()}>
      <div className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white px-6 py-8 text-center shadow-sm ring-1 ring-black/[0.03]">
        <div
          className="mx-auto h-12 w-12 rounded-full border-4 border-stone-200 border-t-stone-950 animate-spin"
          aria-hidden="true"
        />
        <p className="mt-4 text-sm font-semibold text-stone-950">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          {description}
        </p>
      </div>
    </div>
  )
}
