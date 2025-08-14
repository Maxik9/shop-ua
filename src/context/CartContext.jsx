// src/context/CartContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartCtx = createContext(null)
const LS_KEY = 'ds_cart_v1'

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

  // 1) Завантаження з localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setItems(parsed)
      }
    } catch {
      // якщо зіпсовані дані — просто ігноруємо
    }
  }, [])

  // 2) Збереження у localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items))
    } catch {}
  }, [items])

  // 3) Дії з кошиком
  function addItem(product, qty = 1) {
    setItems(prev => {
      const idx = prev.findIndex(x => x.product.id === product.id)
      if (idx >= 0) {
        const next = [...prev]
        const cur = next[idx]
        next[idx] = { ...cur, qty: Number(cur.qty || 1) + Number(qty || 1) }
        return next
      }
      return [
        ...prev,
        {
          product,
          qty: Number(qty || 1),
          myPrice: product?.price_dropship ?? 0, // дефолт — дроп-ціна
        },
      ]
    })
  }

  const setQty     = (id, qty)   =>
    setItems(p => p.map(x => x.product.id === id ? { ...x, qty: Math.max(1, Number(qty || 1)) } : x))

  const setMyPrice = (id, price) =>
    setItems(p => p.map(x => x.product.id === id ? { ...x, myPrice: Number(price || 0) } : x))

  const removeItem = (id) =>
    setItems(p => p.filter(x => x.product.id !== id))

  function clearCart() {
    setItems([])
    try { localStorage.removeItem(LS_KEY) } catch {}
  }

  // 4) Похідні значення
  const count = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.qty || 1), 0),
    [items]
  )

  const total = useMemo(
    () => items.reduce((sum, it) => {
      const price = Number(it.myPrice ?? it.product?.price_dropship ?? 0)
      return sum + price * Number(it.qty || 1)
    }, 0),
    [items]
  )

  return (
    <CartCtx.Provider
      value={{ items, count, total, addItem, setQty, setMyPrice, removeItem, clearCart }}
    >
      {children}
    </CartCtx.Provider>
  )
}

export const useCart = () => useContext(CartCtx)
