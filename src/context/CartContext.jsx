import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartCtx = createContext(null)
const STORAGE_KEY = 'cart_v1'

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

  function add(p) {
    setItems(prev => {
      if (prev.some(x => x.id === p.id)) return prev
      const my_price = Number(p.my_price ?? p.price_dropship ?? 0)
      return [...prev, { ...p, my_price }]
    })
  }
  function remove(id) { setItems(prev => prev.filter(x => x.id !== id)) }
  function clear() { setItems([]) }
  function setPrice(id, price) {
    const v = Number(price)
    setItems(prev => prev.map(x => x.id === id ? { ...x, my_price: isNaN(v) ? 0 : v } : x))
  }

  const totalValue = useMemo(
    () => items.reduce((s, x) => s + Number(x.my_price ?? x.price_dropship ?? 0), 0),
    [items]
  )

  const value = {
    items, add, remove, clear, setPrice,
    total: () => totalValue,
    count: items.length,
  }

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

export function useCart() {
  const ctx = useContext(CartCtx)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
