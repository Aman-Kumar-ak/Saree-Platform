export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700/80">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 font-['Georgia','Times_New_Roman',serif] text-2xl leading-tight text-stone-950 sm:text-[2rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-stone-600 sm:text-[15px]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
