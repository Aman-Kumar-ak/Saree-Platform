import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { apiUrl } from '../config/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { ADMIN_SUPPORT_MESSAGE } from '../lib/errorMessages.js'

const OVERVIEW_NOTICE_CLOSE_MS = 340

const SLOT_LABELS = {
  hero: 'Hero',
  featured: 'Featured',
  budget: 'Budget',
  fallback: 'Backup',
}

const SLOT_FLASH_CLASS = {
  hero: 'admin-ad-flash--hero',
  featured: 'admin-ad-flash--featured',
  budget: 'admin-ad-flash--budget',
  fallback: 'admin-ad-flash--fallback',
  backup: 'admin-ad-flash--fallback',
  recent: 'admin-ad-flash--featured',
  history: 'admin-ad-flash--fallback',
  overview: 'admin-ad-flash--hero',
}

function formatDate(value) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function buildAdInsightChips(ad) {
  if (!ad) return []
  const chips = []
  if (ad.homepagePreview?.productCount) {
    chips.push(`${ad.homepagePreview.productCount} preview products`)
  }
  if (ad.filters?.categorySlug) {
    chips.push(ad.filters.categorySlug.replace(/-/g, ' '))
  }
  if (ad.filters?.material) {
    chips.push(ad.filters.material)
  }
  if (ad.filters?.priceMax) {
    chips.push(`up to Rs. ${Number(ad.filters.priceMax).toLocaleString('en-IN')}`)
  }
  return chips.slice(0, 3)
}

function formatStatus(status) {
  switch (status) {
    case 'live':
      return 'Live now'
    case 'upcoming':
      return 'Ready next'
    case 'fallback':
      return 'Backup ad'
    case 'expired':
      return 'Past'
    default:
      return 'Draft'
  }
}

function statusClasses(status) {
  switch (status) {
    case 'live':
      return 'bg-emerald-100 text-emerald-800'
    case 'upcoming':
      return 'bg-sky-100 text-sky-800'
    case 'fallback':
      return 'bg-amber-100 text-amber-900'
    case 'expired':
      return 'bg-stone-200 text-stone-700'
    default:
      return 'bg-stone-100 text-stone-700'
  }
}

function emptyForm() {
  return {
    title: '',
    subtitle: '',
    eyebrow: '',
    ctaLabel: 'Shop now',
    placementSlot: 'hero',
    search: '',
    categorySlug: '',
    priceMin: '',
    priceMax: '',
    startAt: '',
    endAt: '',
  }
}

function formFromAd(ad) {
  return {
    title: ad?.title ?? '',
    subtitle: ad?.subtitle ?? '',
    eyebrow: ad?.eyebrow ?? '',
    ctaLabel: ad?.ctaLabel ?? 'Shop now',
    placementSlot: ad?.placementSlot ?? 'hero',
    search: ad?.filters?.search ?? '',
    categorySlug: ad?.filters?.categorySlug ?? '',
    priceMin:
      ad?.filters?.priceMin == null || ad?.filters?.priceMin === ''
        ? ''
        : String(ad.filters.priceMin),
    priceMax:
      ad?.filters?.priceMax == null || ad?.filters?.priceMax === ''
        ? ''
        : String(ad.filters.priceMax),
    startAt: ad?.startAt ? String(ad.startAt).slice(0, 10) : '',
    endAt: ad?.endAt ? String(ad.endAt).slice(0, 10) : '',
  }
}

function getAreaKeyForSlot(slot) {
  return `slot:${slot}`
}

function getAreaForAdvertisement(ad) {
  return ad?.placementSlot === 'fallback'
    ? 'backup'
    : getAreaKeyForSlot(ad?.placementSlot || 'hero')
}

function ActionButton({ children, tone = 'default', ...props }) {
  const classes =
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'primary'
        ? 'border-stone-950 bg-stone-950 text-white'
        : tone === 'soft'
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-stone-300 bg-white text-stone-800'

  return (
    <button
      type="button"
      {...props}
      className={`rounded-full border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${classes} ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

function ChevronDownIcon({ open = false }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 8 5 5 5-5" />
    </svg>
  )
}

function OverviewPanelContent({ title, subtitle, badgeLabel, badgeTone, heroAd, featuredAd, budgetAd, onPreview, emptyMessage = 'Nothing prepared yet.' }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-stone-950">{title}</p>
          {subtitle ? <p className="mt-1 text-sm leading-relaxed text-stone-600">{subtitle}</p> : null}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone}`}>
          {badgeLabel}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        <MiniAdTile label="Hero" ad={heroAd} onPreview={onPreview} emptyMessage={emptyMessage} />
        <div className="grid gap-3 sm:grid-cols-2">
          <MiniAdTile label="Featured" ad={featuredAd} onPreview={onPreview} emptyMessage={emptyMessage} />
          <MiniAdTile label="Budget" ad={budgetAd} onPreview={onPreview} emptyMessage={emptyMessage} />
        </div>
      </div>
    </>
  )
}

function SectionShell({ title, subtitle, busy, flashedArea, children, actions, className = '' }) {
  return (
    <section
      className={`relative overflow-visible rounded-[1.8rem] border border-stone-200 bg-white p-5 shadow-none sm:shadow-[0_18px_45px_rgba(15,23,42,0.05)] ${
        flashedArea ? `admin-ad-flash ${SLOT_FLASH_CLASS[flashedArea] ?? ''}` : ''
      } ${className}`}
    >
      {busy ? (
        <div className="absolute inset-x-0 top-0 z-10 flex justify-end px-4 pt-4">
          <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-semibold text-white shadow-lg">
            Updating...
          </span>
        </div>
      ) : null}
      <div className={busy ? 'pointer-events-none opacity-75 transition-opacity' : 'transition-opacity'}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-stone-600">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">{actions}</div> : null}
        </div>
        {children}
      </div>
    </section>
  )
}

function EmptyAdCard({ slot, onCreate, onGenerate, disabled }) {
  return (
    <div className="rounded-[1.7rem] border border-dashed border-stone-300 bg-white px-5 py-6 text-center">
      <p className="text-sm font-semibold text-stone-900">
        No {SLOT_LABELS[slot].toLowerCase()} ad yet
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Create one manually or let the store prepare a smart version automatically.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <ActionButton onClick={onCreate} disabled={disabled}>
          Create
        </ActionButton>
        {slot !== 'fallback' ? (
          <ActionButton onClick={onGenerate} disabled={disabled}>
            Auto prepare
          </ActionButton>
        ) : null}
      </div>
    </div>
  )
}

