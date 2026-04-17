import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const STATUSES = ['placed', 'packed', 'shipped', 'delivered', 'cancelled']

export default function AdminOrders() {
  const { authFetch } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await authFetch('/api/admin/orders')
      if (!r.ok) throw new Error('Failed to load orders')
      const data = await r.json()
      setOrders(data.orders ?? [])
    } catch (e) {
      setError(e.message || 'Error')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    const id = setTimeout(() => {
      void load()
    }, 0)
    return () => clearTimeout(id)
  }, [load])

  async function savePatch(orderNumber, body) {
    const r = await authFetch(
      `/api/admin/orders/${encodeURIComponent(orderNumber)}`,
      { method: 'PATCH', body: JSON.stringify(body) }
    )
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      throw new Error(d.error || 'Update failed')
    }
    await load()
  }

  if (loading) {
    return <p className="text-sm text-stone-500">Loading orders…</p>
  }
  if (error) {
    return <p className="text-sm text-red-700">{error}</p>
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-stone-900">Orders</h1>
      <p className="mt-1 text-sm text-stone-600">
        Update status and courier tracking ID.
      </p>
      <ul className="mt-6 space-y-4">
        {orders.map((o) => (
          <li
            key={o.orderNumber}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-semibold text-stone-900">
                  {o.orderNumber}
                </p>
                <p className="text-xs text-stone-500">
                  {o.address?.fullName} · {o.address?.phone} · ₹
                  {Number(o.totalAmount).toLocaleString('en-IN')}
                </p>
              </div>
              <OrderEditor key={o.orderNumber} order={o} onSave={savePatch} />
            </div>
          </li>
        ))}
      </ul>
      {orders.length === 0 ? (
        <p className="mt-6 text-sm text-stone-600">No orders yet.</p>
      ) : null}
    </div>
  )
}

function OrderEditor({ order, onSave }) {
  const [status, setStatus] = useState(() => order.orderStatus)
  const [trackingId, setTrackingId] = useState(() => order.trackingId || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function save() {
    setErr(null)
    setBusy(true)
    try {
      await onSave(order.orderNumber, {
        orderStatus: status,
        trackingId,
      })
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full min-w-[min(100%,16rem)] space-y-2 sm:w-auto">
      <label className="block text-xs text-stone-500">Status</label>
      <select
        className="w-full min-h-[44px] rounded-lg border border-stone-200 bg-white px-2 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <label className="block text-xs text-stone-500">Tracking ID</label>
      <input
        className="w-full min-h-[44px] rounded-lg border border-stone-200 px-2 text-sm"
        value={trackingId}
        onChange={(e) => setTrackingId(e.target.value)}
        placeholder="Courier tracking"
      />
      <button
        type="button"
        disabled={busy}
        onClick={save}
        className="mt-1 w-full rounded-lg bg-stone-900 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? 'Saving…' : 'Save'}
      </button>
      {err ? <p className="text-xs text-red-600">{err}</p> : null}
    </div>
  )
}
