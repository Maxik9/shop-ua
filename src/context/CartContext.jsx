// src/context/CartContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'

const CartCtx = createContext(null)

const LS_KEY = 'ds_cart_v1'

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

  // завантаження з localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {}
  }, [])

  // збереження
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items))
    } catch {}
  }, [items])

  function addItem(product, qty = 1, myPrice) {
    setItems(prev => {
      const i = prev.findIndex(x => x.product.id === product.id)
      if (i >= 0) {
        const copy = [...prev]
        copy[i] = {
          ...copy[i],
          qty: Number(copy[i].qty || 1) + Number(qty || 1),
          myPrice: myPrice ?? copy[i].myPrice
        }
        return copy
      }
      return [...prev, { product, qty: Number(qty || 1), myPrice }]
    })
  }

  function setQty(productId, qty) {
    setItems(prev => prev.map(x => x.product.id === productId ? { ...x, qty } : x))
  }

  function setMyPrice(productId, price) {
    setItems(prev => prev.map(x => x.product.id === productId ? { ...x, myPrice: price } : x))
  }

  function removeItem(productId) {
    setItems(prev => prev.filter(x => x.product.id !== productId))
  }

  function clearCart() {
    setItems([])
    try { localStorage.removeItem(LS_KEY) } catch {}
  }

  return (
    <CartCtx.Provider value={{ items, addItem, setQty, setMyPrice, removeItem, clearCart }}>
      {children}
    </CartCtx.Provider>
  )
}

export const useCart = () => useContext(CartCtx)