function AdPreviewCard({ ad, actions, slotLabel, compact = false, busy = false }) {
  if (!ad) return null
  const preview = ad.homepagePreview ?? {}
  const insightChips = buildAdInsightChips(ad)

  return (
    <article className={`overflow-hidden rounded-[1.8rem] border border-stone-200 bg-white shadow-none sm:shadow-[0_18px_45px_rgba(15,23,42,0.06)] ${busy ? 'opacity-80' : ''}`}>
      <div className={`relative overflow-hidden bg-stone-950 text-white ${compact ? 'min-h-[11rem] sm:min-h-[12.5rem]' : 'min-h-[15rem]'}`}>
        {preview.image ? (
          <img
            src={preview.image}
            alt={preview.title ?? ad.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,25,23,0.08),rgba(28,25,23,0.82))]" />
        <div className={`relative z-10 flex flex-col justify-between ${compact ? 'min-h-[11rem] p-4 sm:min-h-[12.5rem] sm:p-5' : 'min-h-[15rem] p-5'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(ad.status)}`}>
                {formatStatus(ad.status)}
              </span>
              <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/86">
                {slotLabel}
              </span>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
              {ad.sourceType === 'auto'
                ? 'Auto'
                : ad.sourceType === 'reused'
                  ? 'Reused'
                  : 'Manual'}
            </span>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/72">
              {preview.eyebrow || ad.eyebrow || 'Homepage ad'}
            </p>
            <h3 className={`${compact ? 'mt-2 text-[1.25rem]' : 'mt-3 text-[1.8rem]'} font-[Georgia,Times_New_Roman,serif] leading-tight`}>
              {preview.title || ad.title}
            </h3>
            <p className={`mt-2 max-w-lg ${compact ? 'text-[13px]' : 'text-sm'} leading-relaxed text-white/82`}>
              {preview.description || ad.subtitle || 'Advertisement preview ready for the storefront.'}
            </p>
          </div>
        </div>
      </div>
        <div className={`${compact ? 'space-y-3 p-4 sm:p-5' : 'space-y-4 p-5'}`}>
        <div className="grid grid-cols-2 gap-3 text-sm text-stone-600">
          <p>
            <span className="font-semibold text-stone-900">Start:</span> {formatDate(ad.startAt)}
          </p>
          <p>
            <span className="font-semibold text-stone-900">End:</span> {formatDate(ad.endAt)}
          </p>
        </div>
        {insightChips.length ? (
          <div className="flex flex-wrap gap-2">
            {insightChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}
        {ad.generationReason ? (
          <p className="rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-600">
            {ad.generationReason}
          </p>
        ) : null}
        {actions ? <div>{actions}</div> : null}
      </div>
    </article>
  )
}

function MiniAdTile({ label, ad, onPreview, emptyMessage = 'Nothing prepared yet.' }) {
  const preview = ad?.homepagePreview ?? {}

  return (
    <button
      type="button"
      onClick={() => ad && onPreview(ad)}
      disabled={!ad}
      className={`group overflow-hidden rounded-[1.5rem] border text-left ${
        ad
          ? 'border-stone-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]'
          : 'border-dashed border-stone-300 bg-stone-50'
      }`}
    >
      <div className={`relative ${label === 'Hero' ? 'min-h-[10.5rem] sm:min-h-[12rem]' : 'min-h-[7.5rem] sm:min-h-[8.25rem]'} overflow-hidden bg-stone-950 text-white`}>
        {preview.image ? (
          <img
            src={preview.image}
            alt={preview.title ?? ad?.title ?? label}
            className="absolute inset-0 h-full w-full object-cover transform-gpu transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.08]"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,39,0.2),rgba(17,24,39,0.85))]" />
        <div className="relative z-10 flex h-full flex-col justify-end p-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/72">
            {label}
          </span>
          <h3 className="mt-2 font-[Georgia,Times_New_Roman,serif] text-[1.15rem] leading-tight">
            {ad ? preview.title || ad.title : `${label} not set`}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-white/80">
            {ad ? formatStatus(ad.status) : emptyMessage}
          </p>
        </div>
      </div>
    </button>
  )
}

function StorefrontOverview({
  slotBoards,
  onPreview,
  onGenerateAll,
  onMakeAllReadyLive,
  canMakeAllReadyLive,
  busy,
  focusPanel,
  mobileView,
  onMobileViewChange,
}) {
  const liveHero = slotBoards?.hero?.liveNow ?? null
  const liveFeatured = slotBoards?.featured?.liveNow ?? null
  const liveBudget = slotBoards?.budget?.liveNow ?? null
  const nextHero = slotBoards?.hero?.readyNext ?? null
  const nextFeatured = slotBoards?.featured?.readyNext ?? null
  const nextBudget = slotBoards?.budget?.readyNext ?? null
  const liveCount = [liveHero, liveFeatured, liveBudget].filter(Boolean).length
  const readyCount = [nextHero, nextFeatured, nextBudget].filter(Boolean).length
  const nextSwitchDate = [nextHero, nextFeatured, nextBudget]
    .map((ad) => ad?.startAt)
    .filter(Boolean)
    .sort()[0]

  return (
    <SectionShell
      title="Whole homepage preview"
      subtitle="Check live and next ads before switching."
      busy={busy}
    >
      <div className="mb-5 space-y-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <span className="rounded-[1.1rem] border border-stone-200 bg-stone-50 px-3 py-3 text-center text-xs font-semibold text-stone-800">
              <span className="block text-[10px] uppercase tracking-[0.22em] text-stone-500">Live</span>
              <span className="mt-1 block text-sm text-stone-950">{liveCount} ads</span>
            </span>
            <span className="rounded-[1.1rem] border border-sky-100 bg-sky-50 px-3 py-3 text-center text-xs font-semibold text-sky-800">
              <span className="block text-[10px] uppercase tracking-[0.22em] text-sky-500">Next</span>
              <span className="mt-1 block text-sm text-sky-900">{readyCount} ads</span>
            </span>
            {nextSwitchDate ? (
              <span className="rounded-[1.1rem] border border-amber-100 bg-amber-50 px-3 py-3 text-center text-xs font-semibold text-amber-900">
                <span className="block text-[10px] uppercase tracking-[0.22em] text-amber-600">Starts</span>
                <span className="mt-1 block text-sm text-amber-950">{formatDate(nextSwitchDate)}</span>
              </span>
            ) : null}
            <span className="rounded-[1.1rem] border border-emerald-100 bg-emerald-50 px-3 py-3 text-center text-xs font-semibold text-emerald-800">
              <span className="block text-[10px] uppercase tracking-[0.22em] text-emerald-600">Source</span>
              <span className="mt-1 block text-sm text-emerald-900">Catalog-led</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:max-w-[28rem] lg:grid-cols-2">
            <ActionButton onClick={onGenerateAll} disabled={busy} className="w-full justify-center whitespace-nowrap py-3 shadow-sm">
              Prepare next
            </ActionButton>
            <ActionButton
              onClick={onMakeAllReadyLive}
              disabled={busy || !canMakeAllReadyLive}
              className="w-full justify-center whitespace-nowrap py-3 shadow-sm"
            >
              Go live now
            </ActionButton>
          </div>
        </div>
      </div>
      <div className="lg:hidden">
        <div className="relative rounded-full border border-stone-200 bg-stone-50 p-1.5">
            <span
              aria-hidden="true"
              className={`absolute bottom-1.5 top-1.5 w-[calc(50%-0.35rem)] rounded-full bg-white shadow-sm transition-transform duration-300 ${
                mobileView === 'live' ? 'translate-x-0' : 'translate-x-[calc(100%+0.2rem)]'
              }`}
            />
            <div className="relative z-10 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onMobileViewChange('live')}
              className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition-all ${
                mobileView === 'live' ? 'text-stone-950' : 'text-stone-600'
              }`}
            >
              Current live
            </button>
            <button
              type="button"
              onClick={() => onMobileViewChange('next')}
              className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition-all ${
                mobileView === 'next' ? 'text-stone-950' : 'text-stone-600'
              }`}
              >
                Coming next
              </button>
            </div>
        </div>
        <div className="mt-4 grid transition-all duration-300">
          {mobileView === 'live' ? (
            <div
              className={`rounded-[1.6rem] border border-stone-200 bg-stone-50/70 p-4 ${
                focusPanel === 'live' ? 'admin-overview-panel admin-overview-panel--live' : ''
              }`}
            >
              <OverviewPanelContent
                title="Current live"
                subtitle=""
                badgeLabel="Live"
                badgeTone="bg-emerald-50 text-emerald-700"
                heroAd={liveHero}
                featuredAd={liveFeatured}
                budgetAd={liveBudget}
                onPreview={onPreview}
                emptyMessage="Nothing is live here yet."
              />
            </div>
          ) : (
            <div
              className={`rounded-[1.6rem] border border-stone-200 bg-sky-50/35 p-4 ${
                focusPanel === 'next' ? 'admin-overview-panel admin-overview-panel--next' : ''
              }`}
            >
              <OverviewPanelContent
                title="Coming next"
                subtitle=""
                badgeLabel="Next"
                badgeTone="bg-sky-50 text-sky-700"
                heroAd={nextHero}
                featuredAd={nextFeatured}
                budgetAd={nextBudget}
                onPreview={onPreview}
                emptyMessage="Nothing is queued yet."
              />
            </div>
          )}
        </div>
      </div>
      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        <div
          className={`rounded-[1.6rem] border border-stone-200 bg-stone-50/70 p-4 sm:p-5 ${
            focusPanel === 'live' ? 'admin-overview-panel admin-overview-panel--live' : ''
          }`}
        >
          <OverviewPanelContent
            title="Current live"
            subtitle="This is what shoppers are seeing right now."
            badgeLabel="Live"
            badgeTone="bg-emerald-50 text-emerald-700"
            heroAd={liveHero}
            featuredAd={liveFeatured}
            budgetAd={liveBudget}
            onPreview={onPreview}
            emptyMessage="Nothing is live here yet."
          />
        </div>

        <div
          className={`rounded-[1.6rem] border border-stone-200 bg-sky-50/35 p-4 sm:p-5 ${
            focusPanel === 'next' ? 'admin-overview-panel admin-overview-panel--next' : ''
          }`}
        >
          <OverviewPanelContent
            title="Coming next"
            subtitle="Prepare this set, review it, then send it live when you are ready."
            badgeLabel="Next"
            badgeTone="bg-sky-50 text-sky-700"
            heroAd={nextHero}
            featuredAd={nextFeatured}
            budgetAd={nextBudget}
            onPreview={onPreview}
            emptyMessage="Nothing is queued yet."
          />
        </div>
      </div>
    </SectionShell>
  )
}

