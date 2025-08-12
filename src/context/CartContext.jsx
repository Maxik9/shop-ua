import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartCtx = createContext(null)
const STORAGE_KEY = 'cart_v2' // новий ключ, щоб не плутатись зі старим форматом

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
  }, [items])

  // додати товар (або збільшити кількість, якщо вже є)
  function add(p, addQty = 1) {
    const price = Number(p.my_price ?? p.price_dropship ?? 0)
    const qty = Math.max(1, Number(addQty) || 1)
    setItems(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: (next[idx].qty || 1) + qty }
        return next
      }
      return [...prev, { ...p, my_price: price, qty }]
    })
  }

  function remove(id) { setItems(prev => prev.filter(x => x.id !== id)) }

  function clear() { setItems([]) }

  function setPrice(id, price) {
    const v = Number(price)
    setItems(prev => prev.map(x => x.id === id ? { ...x, my_price: isNaN(v) ? 0 : v } : x))
  }

  function setQty(id, qty) {
    const v = Math.max(1, Number(qty) || 1)
    setItems(prev => prev.map(x => x.id === id ? { ...x, qty: v } : x))
  }

  function inc(id) {
    setItems(prev => prev.map(x => x.id === id ? { ...x, qty: (x.qty || 1) + 1 } : x))
  }

  function dec(id) {
    setItems(prev => prev.map(x => {
      if (x.id !== id) return x
      const q = Math.max(1, (x.qty || 1) - 1)
      return { ...x, qty: q }
    }))
  }

  const totalValue = useMemo(
    () => items.reduce((s, x) => s + (Number(x.my_price ?? x.price_dropship ?? 0) * (x.qty || 1)), 0),
    [items]
  )

  const value = {
    items, add, remove, clear, setPrice, setQty, inc, dec,
    total: () => totalValue,
    count: items.reduce((n, x) => n + (x.qty || 1), 0),
  }

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

export function useCart() {
  const ctx = useContext(CartCtx)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
