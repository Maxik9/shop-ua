import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'

const CartCtx = createContext(null)
const KEY = 'cart_v1'

function reducer(state, action){
  switch(action.type){
    case 'init':
      return action.items
    case 'add': {
      const exists = state.find(i => i.id === action.item.id)
      if (exists) {
        return state.map(i => i.id === action.item.id
          ? { ...i, qty: i.qty + (action.item.qty || 1) }
          : i
        )
      }
      return [...state, action.item]
    }
    case 'remove':
      return state.filter(i => i.id !== action.id)
    case 'qty':
      return state.map(i => i.id === action.id ? { ...i, qty: Math.max(1, action.qty|0) } : i)
    case 'price':
      return state.map(i => i.id === action.id ? { ...i, my_price: Number(action.my_price) || 0 } : i)
    case 'clear':
      return []
    default:
      return state
  }
}

export function CartProvider({ children }){
  const [items, dispatch] = useReducer(reducer, [])
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]')
      dispatch({ type: 'init', items: saved })
    } catch {}
  }, [])
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items))
  }, [items])

  const api = useMemo(() => ({
    items,
    count: items.reduce((s,i)=>s+i.qty, 0),
    add: (product, extra={}) => dispatch({ type:'add', item: {
      id: product.id,
      name: product.name,
      image_url: product.image_url || null,
      price_dropship: Number(product.price_dropship) || 0,
      qty: 1,
      my_price: Number(extra.my_price ?? product.price_dropship) || 0
    }}),
    remove: (id) => dispatch({ type:'remove', id }),
    setQty: (id, qty) => dispatch({ type:'qty', id, qty }),
    setPrice: (id, my_price) => dispatch({ type:'price', id, my_price }),
    clear: () => dispatch({ type:'clear' })
  }), [items])

  return <CartCtx.Provider value={api}>{children}</CartCtx.Provider>
}

export function useCart(){
  const ctx = useContext(CartCtx)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