function SlotPanel({
  slot,
  board,
  busy,
  flashedArea,
  onPreview,
  onEdit,
  onMakeLive,
  onPinToggle,
  onDelete,
  onGenerate,
  onOpenCreate,
  autoReveal,
}) {
  const label = SLOT_LABELS[slot]
  const [mobileExpanded, setMobileExpanded] = useState(slot === 'hero')
  const [mobileStagePreference, setMobileStagePreference] = useState(
    board?.liveNow ? 'live' : 'next'
  )
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)
  const mobileStage = autoReveal
    ? 'next'
    : mobileStagePreference === 'live' && !board?.liveNow && board?.readyNext
      ? 'next'
      : mobileStagePreference
  const isExpanded = autoReveal || mobileExpanded

  const liveStageContent = board?.liveNow ? (
    <AdPreviewCard
      ad={board.liveNow}
      slotLabel={label}
      compact
      busy={busy}
      actions={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ActionButton onClick={() => onPreview(board.liveNow)} disabled={busy} className="w-full justify-center px-0 py-2 text-[11px]">
            Preview
          </ActionButton>
          <ActionButton onClick={() => onPinToggle(board.liveNow)} disabled={busy} className="w-full justify-center px-0 py-2 text-[11px]">
            {board.liveNow.isPinned ? 'Unpin' : 'Pin'}
          </ActionButton>
          <ActionButton onClick={() => onEdit(board.liveNow)} disabled={busy} className="w-full justify-center px-0 py-2 text-[11px]">
            Edit
          </ActionButton>
          <ActionButton tone="danger" onClick={() => onDelete(board.liveNow)} disabled={busy} className="w-full justify-center px-0 py-2 text-[11px]">
            Delete
          </ActionButton>
        </div>
      }
    />
  ) : (
    <EmptyAdCard
      slot={slot}
      onCreate={() => onOpenCreate(slot)}
      onGenerate={() => onGenerate(slot)}
      disabled={busy}
    />
  )

  const nextStageContent = board?.readyNext ? (
    <AdPreviewCard
      ad={board.readyNext}
      slotLabel={label}
      compact
      busy={busy}
      actions={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ActionButton onClick={() => onPreview(board.readyNext)} disabled={busy} className="w-full justify-center px-0 py-2 text-[11px]">
            Preview
          </ActionButton>
          <ActionButton tone="primary" onClick={() => onMakeLive(board.readyNext)} disabled={busy} className="w-full justify-center px-0 py-2 text-[11px]">
            Make live
          </ActionButton>
          <ActionButton onClick={() => onEdit(board.readyNext)} disabled={busy} className="w-full justify-center px-0 py-2 text-[11px]">
            Edit
          </ActionButton>
          <ActionButton tone="danger" onClick={() => onDelete(board.readyNext)} disabled={busy} className="w-full justify-center px-0 py-2 text-[11px]">
            Delete
          </ActionButton>
        </div>
      }
    />
  ) : (
    <EmptyAdCard
      slot={slot}
      onCreate={() => onOpenCreate(slot)}
      onGenerate={() => onGenerate(slot)}
      disabled={busy}
    />
  )

  return (
    <SectionShell
      title={`${label} slot`}
      subtitle="Manage live and next ads for this slot."
      busy={busy}
      flashedArea={flashedArea}
      className="border-amber-100 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_38%),linear-gradient(180deg,#fffdf9_0%,#ffffff_100%)]"
      actions={
        <div className="hidden lg:flex lg:flex-wrap lg:gap-2">
          <ActionButton tone="soft" onClick={() => onOpenCreate(slot)} disabled={busy} className="w-full justify-center sm:w-auto">
            New {label.toLowerCase()} ad
          </ActionButton>
          <ActionButton tone="soft" onClick={() => onGenerate(slot)} disabled={busy} className="w-full justify-center sm:w-auto">
            Auto prepare
          </ActionButton>
        </div>
      }
    >
      <div className="lg:hidden">
        <div className={`relative rounded-[1.6rem] border border-stone-200 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_38%),linear-gradient(180deg,#fffdf9_0%,#ffffff_100%)] p-4 shadow-none ${mobileActionsOpen ? 'z-30' : ''}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700/75">
                {label}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-stone-950">{label} slot</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2 py-1.5 text-center text-[10px] font-semibold leading-none tracking-tight text-emerald-700">
                  {board?.liveNow ? 'Live ad ready' : 'No live ad'}
                </span>
                <span className="whitespace-nowrap rounded-full bg-sky-50 px-2 py-1.5 text-center text-[10px] font-semibold leading-none tracking-tight text-sky-700">
                  {board?.readyNext ? 'Next ad ready' : 'Nothing queued'}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMobileActionsOpen((current) => !current)}
                  className="inline-flex min-h-[42px] items-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800 shadow-sm"
                >
                  Actions
                </button>
                <div
                  className={`absolute right-0 top-[calc(100%+0.55rem)] z-30 w-40 origin-top-right overflow-hidden rounded-[1.1rem] border border-stone-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.14)] transition-all duration-200 ${
                    mobileActionsOpen
                      ? 'pointer-events-auto translate-y-0 opacity-100'
                      : 'pointer-events-none -translate-y-1 opacity-0'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMobileActionsOpen(false)
                      onOpenCreate(slot)
                    }}
                    className="flex w-full items-center justify-between rounded-[0.9rem] px-3 py-2.5 text-left text-[13px] font-semibold text-stone-800 hover:bg-stone-50"
                  >
                    Create new ad
                  </button>
                  <div className="mx-2 my-1 border-t border-stone-200" />
                  <button
                    type="button"
                    onClick={() => {
                      setMobileActionsOpen(false)
                      onGenerate(slot)
                    }}
                    className="flex w-full items-center justify-between rounded-[0.9rem] px-3 py-2.5 text-left text-[13px] font-semibold text-stone-800 hover:bg-stone-50"
                  >
                    Auto prepare
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileExpanded((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm"
              >
                <ChevronDownIcon open={isExpanded} />
              </button>
            </div>
          </div>

          <div
            className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
              isExpanded ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="relative rounded-full border border-stone-200 bg-stone-50 p-1.5">
                <span
                  aria-hidden="true"
                  className={`absolute bottom-1.5 top-1.5 w-[calc(50%-0.35rem)] rounded-full bg-white shadow-sm transition-transform duration-300 ${
                    mobileStage === 'live' ? 'translate-x-0' : 'translate-x-[calc(100%+0.2rem)]'
                  }`}
                />
                <div className="relative z-10 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMobileStagePreference('live')}
                    className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition-all ${
                      mobileStage === 'live' ? 'text-stone-950' : 'text-stone-600'
                    }`}
                  >
                    <span className="block text-center">Live now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileStagePreference('next')}
                    className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition-all ${
                      mobileStage === 'next' ? 'text-stone-950' : 'text-stone-600'
                    }`}
                  >
                    <span className="block text-center">Ready next</span>
                  </button>
                </div>
              </div>
              <div className="mt-4">
                {mobileStage === 'live' ? liveStageContent : nextStageContent}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="hidden gap-5 lg:grid lg:grid-cols-2">
        <div className="space-y-3 rounded-[1.7rem] border border-emerald-100/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.72),rgba(255,255,255,0.95))] p-4">
          <p className="text-sm font-semibold text-stone-900">Live now</p>
          {liveStageContent}
        </div>
  
        <div className="space-y-3 rounded-[1.7rem] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(239,246,255,0.82),rgba(255,255,255,0.96))] p-4">
          <p className="text-sm font-semibold text-stone-900">Ready next</p>
          {nextStageContent}
        </div>
      </div>
    </SectionShell>
  )
}

