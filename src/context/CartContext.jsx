import { createContext, useContext, useEffect, useState } from 'react'
const CartCtx = createContext(null)
const LS_KEY = 'ds_cart_v1'

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(items)) } catch {}
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
  const setQty     = (id, qty)   => setItems(p => p.map(x => x.product.id === id ? { ...x, qty } : x))
  const setMyPrice = (id, price) => setItems(p => p.map(x => x.product.id === id ? { ...x, myPrice: price } : x))
  const removeItem = (id)        => setItems(p => p.filter(x => x.product.id !== id))
  function clearCart() { setItems([]); try { localStorage.removeItem(LS_KEY) } catch {} }

  return (
    <CartCtx.Provider value={{ items, addItem, setQty, setMyPrice, removeItem, clearCart }}>
      {children}
    </CartCtx.Provider>
  )
}
export const useCart = () => useContext(CartCtx)