function PreviewModal({ ad, onClose }) {
  if (!ad) return null
  const preview = ad.homepagePreview ?? {}

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
              Preview
            </p>
            <h2 className="mt-1 text-lg font-semibold text-stone-950">{ad.title}</h2>
          </div>
          <ActionButton onClick={onClose}>Close</ActionButton>
        </div>
        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-stone-900">Desktop look</p>
            <div className="overflow-hidden rounded-[1.8rem] border border-stone-200 bg-stone-950 text-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
              <div className="relative min-h-[20rem]">
                {preview.image ? (
                  <img
                    src={preview.image}
                    alt={preview.title ?? ad.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(17,24,39,0.82),rgba(17,24,39,0.36),rgba(17,24,39,0.72))]" />
                <div className="relative z-10 flex min-h-[20rem] items-end p-6">
                  <div className="max-w-lg">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/72">
                      {preview.eyebrow || ad.eyebrow || SLOT_LABELS[ad.placementSlot] || 'Ad'}
                    </p>
                    <h3 className="mt-3 font-[Georgia,Times_New_Roman,serif] text-[2.2rem] leading-tight">
                      {preview.title || ad.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/84">
                      {preview.description || ad.subtitle}
                    </p>
                    <div className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-950">
                      {preview.ctaLabel || ad.ctaLabel}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-stone-900">Mobile look</p>
            <div className="mx-auto w-full max-w-[24rem] overflow-hidden rounded-[2rem] border border-stone-200 bg-stone-950 text-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
              <div className="relative min-h-[28rem]">
                {preview.image ? (
                  <img
                    src={preview.image}
                    alt={preview.title ?? ad.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,39,0.22),rgba(17,24,39,0.78))]" />
                <div className="relative z-10 flex min-h-[28rem] items-end p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/72">
                      {preview.eyebrow || ad.eyebrow || SLOT_LABELS[ad.placementSlot] || 'Ad'}
                    </p>
                    <h3 className="mt-3 font-[Georgia,Times_New_Roman,serif] text-[2rem] leading-tight">
                      {preview.title || ad.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/84">
                      {preview.description || ad.subtitle}
                    </p>
                    <div className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-950">
                      {preview.ctaLabel || ad.ctaLabel}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditorModal({
  open,
  form,
  categories,
  saving,
  editTarget,
  onClose,
  onChange,
  onSubmit,
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[125] flex items-center justify-center bg-black/60 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[88svh] w-full max-w-[24rem] flex-col overflow-hidden rounded-[1.8rem] bg-white shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:max-h-[min(92svh,56rem)] sm:max-w-3xl sm:rounded-[2rem]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-4 sm:px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
              {editTarget ? 'Edit ad' : 'Create ad'}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-stone-950">
              {editTarget ? 'Update advertisement in place' : 'Create a new advertisement'}
            </h2>
          </div>
          <ActionButton onClick={onClose} disabled={saving}>
            Close
          </ActionButton>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-stone-700">Title</span>
              <input
                value={form.title}
                onChange={(event) => onChange('title', event.target.value)}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-stone-700">Section</span>
              <select
                value={form.placementSlot}
                onChange={(event) => onChange('placementSlot', event.target.value)}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
              >
                <option value="hero">Hero</option>
                <option value="featured">Featured</option>
                <option value="budget">Budget</option>
              </select>
            </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-stone-700">Small label</span>
              <input
                value={form.eyebrow}
                onChange={(event) => onChange('eyebrow', event.target.value)}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-stone-700">Button text</span>
              <input
                value={form.ctaLabel}
                onChange={(event) => onChange('ctaLabel', event.target.value)}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
              />
            </label>
            </div>

            <label className="space-y-1 text-sm">
            <span className="font-medium text-stone-700">Subtitle</span>
            <textarea
              value={form.subtitle}
              onChange={(event) => onChange('subtitle', event.target.value)}
              className="min-h-24 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
            />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-stone-700">Search phrase</span>
              <input
                value={form.search}
                onChange={(event) => onChange('search', event.target.value)}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
                placeholder="saree under 1000"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-stone-700">Collection</span>
              <select
                value={form.categorySlug}
                onChange={(event) => onChange('categorySlug', event.target.value)}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
              >
                <option value="">All collections</option>
                {categories.map((category) => (
                  <option key={category._id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-stone-700">Min price</span>
              <input
                type="number"
                value={form.priceMin}
                onChange={(event) => onChange('priceMin', event.target.value)}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-stone-700">Max price</span>
              <input
                type="number"
                value={form.priceMax}
                onChange={(event) => onChange('priceMax', event.target.value)}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-stone-700">Start date</span>
              <input
                type="date"
                value={form.startAt}
                onChange={(event) => onChange('startAt', event.target.value)}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-stone-700">End date</span>
              <input
                type="date"
                value={form.endAt}
                onChange={(event) => onChange('endAt', event.target.value)}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
              />
            </label>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-stone-200 bg-white px-4 py-4 sm:flex-row sm:flex-wrap sm:px-5">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
            >
              {saving ? 'Saving...' : editTarget ? 'Save changes' : 'Save advertisement'}
            </button>
            <ActionButton onClick={onClose} disabled={saving} className="w-full justify-center sm:w-auto">
              Cancel
            </ActionButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminAdvertisements() {
  const { authFetch } = useAuth()
  const { addToast } = useToast()
  const flashTimersRef = useRef(new Map())
  const overviewFeedbackTimerRef = useRef(null)
  const overviewNoticeTimerRef = useRef(null)

  const [dashboard, setDashboard] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyAreas, setBusyAreas] = useState({})
  const [flashedAreas, setFlashedAreas] = useState({})
  const [form, setForm] = useState(() => emptyForm())
  const [editorOpen, setEditorOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [reuseTarget, setReuseTarget] = useState(null)
  const [previewTarget, setPreviewTarget] = useState(null)
  const [overviewFocusPanel, setOverviewFocusPanel] = useState(null)
  const [overviewMobileViewPreference, setOverviewMobileViewPreference] = useState('live')
  const [overviewNotice, setOverviewNotice] = useState(null)
  const [autoRevealSlot, setAutoRevealSlot] = useState(null)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [confirmState, setConfirmState] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [reuseForm, setReuseForm] = useState({
    startAt: '',
    endAt: '',
    refreshFromCatalog: true,
  })

  const setAreaBusy = useCallback((area, value) => {
    setBusyAreas((current) => ({ ...current, [area]: value }))
  }, [])

  const flashArea = useCallback((area, tone) => {
    setFlashedAreas((current) => ({ ...current, [area]: tone }))
    const existingTimer = flashTimersRef.current.get(area)
    if (existingTimer) {
      window.clearTimeout(existingTimer)
    }
    const nextTimer = window.setTimeout(() => {
      setFlashedAreas((current) => {
        const next = { ...current }
        delete next[area]
        return next
      })
      flashTimersRef.current.delete(area)
    }, 1200)
    flashTimersRef.current.set(area, nextTimer)
  }, [])

  useEffect(() => {
    const timers = flashTimersRef.current
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
      if (overviewFeedbackTimerRef.current) {
        window.clearTimeout(overviewFeedbackTimerRef.current)
      }
      if (overviewNoticeTimerRef.current) {
        window.clearTimeout(overviewNoticeTimerRef.current)
      }
    }
  }, [])

  const triggerOverviewFeedback = useCallback(({ panel = null } = {}) => {
    setOverviewFocusPanel(panel)

    if (overviewFeedbackTimerRef.current) {
      window.clearTimeout(overviewFeedbackTimerRef.current)
    }

    overviewFeedbackTimerRef.current = window.setTimeout(() => {
      setOverviewFocusPanel(null)
      overviewFeedbackTimerRef.current = null
    }, 1500)
  }, [])

  const startOverviewNotice = useCallback((kind) => {
    if (overviewNoticeTimerRef.current) {
      window.clearTimeout(overviewNoticeTimerRef.current)
      overviewNoticeTimerRef.current = null
    }
    setOverviewNotice({ kind, closing: false })
  }, [])

  const finishOverviewNotice = useCallback((message, panel) => {
    setOverviewNotice((current) => (current ? { ...current, closing: true } : current))
    overviewNoticeTimerRef.current = window.setTimeout(() => {
      setOverviewNotice(null)
      overviewNoticeTimerRef.current = null
      if (panel) {
        triggerOverviewFeedback({ panel })
      }
      if (message) {
        addToast(message, 'success', 2200)
      }
    }, OVERVIEW_NOTICE_CLOSE_MS)
  }, [addToast, triggerOverviewFeedback])

  const clearOverviewNotice = useCallback(() => {
    if (overviewNoticeTimerRef.current) {
      window.clearTimeout(overviewNoticeTimerRef.current)
      overviewNoticeTimerRef.current = null
    }
    setOverviewNotice(null)
  }, [])

  const openConfirmation = useCallback((config) => {
    setConfirmState(config)
  }, [])

  const closeConfirmation = useCallback(() => {
    if (confirmBusy) return
    setConfirmState(null)
  }, [confirmBusy])

  const handleConfirmAction = useCallback(async () => {
    if (!confirmState?.onConfirm) return
    const action = confirmState.onConfirm
    setConfirmState(null)
    setConfirmBusy(true)
    try {
      await action()
    } finally {
      setConfirmBusy(false)
    }
  }, [confirmState])

  const applyDashboardData = useCallback((nextDashboard) => {
    if (nextDashboard) {
      setDashboard(nextDashboard)
    }
  }, [])

  const loadInitialData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashboardResponse, categoryResponse] = await Promise.all([
        authFetch('/api/admin/advertisements/dashboard'),
        fetch(apiUrl('/api/categories')),
      ])
      if (!dashboardResponse.ok) throw new Error('Failed to load advertisements')
      if (!categoryResponse.ok) throw new Error('Failed to load categories')

      const [dashboardData, categoryData] = await Promise.all([
        dashboardResponse.json(),
        categoryResponse.json(),
      ])

      setDashboard(dashboardData)
      setCategories(categoryData.categories ?? [])
    } catch {
      setError(ADMIN_SUPPORT_MESSAGE)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInitialData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadInitialData])

  const runAreaAction = useCallback(
    async ({
      areas,
      request,
      successMessage,
      errorMessage = ADMIN_SUPPORT_MESSAGE,
      flashAreas,
      onSuccess,
      onFinally,
    }) => {
      const normalizedAreas = Array.isArray(areas) ? areas.filter(Boolean) : [areas].filter(Boolean)
      let wasSuccessful = false
      normalizedAreas.forEach((area) => setAreaBusy(area, true))
      setError(null)
      try {
        const response = await request()
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data?.error || errorMessage)
        }
        applyDashboardData(data.dashboard)
        wasSuccessful = true
        onSuccess?.(data)
        if (successMessage) addToast(successMessage, 'success', 2200)
        ;[...(flashAreas ?? normalizedAreas), 'overview'].filter(Boolean).forEach((area) => {
          flashArea(area, area.replace('slot:', ''))
        })
      } catch (err) {
        const message = err?.message || errorMessage
        setError(message)
        addToast(message, 'error', 3000)
      } finally {
        normalizedAreas.forEach((area) => setAreaBusy(area, false))
        onFinally?.(wasSuccessful)
      }
    },
    [addToast, applyDashboardData, flashArea, setAreaBusy]
  )

  const historyAds = useMemo(() => dashboard?.historyAds ?? [], [dashboard])
  const visibleHistoryAds = historyExpanded ? historyAds : historyAds.slice(0, 3)
  const slotBoards = dashboard?.slotBoards ?? {}
  const overviewBusy = ['hero', 'featured', 'budget'].some((slot) => busyAreas[getAreaKeyForSlot(slot)])
  const canMakeAllReadyLive = ['hero', 'featured', 'budget'].some(
    (slot) => Boolean(slotBoards?.[slot]?.readyNext)
  )

  function openCreateForSlot(slot) {
    setEditTarget(null)
    setForm({
      ...emptyForm(),
      placementSlot: slot,
    })
    setEditorOpen(true)
  }

  function openEdit(ad) {
    setEditTarget(ad)
    setForm(formFromAd(ad))
    setEditorOpen(true)
  }

  function closeEditor() {
    setEditorOpen(false)
    setEditTarget(null)
    setForm(emptyForm())
  }

  function updateFormField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleCreateOrUpdate(event) {
    event.preventDefault()
    const area = getAreaKeyForSlot(form.placementSlot)

    await runAreaAction({
      areas: [area],
      request: () =>
        authFetch(
          editTarget
            ? `/api/admin/advertisements/${editTarget._id}`
            : '/api/admin/advertisements',
          {
            method: editTarget ? 'PATCH' : 'POST',
            body: JSON.stringify({
              title: form.title,
              subtitle: form.subtitle,
              eyebrow: form.eyebrow,
              ctaLabel: form.ctaLabel,
              placementSlot: form.placementSlot,
              sectionType: form.placementSlot,
              status:
                form.startAt && new Date(form.startAt) > new Date()
                  ? 'upcoming'
                  : 'draft',
              filters: {
                search: form.search,
                categorySlug: form.categorySlug,
                priceMin: form.priceMin,
                priceMax: form.priceMax,
              },
              startAt: form.startAt || null,
              endAt: form.endAt || null,
            }),
          }
        ),
      successMessage: editTarget
        ? `${SLOT_LABELS[form.placementSlot]} advertisement updated.`
        : `${SLOT_LABELS[form.placementSlot]} advertisement created.`,
      onSuccess: () => {
        closeEditor()
      },
    })
  }

  async function handleDelete(ad, sourceArea) {
    if (!ad?._id) return
    const area = getAreaForAdvertisement(ad)

    await runAreaAction({
      areas: [sourceArea, area],
      request: () =>
        authFetch(`/api/admin/advertisements/${ad._id}`, {
          method: 'DELETE',
        }),
      successMessage: `${ad.title} removed.`,
      onSuccess: () => {
        if (editTarget?._id === ad._id) {
          closeEditor()
        }
        if (previewTarget?._id === ad._id) {
          setPreviewTarget(null)
        }
        if (reuseTarget?._id === ad._id) {
          setReuseTarget(null)
        }
      },
    })
  }

  async function handleGenerateNext(slot) {
    openConfirmation({
      title: `Prepare ${SLOT_LABELS[slot]} next ad?`,
      message: `This will create a fresh ${SLOT_LABELS[slot].toLowerCase()} ad for the next slot.`,
      confirmLabel: 'Prepare',
      onConfirm: async () => {
        startOverviewNotice('prepare')
        const area = getAreaKeyForSlot(slot)
        await runAreaAction({
          areas: [area],
          request: () =>
            authFetch('/api/admin/advertisements/generate-next', {
              method: 'POST',
              body: JSON.stringify({ placementSlot: slot }),
            }),
          successMessage: null,
          onSuccess: () => {
            setAutoRevealSlot(slot)
            setPreviewTarget(null)
            setOverviewMobileViewPreference('next')
            finishOverviewNotice(`${SLOT_LABELS[slot]} next advertisement is ready.`, 'next')
            window.setTimeout(() => {
              setAutoRevealSlot((current) => (current === slot ? null : current))
            }, 2600)
          },
          onFinally: (wasSuccessful) => {
            if (!wasSuccessful) clearOverviewNotice()
          },
        })
      },
    })
  }

  async function handleGenerateAll() {
    openConfirmation({
      title: 'Prepare the next home page?',
      message: 'This will prepare fresh hero, featured, and budget ads for the next switch.',
      confirmLabel: 'Prepare',
      onConfirm: async () => {
        setOverviewFocusPanel(null)
        startOverviewNotice('prepare')
        await runAreaAction({
          areas: ['overview', ...['hero', 'featured', 'budget'].map((slot) => getAreaKeyForSlot(slot))],
          request: () =>
            authFetch('/api/admin/advertisements/generate-all', {
              method: 'POST',
            }),
          successMessage: null,
          onSuccess: () => {
            setOverviewMobileViewPreference('next')
            finishOverviewNotice('New advertisement is prepared.', 'next')
          },
          onFinally: (wasSuccessful) => {
            if (!wasSuccessful) clearOverviewNotice()
          },
        })
      },
    })
  }

  async function handleMakeLive(ad, sourceArea) {
    if (!ad?._id) return
    openConfirmation({
      title: 'Make this ad live?',
      message: 'This advertisement will replace the current live ad for this slot.',
      confirmLabel: 'Make live',
      onConfirm: async () => {
        startOverviewNotice('live')
        const area = getAreaForAdvertisement(ad)
        await runAreaAction({
          areas: [sourceArea, area],
          request: () =>
            authFetch(`/api/admin/advertisements/${ad._id}/make-live`, {
              method: 'POST',
            }),
          successMessage: null,
          onSuccess: () => {
            setOverviewMobileViewPreference('live')
            finishOverviewNotice(`${ad.title} is now live.`, 'live')
          },
          onFinally: (wasSuccessful) => {
            if (!wasSuccessful) clearOverviewNotice()
          },
        })
      },
    })
  }

  async function handlePinToggle(ad, sourceArea) {
    if (!ad?._id) return
    const area = getAreaForAdvertisement(ad)

    await runAreaAction({
      areas: [sourceArea, area],
      request: () =>
        authFetch(`/api/admin/advertisements/${ad._id}/${ad.isPinned ? 'unpin' : 'pin'}`, {
          method: 'POST',
        }),
      successMessage: ad.isPinned ? `${ad.title} unpinned.` : `${ad.title} pinned.`,
    })
  }

  async function handleMakeAllReadyLive() {
    openConfirmation({
      title: 'Go live with the next home page?',
      message: 'The prepared hero, featured, and budget ads will all become live together.',
      confirmLabel: 'Go live',
      onConfirm: async () => {
        setOverviewFocusPanel(null)
        startOverviewNotice('live')
        await runAreaAction({
          areas: ['overview', ...['hero', 'featured', 'budget'].map((slot) => getAreaKeyForSlot(slot))],
          request: () =>
            authFetch('/api/admin/advertisements/make-ready-live', {
              method: 'POST',
            }),
          successMessage: null,
          onSuccess: () => {
            setOverviewMobileViewPreference('live')
            finishOverviewNotice('Prepared home page is live.', 'live')
          },
          onFinally: (wasSuccessful) => {
            if (!wasSuccessful) {
              clearOverviewNotice()
            }
          },
        })
      },
    })
  }

  async function handleReuse(event) {
    event.preventDefault()
    if (!reuseTarget?._id) return
    const area = getAreaForAdvertisement(reuseTarget)

    await runAreaAction({
      areas: ['reuse', area],
      request: () =>
        authFetch(`/api/admin/advertisements/${reuseTarget._id}/reuse`, {
          method: 'POST',
          body: JSON.stringify(reuseForm),
        }),
      successMessage: `${reuseTarget.title} reused for the next run.`,
      onSuccess: () => {
        setReuseTarget(null)
        setReuseForm({
          startAt: '',
          endAt: '',
          refreshFromCatalog: true,
        })
      },
    })
  }

  if (loading) {
    return (
      <LoadingState
        title="Loading advertisements..."
        description="Preparing live, upcoming, backup, and history previews."
      />
    )
  }

  return (
    <div className="space-y-6">
      {overviewNotice ? (
        <div
          className="pointer-events-none fixed left-1/2 z-[70] flex w-full max-w-[100vw] -translate-x-1/2 justify-center px-4"
          style={{ top: 'var(--app-toast-top, calc(env(safe-area-inset-top) + 5.15rem))' }}
        >
          <div
            className={`admin-global-notice ${
              overviewNotice.kind === 'live'
                ? 'admin-global-notice--live'
                : 'admin-global-notice--prepare'
            } ${overviewNotice.closing ? 'admin-global-notice--closing' : ''}`}
          >
            <span className="admin-global-notice__label">
              {overviewNotice.kind === 'live'
                ? 'Making prepared home page live'
                : 'Preparing fresh home page'}
            </span>
            <span
              aria-hidden="true"
              className={`admin-global-notice__track ${
                overviewNotice.kind === 'live'
                  ? 'admin-global-notice__track--live'
                  : 'admin-global-notice__track--prepare'
              }`}
            >
              <span className="admin-global-notice__bar" />
            </span>
          </div>
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-stone-200 bg-white px-4 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-700/80">
              Advertisements
            </p>
            <h1 className="mt-3 font-[Georgia,Times_New_Roman,serif] text-[1.65rem] leading-tight text-stone-950 sm:text-[2rem]">
              Manage each homepage slot beautifully and clearly
            </h1>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-stone-600 sm:text-sm">
              Control live, next, and backup ads in one place.
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 lg:w-auto">
            <ActionButton tone="soft" onClick={() => openCreateForSlot('hero')} className="w-full justify-center lg:w-auto">
              Create new ad
            </ActionButton>
          </div>
        </div>
        {error ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {error}
          </div>
        ) : null}
      </section>

      <StorefrontOverview
        slotBoards={slotBoards}
        onPreview={setPreviewTarget}
        onGenerateAll={handleGenerateAll}
        onMakeAllReadyLive={handleMakeAllReadyLive}
        canMakeAllReadyLive={canMakeAllReadyLive}
        busy={overviewBusy}
        focusPanel={overviewFocusPanel}
        mobileView={overviewMobileViewPreference}
        onMobileViewChange={setOverviewMobileViewPreference}
      />

      <div className="space-y-6">
        {['hero', 'featured', 'budget'].map((slot) => {
          const area = getAreaKeyForSlot(slot)
          return (
            <SlotPanel
              key={slot}
              slot={slot}
              board={slotBoards[slot]}
              busy={Boolean(busyAreas[area])}
              flashedArea={flashedAreas[area]}
              onPreview={setPreviewTarget}
              onEdit={openEdit}
              onMakeLive={handleMakeLive}
              onPinToggle={handlePinToggle}
              onDelete={handleDelete}
              onGenerate={handleGenerateNext}
              onOpenCreate={openCreateForSlot}
              autoReveal={autoRevealSlot === slot}
            />
          )
        })}
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <SectionShell
            title="Default backup"
            subtitle="This ad keeps the storefront safe if a live ad is removed or a slot needs a quick fallback."
            busy={Boolean(busyAreas.backup)}
            flashedArea={flashedAreas.backup}
            className="border-amber-200 bg-[linear-gradient(180deg,#fffdfa_0%,#fff8ef_100%)]"
          >
            <div className="mt-1">
              <AdPreviewCard
                ad={dashboard?.fallbackAd}
                slotLabel={SLOT_LABELS.fallback}
                actions={
                  <div className="flex flex-wrap gap-3 pt-1">
                    <ActionButton
                      onClick={() => setPreviewTarget(dashboard?.fallbackAd ?? null)}
                      disabled={!dashboard?.fallbackAd || busyAreas.backup}
                      className="min-w-[6.75rem] justify-center"
                    >
                      Preview
                    </ActionButton>
                    <ActionButton
                      onClick={() => handleMakeLive(dashboard?.fallbackAd, 'backup')}
                      disabled={!dashboard?.fallbackAd || busyAreas.backup}
                      className="min-w-[7.25rem] justify-center"
                    >
                      Use as live
                    </ActionButton>
                    <ActionButton
                      onClick={() => handlePinToggle(dashboard?.fallbackAd, 'backup')}
                      disabled={!dashboard?.fallbackAd || busyAreas.backup}
                      className="min-w-[6rem] justify-center"
                    >
                      {dashboard?.fallbackAd?.isPinned ? 'Unpin' : 'Pin'}
                    </ActionButton>
                  </div>
                }
              />
            </div>
          </SectionShell>

          {reuseTarget ? (
            <SectionShell
              title="Reuse advertisement"
              subtitle={`Repeat the look of ${reuseTarget.title} and choose the next dates for it.`}
              busy={Boolean(busyAreas.reuse)}
              flashedArea={flashedAreas.reuse}
            >
              <form onSubmit={handleReuse} className="mt-1 grid gap-4 sm:grid-cols-3">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-stone-700">Start date</span>
                  <input
                    type="date"
                    value={reuseForm.startAt}
                    onChange={(event) =>
                      setReuseForm((current) => ({ ...current, startAt: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
                    required
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-stone-700">End date</span>
                  <input
                    type="date"
                    value={reuseForm.endAt}
                    onChange={(event) =>
                      setReuseForm((current) => ({ ...current, endAt: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none"
                    required
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-stone-200 px-4 py-3 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={reuseForm.refreshFromCatalog}
                    onChange={(event) =>
                      setReuseForm((current) => ({
                        ...current,
                        refreshFromCatalog: event.target.checked,
                      }))
                    }
                  />
                  Use fresh products from the current catalog
                </label>
                <div className="flex flex-wrap gap-3 sm:col-span-3">
                  <button
                    type="submit"
                    disabled={busyAreas.reuse}
                    className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busyAreas.reuse ? 'Reusing...' : 'Reuse this advertisement'}
                  </button>
                  <ActionButton onClick={() => setReuseTarget(null)} disabled={busyAreas.reuse}>
                    Cancel
                  </ActionButton>
                </div>
              </form>
            </SectionShell>
          ) : null}
        </div>

        <div className="space-y-6">
          <SectionShell
            title="History"
            subtitle="Keep older ads here, repeat what worked, and remove ads you no longer need."
            busy={Boolean(busyAreas.history)}
            flashedArea={flashedAreas.history}
            className="border-sky-200 bg-[linear-gradient(180deg,#fbfdff_0%,#f5f9ff_100%)]"
          >
            <div className="mt-1 space-y-4">
              <div className="lg:hidden">
                <ActionButton
                  onClick={() => setHistoryOpen((current) => !current)}
                  disabled={busyAreas.history}
                  className="w-full justify-center"
                >
                  {historyOpen ? 'Hide history' : `Open history (${historyAds.length})`}
                </ActionButton>
              </div>
              <div className={`${historyOpen ? 'block' : 'hidden'} lg:block`}>
                <div className="space-y-4">
                  {visibleHistoryAds.map((ad) => (
                      <AdPreviewCard
                        key={ad._id}
                        ad={ad}
                        slotLabel={SLOT_LABELS[ad.placementSlot] ?? 'Ad'}
                        compact
                        actions={
                          <div className="grid grid-cols-2 gap-3 pt-1 sm:flex sm:flex-wrap">
                            <ActionButton
                              onClick={() => setPreviewTarget(ad)}
                              disabled={busyAreas.history}
                              className="justify-center"
                            >
                              Preview
                            </ActionButton>
                            <ActionButton
                              onClick={() => setReuseTarget(ad)}
                              disabled={busyAreas.history}
                              className="justify-center"
                            >
                              Reuse
                            </ActionButton>
                            <ActionButton
                              onClick={() => openEdit(ad)}
                              disabled={busyAreas.history}
                              className="justify-center"
                            >
                              Edit
                            </ActionButton>
                            <ActionButton
                              onClick={() => handlePinToggle(ad, 'history')}
                              disabled={busyAreas.history}
                              className="justify-center"
                            >
                              {ad.isPinned ? 'Unpin' : 'Pin'}
                            </ActionButton>
                            <ActionButton
                              tone="danger"
                              onClick={() => handleDelete(ad, 'history')}
                              disabled={busyAreas.history}
                              className="col-span-2 justify-center sm:col-span-1"
                            >
                              Delete
                            </ActionButton>
                          </div>
                        }
                      />
                  ))}
                  {historyAds.length > 3 ? (
                    <div className="flex justify-center">
                      <ActionButton
                        onClick={() => setHistoryExpanded((current) => !current)}
                        disabled={busyAreas.history}
                        className="w-full justify-center sm:w-auto"
                      >
                        {historyExpanded ? 'Show less' : `Show older ads (${historyAds.length - 3})`}
                      </ActionButton>
                    </div>
                  ) : null}
                  {historyOpen ? (
                    <div className="flex justify-center lg:hidden">
                      <ActionButton
                        onClick={() => setHistoryOpen(false)}
                        disabled={busyAreas.history}
                        className="w-full justify-center"
                      >
                        Close history
                      </ActionButton>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </SectionShell>
        </div>
      </section>

      <EditorModal
        open={editorOpen}
        form={form}
        categories={categories}
        saving={Boolean(busyAreas[getAreaKeyForSlot(form.placementSlot)])}
        editTarget={editTarget}
        onClose={closeEditor}
        onChange={updateFormField}
        onSubmit={handleCreateOrUpdate}
      />
      <PreviewModal ad={previewTarget} onClose={() => setPreviewTarget(null)} />
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? 'Please confirm'}
        message={confirmState?.message ?? ''}
        confirmLabel={confirmState?.confirmLabel ?? 'Continue'}
        busy={confirmBusy}
        onConfirm={handleConfirmAction}
        onClose={closeConfirmation}
      />
    </div>
  )
}
